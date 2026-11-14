import React, { useState, useEffect, lazy, Suspense } from "react";
import { Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";

// Lazy-load modal so audio analyzers and large AI components do not hurt initial page load
const AIAssistantModal = lazy(() => import("./AIAssistantModal"));

export default function AIAssistantButton({ currentCourseId = null, onCourseCreated = null, hideTrigger = false }) {
  const [modalOpen, setModalOpen] = useState(false);
  const location = useLocation();
  const isCourseBuilder = /^\/(?:builder|createcourses|editcourse)(?:\/|$)/.test(location.pathname);

  const pathMatch = location.pathname.match(/\/(?:builder|editcourse|viewcourse|createlecture)\/([a-zA-Z0-9]+)/);
  const activeCourseId = currentCourseId || (pathMatch && pathMatch[1] !== "new" ? pathMatch[1] : null);

  useEffect(() => {
    if (isCourseBuilder) setModalOpen(false);
  }, [isCourseBuilder]);

  useEffect(() => {
    const openFromDock = () => { if (!isCourseBuilder) setModalOpen(true); };
    const toggleFromDock = () => { if (!isCourseBuilder) setModalOpen((current) => !current); };
    const closeFromDock = () => setModalOpen(false);
    window.addEventListener("skillio:open-ai-chat", openFromDock);
    window.addEventListener("skillio:toggle-ai-chat", toggleFromDock);
    window.addEventListener("skillio:close-ai-chat", closeFromDock);
    return () => {
      window.removeEventListener("skillio:open-ai-chat", openFromDock);
      window.removeEventListener("skillio:toggle-ai-chat", toggleFromDock);
      window.removeEventListener("skillio:close-ai-chat", closeFromDock);
    };
  }, [isCourseBuilder]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("skillio:ai-chat-state", { detail: { open: modalOpen } }));
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [modalOpen]);

  if (isCourseBuilder) return null;

  return (
    <>
      {/* Circular Floating AI Button (Educator Action) */}
      {!hideTrigger && <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[1000000] group">
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

      </div>}

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

