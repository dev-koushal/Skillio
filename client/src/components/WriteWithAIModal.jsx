import React, { useState } from "react";
import { Sparkles, X, Loader2, Wand2, Check } from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";

const QUICK_CHIPS = [
  "Complete Spoken English for Beginners",
  "DSA & Algorithms for College Students",
  "Target working professionals",
  "Make description more professional",
  "Make description shorter",
  "Set price to ₹799",
];

export default function WriteWithAIModal({
  isOpen,
  onClose,
  onApply,
  currentFields = {},
  initialField = "all",
}) {
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [fieldToGenerate, setFieldToGenerate] = useState(initialField || "all");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e?.preventDefault();
    const finalPrompt = prompt.trim() || topic.trim();
    if (!finalPrompt && !currentFields?.title) {
      toast.warn("Please enter a course topic or refinement instruction.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const { data } = await api.post("/api/ai/write-course", {
        topic: topic.trim() || currentFields?.title || "",
        prompt: finalPrompt,
        currentFields,
        fieldToGenerate,
      });

      if (data.success && data.fields) {
        onApply(data.fields);
        toast.success(data.message || "Course fields populated! Review before saving.");
        onClose();
      } else {
        setErrorMessage("Couldn't generate the course details. Your existing form data is unchanged.");
      }
    } catch (err) {
      console.error("[WriteWithAI Error]", err);
      setErrorMessage("Couldn't generate the course details. Your existing form data is unchanged.");
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (chipText) => {
    if (chipText.toLowerCase().includes("make") || chipText.toLowerCase().includes("target") || chipText.toLowerCase().includes("set price")) {
      setPrompt(chipText);
    } else {
      setTopic(chipText);
      setPrompt(`Create a structured course on ${chipText}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-[#e8e5dc] rounded-2xl shadow-2xl overflow-hidden font-sans flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e5dc] bg-gradient-to-r from-[#0f172a] to-[#1e3a8a] text-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Write with AI</h3>
              <p className="text-[11px] text-white/70">
                {fieldToGenerate === "all" ? "Generate complete course details" : `Refine ${fieldToGenerate}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleGenerate} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Scope Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-[#f8f7f4] border border-[#e8e5dc] rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFieldToGenerate("all")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                fieldToGenerate === "all" ? "bg-white text-[#1e3a8a] shadow-xs font-semibold" : "text-[#78716c]"
              }`}
            >
              Full Course
            </button>
            <button
              type="button"
              onClick={() => setFieldToGenerate("description")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                fieldToGenerate === "description" ? "bg-white text-[#1e3a8a] shadow-xs font-semibold" : "text-[#78716c]"
              }`}
            >
              Description Only
            </button>
            <button
              type="button"
              onClick={() => setFieldToGenerate("subTitle")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                fieldToGenerate === "subTitle" ? "bg-white text-[#1e3a8a] shadow-xs font-semibold" : "text-[#78716c]"
              }`}
            >
              Subtitle
            </button>
          </div>

          {/* Main Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
              What course do you want to create or refine?
            </label>
            <textarea
              rows={3}
              value={prompt || topic}
              onChange={(e) => {
                setPrompt(e.target.value);
                setTopic(e.target.value);
              }}
              placeholder="e.g. Complete Spoken English for Beginners. Focus on grammar, speaking and interview preparation."
              className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] resize-none"
            />
          </div>

          {/* Suggestion Chips */}
          <div>
            <span className="block text-[11px] font-medium text-[#78716c] mb-1.5">Quick Suggestions:</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="text-[11px] font-medium px-2.5 py-1 bg-[#f8f7f4] border border-[#e8e5dc] rounded-lg text-[#57534e] hover:bg-[#f1ede4] hover:text-[#1c1917] transition cursor-pointer text-left"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Policy Note */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-[#1e3a8a] leading-relaxed">
            <span className="font-semibold">Note:</span> Populates the course form fields for your review. No course is saved or published until you click the normal "Create Course" or "Save" button.
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8e5dc]">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#d6d3d1] text-xs font-semibold text-[#57534e] hover:bg-[#f8f7f4] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Generating course details...</span>
                </>
              ) : (
                <>
                  <Wand2 size={13} />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

