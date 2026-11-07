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
} from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCreatorCourseData } from "../redux/courseSlice";

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

  // Voice speech recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // High-impact confirmation state
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  const messagesEndRef = useRef(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN"; // Supports Indian English & Hinglish accents well

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.warn("[SpeechRecognition Error]", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          toast.info("Microphone recognition error. You can type your request.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.info("Speech recognition is not supported in this browser. Please type below.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Speech recognition restart", e);
      }
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

        // Refresh creator courses list in Redux
        try {
          const coursesRes = await api.get("/api/course/getcreator");
          dispatch(setCreatorCourseData(coursesRes.data));
        } catch (e) {
          // ignore
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-[#e8e5dc] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#e8e5dc] bg-gradient-to-r from-[#eff6ff] via-white to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#1c1917] flex items-center gap-1.5">
                AI Teaching Assistant
                <span className="text-[10px] font-semibold uppercase bg-blue-100 text-[#1e3a8a] px-2 py-0.5 rounded-full">
                  Voice & Text
                </span>
              </h3>
              <p className="text-[11px] text-[#78716c]">
                Speak or type natural instructions to build and organize your courses
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer"
            aria-label="Close Assistant"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-[#fcfbf9]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  m.sender === "user"
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-white border border-[#e8e5dc] text-[#1c1917] shadow-xs"
                }`}
              >
                {m.text}

                {/* If result is a course creation */}
                {m.data?.course && (
                  <div className="mt-2.5 pt-2 border-t border-[#f1ede4] flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#1e3a8a] text-xs">
                      {m.data.course.title}
                    </span>
                    <button
                      onClick={() => {
                        navigate(`/editcourse/${m.data.course._id}`);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 bg-[#eff6ff] hover:bg-blue-100 text-[#1e3a8a] text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-[#bfdbfe] transition cursor-pointer"
                    >
                      Open in Builder <ExternalLink size={12} />
                    </button>
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
            <div className="flex items-center gap-2 text-xs text-[#78716c] p-2 bg-white rounded-xl border border-[#e8e5dc] w-fit shadow-xs">
              <Loader2 size={14} className="animate-spin text-[#1e3a8a]" />
              <span>Executing authorized teaching instruction...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-[#e8e5dc] bg-white flex items-center gap-1.5 overflow-x-auto text-[11px]">
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
        <div className="p-3 sm:p-4 bg-white border-t border-[#e8e5dc]">
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
              className={`p-2.5 sm:p-3 rounded-xl transition cursor-pointer shrink-0 ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse"
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
                  : "e.g. 'Ek course banao jiska naam English Full Course hai'..."
              }
              className="flex-1 bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="bg-[#1e3a8a] hover:bg-[#172554] text-white p-2.5 sm:p-3 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>

          {isListening && (
            <p className="text-[11px] text-rose-600 font-semibold pt-1.5 flex items-center gap-1">
              <Volume2 size={13} className="animate-bounce" />
              Microphone active — speak naturally in English, Hindi, or Hinglish...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
