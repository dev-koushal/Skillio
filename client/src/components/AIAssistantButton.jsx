import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { useSelector } from "react-redux";
import AIAssistantModal from "./AIAssistantModal";

export default function AIAssistantButton({ currentCourseId = null, onCourseCreated = null }) {
  const { userData } = useSelector((state) => state.user);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 cursor-pointer border border-[#3b82f6]/40 min-h-[46px] group"
        aria-label="Ask AI Teaching Assistant"
        title="Open AI Teaching Assistant"
      >
        <span className="p-1 rounded-full bg-blue-500/30 text-amber-300 group-hover:rotate-12 transition-transform">
          <Sparkles size={16} />
        </span>
        <span className="text-xs sm:text-sm font-semibold tracking-wide">
          Ask AI ✨
        </span>
      </button>

      <AIAssistantModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentCourseId={currentCourseId}
        onCourseCreated={onCourseCreated}
      />
    </>
  );
}

