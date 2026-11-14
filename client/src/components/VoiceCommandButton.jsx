import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X, Sparkles, MessageCircle, RotateCcw, Check } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../services/api";
import { canUseEducatorWorkspace } from "../auth/permissions";
import { setCreatorCourseData, setCourseData } from "../redux/courseSlice";
import { useTenant } from "../context/TenantContext";
import { getActiveTenantSlug } from "../services/api";
import { VOICE_NAVIGATION, normalizeVoiceTranscript, parseVoiceCommand, resolveVoiceNavigation } from "../services/voiceActions";

const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function VoiceCommandButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingVoiceConfirmation, setPendingVoiceConfirmation] = useState(null);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const { tenant } = useTenant();
  const tenantSlug = getActiveTenantSlug() || tenant?.slug || userData?.tenant?.slug || null;
  const isCourseBuilder = /^\/(?:builder|createcourses|editcourse)(?:\/|$)/.test(location.pathname);
  const isInstitutionHome = /^\/institution\/[^/]+\/?$/.test(location.pathname);

  useEffect(() => () => recognitionRef.current?.abort(), []);
  useEffect(() => {
    const syncChatState = (event) => setChatOpen(Boolean(event.detail?.open));
    window.addEventListener("skillio:ai-chat-state", syncChatState);
    return () => window.removeEventListener("skillio:ai-chat-state", syncChatState);
  }, []);

  const submitToExistingAI = async (prompt, confirmed = false, confirmationAction = null) => {
    if (!canUseEducatorWorkspace(userData)) {
      setFeedback("You don't have permission to manage courses with AI.");
      setStatus("error");
      return;
    }
    const courseMatch = location.pathname.match(/\/(?:builder|editcourse|viewcourse|createlecture)\/([a-zA-Z0-9-]+)/);
    const currentCourseId = courseMatch?.[1] && courseMatch[1] !== "new" ? courseMatch[1] : null;
    try {
      setStatus("processing");
      setFeedback(confirmed ? "Confirming that action…" : "Checking the request and your access…");
      const { data } = await api.post("/api/ai/chat", {
        prompt: prompt.slice(0, 1000),
        currentCourseId,
        currentRoute: location.pathname,
        confirmed,
        confirmationAction,
        messagesHistory: [],
      });
      if (data.requiresConfirmation) {
        setPendingVoiceConfirmation({ prompt, actionData: data.actionData });
        setFeedback(data.confirmationMessage || "This action needs your confirmation.");
        setStatus("confirmation");
        return;
      }
      setPendingVoiceConfirmation(null);
      setFeedback(data.success ? (data.message || "Done.") : (data.message || "I couldn't complete that action."));
      setStatus(data.success ? "success" : "error");
      if (data.success) {
        window.dispatchEvent(new CustomEvent("skillio:voice-ai-action-complete", {
          detail: { result: data, currentCourseId, currentRoute: location.pathname },
        }));
        const createdCourseId = data.data?.course?._id || data.data?.course?.id;
        if (createdCourseId && ["createCourse", "compoundCreateCourseAndLectures"].includes(data.action)) {
          navigate(`/builder/${createdCourseId}`);
        }
        // Keep the existing course lists in sync after AI tools make changes.
        const [coursesResult, publishedResult] = await Promise.allSettled([
          api.get("/api/course/getcreator"),
          api.get("/api/course/getpublished"),
        ]);
        if (coursesResult.status === "fulfilled" && coursesResult.value.data) dispatch(setCreatorCourseData(coursesResult.value.data));
        if (publishedResult.status === "fulfilled" && publishedResult.value.data) dispatch(setCourseData(publishedResult.value.data));
      }
    } catch (error) {
      setPendingVoiceConfirmation(null);
      setFeedback(error.response?.data?.message || "I couldn't complete that request. Nothing was changed.");
      setStatus("error");
    }
  };

  const execute = async (rawText) => {
    const spokenText = String(rawText || "").trim();
    if (!spokenText) {
      setFeedback("I didn't catch anything. Try speaking again.");
      setStatus("error");
      return;
    }
    if (spokenText.length > 1000) {
      setFeedback("That request is too long. Please keep it under 1,000 characters.");
      setStatus("error");
      return;
    }
    if (pendingVoiceConfirmation) {
      if (/^(yes|yeah|haan|han|confirm|proceed|do it|kar do|kardo|theek hai)[.!\s]*$/i.test(spokenText)) {
        await submitToExistingAI(pendingVoiceConfirmation.prompt, true, pendingVoiceConfirmation.actionData);
        return;
      }
      setPendingVoiceConfirmation(null);
      if (/^(no|nope|nahi|cancel|stop|mat karo)[.!\s]*$/i.test(spokenText)) {
        setFeedback("Action cancelled. Nothing was changed.");
        setStatus("success");
        return;
      }
    }
    const command = parseVoiceCommand(spokenText, userData);
    if (!command) {
      // Deterministic navigation and draft intents stay local. Only unmatched
      // educator management requests use Skillio's existing authorized AI tools.
      const { normalized } = normalizeVoiceTranscript(spokenText);
      const managementVocabulary = /\b(courses?|lectures?|sections?|publish|unpublish|delete|remove|edit|update|descriptions?|titles?|students?|analytics|institutions?|live classes?|resources?|curricula|curriculum|builder|access|enrollments?)\b/;
      if (canUseEducatorWorkspace(userData) && managementVocabulary.test(normalized)) await submitToExistingAI(spokenText);
      else {
        setFeedback("I couldn't match that to an available action. Try courses, students, analytics, or a course management request.");
        setStatus("error");
      }
      return;
    }
    if (command.type === "DENIED") {
      setFeedback("You don't have permission to open that page.");
      setStatus("error");
      return;
    }
    if (command.type === "BACK") {
      setFeedback("Going back");
      setStatus("success");
      navigate(-1);
      return;
    }
    if (command.type === "OPEN_CURRENT_LECTURE") {
      const courseMatch = location.pathname.match(/\/(?:institution\/[^/]+\/course|viewcourse|viewlecture)\/([a-zA-Z0-9-]+)/);
      if (location.pathname.startsWith("/viewlecture/")) {
        setFeedback("You're already viewing the current lecture.");
        setStatus("success");
      } else if (courseMatch?.[1]) {
        setFeedback("Opening lectures for this course");
        setStatus("success");
        navigate(`/viewlecture/${courseMatch[1]}`);
      } else {
        setFeedback("Opening My Courses so you can continue learning.");
        setStatus("success");
        navigate(tenantSlug ? `/institution/${encodeURIComponent(tenantSlug)}/my-courses` : "/mycourses");
      }
      return;
    }
    if (command.type === "CREATE_COURSE") {
      setFeedback(command.title ? `Preparing a course called “${command.title}”` : "Opening the course builder");
      setStatus("success");
      navigate("/builder/new", { state: { voiceDraft: command.title ? { title: command.title } : null } });
      return;
    }
    if (command.type === "OPEN_COURSE") {
      setStatus("processing");
      setFeedback(command.query ? `Finding “${command.query}” in your available courses…` : "Finding the current course…");
      const currentMatch = location.pathname.match(/\/(?:builder|editcourse|viewcourse|createlecture)\/([a-zA-Z0-9-]+)/);
      const currentId = currentMatch?.[1] && currentMatch[1] !== "new" ? currentMatch[1] : null;
      if (command.current && currentId) {
        const destination = userData.role === "student" && tenantSlug
          ? `/institution/${encodeURIComponent(tenantSlug)}/course/${currentId}`
          : `/builder/${currentId}`;
        setFeedback("Opening the current course");
        setStatus("success");
        navigate(destination);
        return;
      }
      try {
        const response = userData.role === "educator"
          ? await api.get("/api/course/getcreator")
          : tenantSlug
            ? await api.get(`/api/course/by-institution/${encodeURIComponent(tenantSlug)}`)
            : null;
        const rawCourses = response?.data;
        const courses = Array.isArray(rawCourses) ? rawCourses : rawCourses?.courses || [];
        const query = String(command.query || "").toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
        if (!query) {
          setFeedback("Which course do you mean? Say its name, for example “Open the React course.”");
          setStatus("error");
          return;
        }
        const exact = courses.filter((course) => String(course.title || "").toLocaleLowerCase().trim() === query);
        const matches = exact.length ? exact : courses.filter((course) => String(course.title || "").toLocaleLowerCase().includes(query));
        if (matches.length === 1) {
          const course = matches[0];
          const destination = userData.role === "student" && tenantSlug
            ? `/institution/${encodeURIComponent(tenantSlug)}/course/${course._id}`
            : `/builder/${course._id}`;
          setFeedback(`Opening ${course.title}`);
          setStatus("success");
          navigate(destination);
        } else if (matches.length > 1) {
          setFeedback(`I found multiple courses: ${matches.slice(0, 4).map((course) => course.title).join(", ")}. Say the full course name.`);
          setStatus("error");
        } else {
          setFeedback(`I couldn't find a course named “${command.query}” in your available courses.`);
          setStatus("error");
        }
      } catch (error) {
        setFeedback(error.response?.data?.message || "I couldn't search your available courses right now.");
        setStatus("error");
      }
      return;
    }
    const target = VOICE_NAVIGATION[command.target];
    const path = resolveVoiceNavigation(command, { user: userData, tenantSlug, pathname: location.pathname });
    if (!path) {
      setFeedback("You don't have permission to open that page.");
      setStatus("error");
      return;
    }
    setFeedback(`Opening ${target.label}`);
    setStatus("success");
    navigate(path);
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      setStatus("error");
      setFeedback("Voice recognition isn't supported in this browser. You can use Skillio's AI assistant for voice input.");
      return;
    }
    recognitionRef.current?.abort();
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    finalTranscriptRef.current = "";
    setTranscript("");
    setFeedback("");
    setStatus("listening");
    shouldListenRef.current = true;
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const part = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalTranscriptRef.current += `${part} `;
        else interim += part;
      }
      setTranscript(`${finalTranscriptRef.current}${interim}`.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      shouldListenRef.current = false;
      setStatus("error");
      setFeedback(event.error === "not-allowed" ? "Allow microphone access in your browser, then try again." : "Microphone stopped unexpectedly. Tap to try again.");
    };
    recognition.onend = () => {
      if (shouldListenRef.current) {
        try { recognition.start(); } catch { shouldListenRef.current = false; setStatus("idle"); }
      }
    };
    try { recognition.start(); } catch { setStatus("error"); setFeedback("Microphone couldn't start. Try again."); }
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    const text = finalTranscriptRef.current.trim() || transcript.trim();
    if (text) {
      setTranscript(text);
      setStatus("processing");
      execute(text);
    } else {
      setStatus("idle");
      setFeedback("I didn't catch anything. Tap the microphone and try again.");
    }
  };

  if (!userData) return null;
  if (isCourseBuilder) return null;
  const close = () => { shouldListenRef.current = false; recognitionRef.current?.abort(); setOpen(false); setStatus("idle"); };
  const openChat = () => {
    shouldListenRef.current = false;
    recognitionRef.current?.abort();
    setOpen(false);
    window.dispatchEvent(new CustomEvent("skillio:open-ai-chat"));
  };

  return <>
    <button className={`voice-command-fab ${isInstitutionHome ? "is-institution-home" : ""} ${open || chatOpen ? "is-open" : ""}`} style={isInstitutionHome ? { "--institution-home-ai-accent": tenant?.primaryColor || "#315d8a" } : undefined} aria-label={chatOpen ? "Close Skillio AI chat" : open ? "Close voice controls" : "Open Skillio AI voice controls"} aria-expanded={open || chatOpen} onClick={() => {
      if (chatOpen) { window.dispatchEvent(new CustomEvent("skillio:toggle-ai-chat")); setOpen(false); }
      else if (open) close();
      else { setOpen(true); setStatus("idle"); setFeedback(""); }
    }}>
      {open || chatOpen ? <X size={19} /> : <>
      <Sparkles size={19} /><span>AI</span>
      </>}
    </button>
    {open && <section className="voice-command-panel" role="dialog" aria-labelledby="voice-command-title" aria-describedby="voice-command-status">
        <div className="voice-panel-topline"><span><Sparkles size={14} /> SKILLIO AI <i>VOICE</i></span><span className={`voice-live-state ${status === "listening" ? "is-live" : ""}`}><span />{status === "listening" ? "Listening" : status === "processing" ? "Working" : status === "confirmation" ? "Needs confirmation" : "Ready"}</span></div>
        <div className="voice-command-heading"><div className={`voice-command-icon voice-${status}`}><Mic size={19} /></div><div><h2 id="voice-command-title">What can I help with?</h2><p id="voice-command-status">{status === "listening" ? "Tap stop when you're finished" : feedback || "Speak a command, or open chat."}</p></div></div>
        <div className={`voice-command-transcript ${status === "listening" ? "is-listening" : ""}`} aria-live="polite">
          {transcript || <span>{status === "listening" ? "I'm listening…" : "Your request will appear here"}</span>}
          {status === "listening" && <div className="voice-wave" aria-label="Microphone is listening">{Array.from({ length: 19 }, (_, index) => <i key={index} style={{ "--wave-index": index }} />)}</div>}
        </div>
        <div className="voice-command-actions">
          {status === "listening" ? <button className="voice-command-listen is-stop" onClick={stopListening}><MicOff size={16} /> Stop &amp; run</button> : pendingVoiceConfirmation ? <><button className="voice-command-listen" onClick={() => submitToExistingAI(pendingVoiceConfirmation.prompt, true, pendingVoiceConfirmation.actionData)}><Check size={16} /> Confirm</button><button className="voice-command-retry" onClick={() => { setPendingVoiceConfirmation(null); setStatus("success"); setFeedback("Action cancelled. Nothing was changed."); }} aria-label="Cancel action"><X size={17} /></button></> : <button className="voice-command-listen" onClick={startListening} disabled={status === "processing"}><Mic size={16} /> {transcript ? "Speak again" : "Start speaking"}</button>}
          {transcript && status !== "listening" && <button className="voice-command-retry" onClick={() => { setTranscript(""); setFeedback(""); finalTranscriptRef.current = ""; startListening(); }} aria-label="Clear and speak again"><RotateCcw size={17} /></button>}
        </div>
        <div className="voice-command-bottom"><p className="voice-command-hint">Try “Open my courses” · “Show analytics”</p>{userData.role !== "student" && <button className="voice-open-chat" onClick={openChat}><MessageCircle size={15} /> Open chat</button>}</div>
      </section>}
  </>;
}
