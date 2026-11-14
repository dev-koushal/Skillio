import React from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function LoadingOverlay({ label = "Loading\u2026", className = "", fullScreen = false }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`${fullScreen ? "fixed" : "absolute"} inset-0 z-20 grid place-items-center bg-white/75 backdrop-blur-[1px] ${className}`}
    >
      <LoadingSpinner size="md" label={label} className="text-[var(--ui-primary,#5b3cc4)]" />
    </div>
  );
}
