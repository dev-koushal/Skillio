import React from "react";

const sizeClasses = {
  sm: "h-3.5 w-3.5 border-[1.5px]",
  md: "h-4 w-4 border-2",
  lg: "h-5 w-5 border-2",
};

export default function LoadingSpinner({ size = "md", label = "Loading\u2026", className = "" }) {
  return (
    <span role="status" aria-label={label} className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      <span aria-hidden="true" className={`rounded-full border-current border-t-transparent motion-safe:animate-spin ${sizeClasses[size] || sizeClasses.md}`} />
    </span>
  );
}
