import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Volume2,
  RotateCcw,
} from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCreatorCourseData, setCourseData } from "../redux/courseSlice";

export default function AIAssistantModal({
  isOpen,
  onClose,
  currentCourseId = null,
  onCourseCreated = null,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Namaste! I am your AI Teaching Assistant. Tell me what you'd like to teach or build — you can speak in English, Hindi, or Hinglish.",
    },
  ]);

  // Voice speech recognition refs and state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const speechTranscriptRef = useRef("");
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const messagesEndRef = useRef(null);

  // Clean up speech recognition and timers on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const stopListeningAndSubmit = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    setIsListening(false);

    const spokenText = speechTranscriptRef.current.trim();
    if (spokenText) {
      handleSubmit(spokenText);
      speechTranscriptRef.current = "";
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Voice speech recognition isn't enabled in this browser. Feel free to type your request below!",
        },
      ]);
      return;
    }

    // Stop existing instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    speechTranscriptRef.current = "";
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // Accurately captures Indian English, Hindi, and Hinglish

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const currentText = (final + interim).trim();
      if (currentText) {
        setPrompt(currentText);
        speechTranscriptRef.current = currentText;

        // Auto-submit 1.5 seconds after user stops speaking
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopListeningAndSubmit();
        }, 1500);
      }
    };

    recognition.onerror = (event) => {
      console.warn("[SpeechRecognition Error]", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Speech start error:", e);
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListeningAndSubmit();
    } else {
      startListening();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Execute AI prompt
  const handleSubmit = async (textToSend = null, confirmed = false) => {
    const finalPrompt = textToSend || prompt;
    if (!finalPrompt || !finalPrompt.trim()) return;

    if (!confirmed) {
      // Add user message
      setMessages((prev) => [...prev, { sender: "user", text: finalPrompt.trim() }]);
      setPrompt("");
    }

    setLoading(true);
    setPendingConfirmation(null);

    try {
      const { data } = await api.post("/api/ai/chat", {
        prompt: finalPrompt.trim(),
        currentCourseId,
        confirmed,
      });

      if (data.requiresConfirmation) {
        setPendingConfirmation(data);
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: data.confirmationMessage,
            isConfirmation: true,
            originalPrompt: finalPrompt,
          },
        ]);
        return;
      }

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: data.message,
            data: data.data,
            action: data.action,
          },
        ]);

        // Refresh both creator and published courses in Redux so catalog & studio update live
        try {
          const [coursesRes, publishedRes] = await Promise.all([
            api.get("/api/course/getcreator"),
            api.get("/api/course/getpublished"),
          ]);
          if (coursesRes.data) dispatch(setCreatorCourseData(coursesRes.data));
          if (publishedRes.data) dispatch(setCourseData(publishedRes.data));
        } catch (e) {
          // ignore background refresh error
        }

        if (onCourseCreated && data.data?.course) {
          onCourseCreated(data.data.course);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: data.message || "Failed to process instruction." },
        ]);
      }
    } catch (err) {
      console.error("[AIAssistant Submit Error]", err);
      const msg = err.response?.data?.message || err.message || "Failed to reach AI assistant.";
      setMessages((prev) => [...prev, { sender: "ai", text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Quick prompt chips
  const quickPrompts = [
    "Ek course banao jiska naam English Full Course hai",
    "Add lecture Introduction to English",
    "English Full Course mein 3 lectures add karo",
    "Mere courses dikhao",
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 sm:right-6 z-[999998] w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-7.5rem)] font-sans animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className="w-full h-full bg-white/98 backdrop-blur-md border border-[#e8e5dc] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_1px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden">
        {/* Multi-Million Dollar SaaS Header */}
        <div className="flex items-center justify-between p-4 sm:p-4.5 border-b border-[#e8e5dc] bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#1e3a8a] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 text-amber-300 flex items-center justify-center shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white tracking-tight">
                  Skillio Copilot
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-[11px] text-white/70">
                Voice & natural language course assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setMessages([
                  {
                    sender: "ai",
                    text: "Conversation reset. What would you like to teach or build today?",
                  },
                ]);
                setPendingConfirmation(null);
              }}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Reset Chat"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close Assistant"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#fcfbf9]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  m.sender === "user"
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-white border border-[#e8e5dc] text-[#1c1917] shadow-xs"
                }`}
              >
                {m.text}

                {/* If result is a course creation or update */}
                {m.data?.course && (
                  <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#1e3a8a] text-xs sm:text-sm">
                        {m.data.course.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          m.data.course.isPublished
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}
                      >
                        {m.data.course.isPublished ? "Published (Live)" : "Draft"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          navigate(`/builder/${m.data.course._id}`);
                          onClose();
                        }}
                        className="flex-1 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold py-1.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        Open in Builder <ExternalLink size={12} />
                      </button>

                      {!m.data.course.isPublished && (
                        <button
                          onClick={() => handleSubmit(`Publish course ${m.data.course.title}`)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                          title="Publish course immediately so students can see it in catalog"
                        >
                          Publish Now 🚀
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* If confirmation required */}
                {m.isConfirmation && pendingConfirmation && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle size={15} className="text-amber-700" />
                      <span>Confirmation Required</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setPendingConfirmation(null);
                          setMessages((prev) => [
                            ...prev,
                            { sender: "ai", text: "Action cancelled." },
                          ]);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmit(m.originalPrompt, true)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer shadow-xs"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#78716c] p-2.5 bg-white rounded-2xl border border-[#e8e5dc] w-fit shadow-xs animate-pulse">
              <Loader2 size={14} className="animate-spin text-[#1e3a8a]" />
              <span>Executing authorized teaching instruction...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 border-t border-[#e8e5dc] bg-white flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
          <span className="text-[#78716c] font-semibold whitespace-nowrap">Try:</span>
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSubmit(p)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-[#f8f7f4] hover:bg-[#f1ede4] border border-[#e8e5dc] text-[#57534e] whitespace-nowrap transition cursor-pointer disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Voice & Text Input Box */}
        <div className="p-3 bg-white border-t border-[#e8e5dc]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-center gap-2"
          >
            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl transition cursor-pointer shrink-0 ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/30"
                  : "bg-[#f8f7f4] text-[#44403c] hover:bg-[#f1ede4] border border-[#d6d3d1]"
              }`}
              title={isListening ? "Listening... Click to stop" : "Speak instruction in Hindi/English"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isListening
                  ? "Listening to your voice..."
                  : "Type or speak (e.g. 'Publish English Full Course')..."
              }
              className="flex-1 bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[42px]"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="bg-[#1e3a8a] hover:bg-[#172554] text-white p-2.5 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0 min-h-[42px] min-w-[42px] flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>

          {isListening && (
            <div className="pt-2 flex items-center justify-between text-[11px] text-rose-600 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Listening... Speak naturally (auto-executes when you pause)
              </span>
              <button
                type="button"
                onClick={stopListeningAndSubmit}
                className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-800 px-2 py-0.5 rounded-md transition cursor-pointer font-bold"
              >
                Send Voice →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

