import React, { useState } from "react";
import { Sparkles, X } from "lucide-react";
import AIAssistantModal from "./AIAssistantModal";

export default function AIAssistantButton({ currentCourseId = null, onCourseCreated = null }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Luxury Multi-Million Dollar SaaS Circular FAB */}
      <div className="fixed bottom-6 right-6 z-[999999] group">
        <button
          onClick={() => setModalOpen((prev) => !prev)}
          className={`relative w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer border border-white/25 shadow-[0_10px_35px_-5px_rgba(30,58,138,0.5),0_0_25px_rgba(59,130,246,0.25)] hover:shadow-[0_16px_45px_-5px_rgba(30,58,138,0.7),0_0_35px_rgba(59,130,246,0.4)] ${
            modalOpen
              ? "bg-[#0f172a] rotate-90 text-white"
              : "bg-gradient-to-tr from-[#0b0f19] via-[#111827] to-[#1e3a8a] text-white hover:scale-105"
          }`}
          aria-label={modalOpen ? "Close AI Assistant" : "Open AI Assistant"}
          title={modalOpen ? "Close AI Assistant" : "Open AI Assistant"}
        >
          {/* Subtle Ambient Pulse Ring */}
          {!modalOpen && (
            <span className="absolute -inset-1 rounded-full bg-blue-500/20 animate-ping opacity-60 pointer-events-none" />
          )}

          {modalOpen ? (
            <X size={22} className="text-white transition-transform" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Sparkles size={24} className="text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)] group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0b0f19]" />
            </div>
          )}
        </button>

        {/* Tooltip on hover when closed */}
        {!modalOpen && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 bg-[#0f172a]/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <span className="text-amber-300">✨</span> Ask AI Assistant
          </div>
        )}
      </div>

      {/* Floating Copilot Dock */}
      <AIAssistantModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentCourseId={currentCourseId}
        onCourseCreated={onCourseCreated}
      />
    </>
  );
}

