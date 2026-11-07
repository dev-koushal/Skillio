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

  // Voice speech recognition & audio recorder state
  const [isListening, setIsListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0);
  const [audioWave, setAudioWave] = useState([20, 35, 60, 45, 25]);
  const isUserRecordingRef = useRef(false);
  const recordingTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const speechTranscriptRef = useRef("");
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const hasSpokenRef = useRef(false);

  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const messagesEndRef = useRef(null);

  // Clean up speech recognition, audio streams, and timers on unmount
  useEffect(() => {
    return () => {
      cleanupAudioSession();
    };
  }, []);

  const cleanupAudioSession = () => {
    isUserRecordingRef.current = false;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  const cancelListening = () => {
    cleanupAudioSession();
    setIsListening(false);
    speechTranscriptRef.current = "";
    audioChunksRef.current = [];
    setPrompt("");
    setAudioVolume(0);
  };

  // Start Voice Recording with universal MediaRecorder + real-time volume analysis
  const startListening = async () => {
    cleanupAudioSession();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Audio recording is not supported in this browser environment. Please type below!",
        },
      ]);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      hasSpokenRef.current = false;
      isUserRecordingRef.current = true;
      speechTranscriptRef.current = "";
      setRecordingSeconds(0);
      setIsListening(true);

      // Start elapsed timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Setup Web Audio API volume visualizer
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVolume = () => {
            if (!isUserRecordingRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioVolume(avg);

            // Generate 5 reactive wave heights between 15% and 100%
            const w1 = Math.min(100, Math.max(15, (dataArray[1] || avg) * 0.9));
            const w2 = Math.min(100, Math.max(20, (dataArray[3] || avg) * 1.1));
            const w3 = Math.min(100, Math.max(25, (dataArray[5] || avg) * 1.3));
            const w4 = Math.min(100, Math.max(20, (dataArray[7] || avg) * 1.0));
            const w5 = Math.min(100, Math.max(15, (dataArray[9] || avg) * 0.8));
            setAudioWave([w1, w2, w3, w4, w5]);

            if (avg > 18) {
              hasSpokenRef.current = true;
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
            } else if (hasSpokenRef.current) {
              // Auto-submit after 2.5 seconds of silence if user has already spoken
              if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                  stopListeningAndSubmit();
                }, 2500);
              }
            }

            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      } catch (err) {
        console.warn("AudioContext visualizer notice:", err);
      }

      // Initialize MediaRecorder (works across Brave, Chrome, Firefox, Safari)
      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);

      // In parallel: try SpeechRecognition for optimistic interim live display if supported
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-IN";

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
            const current = (final + interim).trim();
            if (current) {
              speechTranscriptRef.current = current;
              setPrompt(current);
            }
          };

          recognition.onerror = () => {
            // Silently ignore browser-specific SpeechRecognition errors (like Brave's blocked Google server)
            // MediaRecorder handles recording regardless!
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          // Ignore SpeechRecognition startup errors
        }
      }
    } catch (err) {
      console.warn("Microphone access denied or failed:", err);
      setIsListening(false);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Microphone permission is blocked or unavailable. Click the camera/microphone icon in your browser address bar to allow access, or type your request below.",
        },
      ]);
    }
  };

  // Stop recording and process voice command
  const stopListeningAndSubmit = async () => {
    isUserRecordingRef.current = false;
    setIsListening(false);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const mr = mediaRecorderRef.current;
    if (!mr) {
      const fallbackText = speechTranscriptRef.current.trim() || prompt.trim();
      if (fallbackText) handleSubmit(fallbackText);
      return;
    }

    // Wrap stop in promise to ensure all audio chunks are received
    await new Promise((resolve) => {
      if (mr.state !== "inactive") {
        mr.onstop = () => resolve();
        try {
          mr.stop();
        } catch (e) {
          resolve();
        }
      } else {
        resolve();
      }
    });

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    const chunks = audioChunksRef.current;
    const clientTranscript = speechTranscriptRef.current.trim() || prompt.trim();

    // If we have recorded audio chunks, send to Whisper speech-to-text API
    if (chunks.length > 0) {
      const audioBlob = new Blob(chunks, { type: chunks[0].type || "audio/webm" });

      if (audioBlob.size > 2000) {
        setLoading(true);
        setPendingConfirmation(null);

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "voice_command.webm");
          if (currentCourseId) {
            formData.append("currentCourseId", currentCourseId);
          }

          const { data } = await api.post("/api/ai/voice", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (data.transcription) {
            setMessages((prev) => [
              ...prev,
              { sender: "user", text: data.transcription },
            ]);
          } else if (clientTranscript) {
            setMessages((prev) => [
              ...prev,
              { sender: "user", text: clientTranscript },
            ]);
          }

          if (data.requiresConfirmation) {
            setPendingConfirmation(data);
            setMessages((prev) => [
              ...prev,
              {
                sender: "ai",
                text: data.confirmationMessage,
                isConfirmation: true,
                originalPrompt: data.transcription || clientTranscript,
              },
            ]);
            setLoading(false);
            return;
          }

          if (data.success) {
            setMessages((prev) => [
              ...prev,
              {
                sender: "ai",
                text: data.message || data.response,
                data: data.data,
                action: data.action,
              },
            ]);

            // Refresh courses live
            try {
              const [coursesRes, publishedRes] = await Promise.all([
                api.get("/api/course/getcreator"),
                api.get("/api/course/getpublished"),
              ]);
              if (coursesRes.data) dispatch(setCreatorCourseData(coursesRes.data));
              if (publishedRes.data) dispatch(setCourseData(publishedRes.data));
            } catch (e) {}

            if (onCourseCreated && data.data?.course) {
              onCourseCreated(data.data.course);
            }
          } else {
            setMessages((prev) => [
              ...prev,
              { sender: "ai", text: data.message || "Could not process voice instruction." },
            ]);
          }
        } catch (err) {
          console.error("[Voice Submit Error]", err);
          if (clientTranscript) {
            // Fallback to text chat if audio upload had network hiccup
            handleSubmit(clientTranscript);
          } else {
            const msg = err.response?.data?.message || err.message || "Failed to process audio.";
            setMessages((prev) => [...prev, { sender: "ai", text: `Voice Error: ${msg}` }]);
          }
        } finally {
          setLoading(false);
          setPrompt("");
          speechTranscriptRef.current = "";
          audioChunksRef.current = [];
        }
        return;
      }
    }

    // Fallback if audio blob was empty
    if (clientTranscript) {
      handleSubmit(clientTranscript);
      speechTranscriptRef.current = "";
    } else {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "I didn't catch any speech. Click the microphone and speak your instruction, or type it below.",
        },
      ]);
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
          {isListening ? (
            <div className="p-3 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border border-rose-200 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                  <span className="text-xs font-bold text-rose-800">
                    Listening [{Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}]
                  </span>

                  {/* Real-time Voice Audio Visualizer */}
                  <div className="flex items-end gap-1 h-4 px-1.5 ml-1">
                    {audioWave.map((h, i) => (
                      <span
                        key={i}
                        style={{ height: `${Math.max(20, h)}%` }}
                        className="w-1 bg-rose-500 rounded-full transition-all duration-75"
                      />
                    ))}
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-full">
                  Speak Now
                </span>
              </div>

              {/* Live Transcript / Prompt View */}
              <div className="p-2.5 bg-white border border-rose-200 rounded-xl min-h-[46px] max-h-[80px] overflow-y-auto text-xs sm:text-sm text-[#1c1917] font-semibold flex items-center">
                {prompt.trim() ? (
                  <span>{prompt}</span>
                ) : (
                  <span className="text-gray-400 italic font-normal">
                    Listening to your voice... Speak naturally in English, Hindi, or Hinglish
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={cancelListening}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={stopListeningAndSubmit}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 transition"
                >
                  <Send size={13} />
                  Done Speaking & Run 🚀
                </button>
              </div>
            </div>
          ) : (
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
                className="p-2.5 rounded-xl transition cursor-pointer shrink-0 bg-[#f8f7f4] text-[#1e3a8a] hover:bg-[#eff6ff] hover:text-[#1e3a8a] border border-[#d6d3d1] hover:border-[#bfdbfe]"
                title="Click to speak instruction in Hindi/English"
              >
                <Mic size={18} />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type or click 🎤 to speak your instruction..."
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
          )}
        </div>
      </div>
    </div>
  );
}

