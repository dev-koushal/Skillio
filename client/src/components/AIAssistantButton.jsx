import React, { useState, useEffect, lazy, Suspense } from "react";
import { Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";

// Lazy-load modal so audio analyzers and large AI components do not hurt initial page load
const AIAssistantModal = lazy(() => import("./AIAssistantModal"));

export default function AIAssistantButton({ currentCourseId = null, onCourseCreated = null }) {
  const [modalOpen, setModalOpen] = useState(false);
  const location = useLocation();
  const isCourseBuilder = /^\/(?:builder|createcourses|editcourse)(?:\/|$)/.test(location.pathname);

  const pathMatch = location.pathname.match(/\/(?:builder|editcourse|viewcourse|createlecture)\/([a-zA-Z0-9]+)/);
  const activeCourseId = currentCourseId || (pathMatch && pathMatch[1] !== "new" ? pathMatch[1] : null);

  useEffect(() => {
    if (isCourseBuilder) setModalOpen(false);
  }, [isCourseBuilder]);

  if (isCourseBuilder) return null;

  return (
    <>
      {/* Circular Floating AI Button (Educator Action) */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 group">
        <button
          onClick={() => setModalOpen((prev) => !prev)}
          className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer border border-white/25 shadow-lg hover:shadow-xl ${
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
            <X size={20} className="text-white transition-transform" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Sparkles size={20} className="text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)] group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-[#0b0f19]" />
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

      {/* Floating Copilot Dock (Loaded only when activated) */}
      {modalOpen && (
        <Suspense fallback={null}>
          <AIAssistantModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            currentCourseId={activeCourseId}
            onCourseCreated={onCourseCreated}
          />
        </Suspense>
      )}
    </>
  );
}

