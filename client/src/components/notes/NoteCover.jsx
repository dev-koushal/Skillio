import React from "react";
import { FileText, BookOpen } from "lucide-react";

/**
 * Deterministic, premium document cover fallback generator.
 * Uses institution theme accent, title, and topic without random stock images or AI illustrations.
 */
export default function NoteCover({
  thumbnail,
  title = "Study Notes",
  topic = "General",
  pageCount = 0,
  accentColor = "#5b3cc4",
  className = "w-full aspect-[16/10]",
}) {
  if (thumbnail && thumbnail.trim()) {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-[#f8f7f4] border border-[#e8e5dc] ${className}`}>
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
          PDF
        </div>
      </div>
    );
  }

  // Generate deterministic subtle shade offset from accent
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[#e8e5dc] flex flex-col justify-between p-3.5 select-none ${className}`}
      style={{
        background: `linear-gradient(145deg, #ffffff 0%, #faf8f5 55%, #f1ece4 100%)`,
      }}
    >
      {/* Decorative Document Spine Accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2"
        style={{ backgroundColor: accentColor }}
      />

      {/* Top Header: Topic Tag & Document Badge */}
      <div className="flex items-center justify-between gap-2 pl-1.5">
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md truncate max-w-[120px]"
          style={{
            backgroundColor: `${accentColor}18`,
            color: accentColor,
          }}
        >
          {topic}
        </span>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-[#78716c]">
          <FileText size={12} />
          <span>PDF</span>
        </div>
      </div>

      {/* Middle Body: Document Graphic + Title */}
      <div className="pl-1.5 my-auto py-1">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5"
          style={{
            backgroundColor: `${accentColor}12`,
            color: accentColor,
          }}
        >
          <BookOpen size={15} />
        </div>
        <h4 className="text-xs sm:text-sm font-bold text-[#1c1917] line-clamp-2 leading-tight">
          {title}
        </h4>
      </div>

      {/* Bottom Footer: Page count & Document Stamp */}
      <div className="pt-1.5 border-t border-[#e8e5dc] flex items-center justify-between pl-1.5 text-[10px] text-[#78716c]">
        <span>{pageCount > 0 ? `${pageCount} pages` : "Study Material"}</span>
        <span className="font-semibold tracking-wider text-[9px] uppercase opacity-70">
          DOC
        </span>
      </div>
    </div>
  );
}
