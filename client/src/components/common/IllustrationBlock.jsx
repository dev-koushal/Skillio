import React from "react";
import {
  Play,
  Sparkles,
  BookOpen,
  FileText,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Video,
  Clock,
  Layers,
  GraduationCap,
} from "lucide-react";

/**
 * HeroIllustration:
 * High-taste, tactile product visual composition with:
 * - Technical background grid
 * - Soft radial blue/ivory glow
 * - Central Product UI card representing English Academy / English Mastery
 * - Floating accent cards: "3 New Lessons", "Notes & Resources", "AI Teaching Assistant", "Continue Learning"
 * - Subtle geometric connector accents
 * - Strictly adhering to design-taste-frontend (no fake ratings, no childish cartoons).
 */
export function HeroIllustration({ className = "" }) {
  return (
    <div className={`relative w-full max-w-[540px] mx-auto select-none ${className}`}>
      {/* 1. Subtle Radial Glows & Gradient Blobs */}
      <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-100/70 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />

      {/* 2. Abstract Technical Grid Pattern Behind Composition */}
      <div className="absolute inset-0 -m-4 opacity-40 pointer-events-none overflow-hidden rounded-3xl">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#d6d3c9" strokeWidth="0.75" strokeDasharray="2 2" />
              <circle cx="28" cy="28" r="1.2" fill="#1e3a8a" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      {/* 3. Central Tactile Product UI Card */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-3xl border border-[#e8e5dc] p-5 sm:p-6 shadow-xl shadow-stone-200/50 space-y-4">
        {/* Card Header: Institution Context */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f2efe9]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              E
            </div>
            <div>
              <p className="text-xs font-bold text-[#1c1917] leading-tight">English Academy</p>
              <p className="text-[10px] text-[#78716c] font-medium">Independent LMS Tenant</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Session
          </span>
        </div>

        {/* Course & Active Lecture Player Simulation */}
        <div className="relative rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] p-4 text-white overflow-hidden shadow-inner">
          {/* Subtle Video Watermark Grid */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px]" />

          <div className="relative z-10 flex items-center justify-between text-xs pb-3">
            <span className="bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-md font-mono text-[10px] font-semibold uppercase tracking-wider text-blue-100">
              English Mastery
            </span>
            <span className="text-[11px] text-white/80 font-mono">14:20 / 22:00</span>
          </div>

          <div className="relative z-10 py-3 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-white text-[#1e3a8a] flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer shrink-0">
              <Play size={18} className="fill-[#1e3a8a] ml-0.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">Next Lecture</p>
              <p className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
                Pronunciation & Speaking
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative z-10 pt-2 space-y-1">
            <div className="flex justify-between text-[10px] text-white/85 font-semibold">
              <span>Course Progress</span>
              <span className="font-mono font-bold text-amber-300">78% Complete</span>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full w-[78%] transition-all duration-500" />
            </div>
          </div>
        </div>

        {/* Supporting Micro-Widgets in 2 Columns */}
        <div className="grid grid-cols-2 gap-3 pt-0.5">
          <div className="p-3 rounded-2xl bg-[#f8f7f4] border border-[#e8e5dc] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/60">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#78716c] font-bold uppercase tracking-wider truncate">Resources</p>
              <p className="text-xs font-extrabold text-[#1c1917] truncate">Notes & Resources</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#1e3a8a] font-bold uppercase tracking-wider truncate">AI Study Aid</p>
              <p className="text-xs font-extrabold text-[#1c1917] truncate">AI Teaching Assistant</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Floating Tactile Accent Cards (Editorial Placement) */}
      {/* Top Right: "3 New Lessons" badge */}
      <div className="hidden sm:flex absolute -top-3.5 -right-3.5 bg-white border border-[#e8e5dc] rounded-2xl px-3.5 py-2 shadow-lg items-center gap-2 animate-in fade-in slide-in-from-top-2">
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
        <span className="text-xs font-bold text-[#1c1917]">3 New Lessons</span>
      </div>

      {/* Bottom Left: "Continue Learning" action pill */}
      <div className="hidden sm:flex absolute -bottom-3.5 -left-3.5 bg-white border border-[#e8e5dc] rounded-2xl px-3.5 py-2 shadow-lg items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
          ✓
        </div>
        <div className="text-left">
          <p className="text-[9px] text-[#78716c] font-semibold uppercase tracking-wider leading-none">Status</p>
          <p className="text-xs font-extrabold text-[#1c1917] mt-0.5 leading-none">Continue Learning</p>
        </div>
      </div>

      {/* Decorative Vector Sparkles */}
      <svg
        className="absolute -top-6 left-8 w-5 h-5 text-amber-500 animate-pulse pointer-events-none"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0L14 9L23 11L14 13L12 22L10 13L1 11L10 9L12 0Z" />
      </svg>
      <svg
        className="absolute -bottom-5 right-12 w-4 h-4 text-blue-500 opacity-60 pointer-events-none"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0L14 9L23 11L14 13L12 22L10 13L1 11L10 9L12 0Z" />
      </svg>
    </div>
  );
}

/**
 * ConnectorPath:
 * Subtle dotted directional path connecting onboarding and how-it-works steps.
 */
export function ConnectorPath({ className = "" }) {
  return (
    <div className={`hidden md:flex items-center justify-center ${className}`}>
      <svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 12C14 12 18 12 24 12C30 12 36 12 44 12M44 12L36 6M44 12L36 18"
          stroke="#D6D3C9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 4"
        />
      </svg>
    </div>
  );
}
