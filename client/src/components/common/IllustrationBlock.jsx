import React from "react";
import { Play, Sparkles, BookOpen, GraduationCap, CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";

/**
 * HeroIllustration:
 * Custom vector composition of UI cards, education motifs, progress bar,
 * student avatar, and delicate decorative elements inspired by the editorial design language.
 */
export function HeroIllustration({ className = "" }) {
  return (
    <div className={`relative w-full max-w-[520px] mx-auto select-none ${className}`}>
      {/* Decorative Pastel Background Blobs */}
      <div className="absolute -top-6 -left-6 w-56 h-56 bg-amber-100/60 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -right-6 w-60 h-60 bg-blue-100/70 rounded-full blur-2xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative bg-white/90 backdrop-blur-md rounded-3xl border border-[#e8e5dc] p-6 sm:p-7 shadow-xl shadow-stone-200/50 space-y-5">
        {/* Top Header inside Preview */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f2efe9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              S
            </div>
            <div>
              <p className="text-xs font-bold text-[#1c1917] leading-tight">Skillio Academy</p>
              <p className="text-[10px] text-[#78716c]">Verified Learning Environment</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Classroom
          </span>
        </div>

        {/* Video Lesson Preview Card */}
        <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] p-4 flex flex-col justify-between text-white overflow-hidden shadow-inner">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

          <div className="relative z-10 flex items-center justify-between text-xs">
            <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-md font-mono text-[10px] font-semibold uppercase tracking-wider">
              Lecture 03 • 4K Video
            </span>
            <span className="text-[11px] text-white/80 font-medium">18:45 / 24:10</span>
          </div>

          <div className="relative z-10 text-center my-auto flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-white/90 text-[#1e3a8a] flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
              <Play size={20} className="fill-[#1e3a8a] ml-0.5" />
            </div>
            <p className="font-extrabold text-sm sm:text-base tracking-tight text-white drop-shadow-sm">
              English Fluency & Modern Communication
            </p>
          </div>

          {/* Progress Bar inside lesson */}
          <div className="relative z-10 space-y-1">
            <div className="flex justify-between text-[10px] text-white/80 font-semibold">
              <span>Curriculum Progress</span>
              <span>78% Completed</span>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full w-[78%]" />
            </div>
          </div>
        </div>

        {/* Floating Mini Widgets / Stats */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-[#f8f7f4] border border-[#e8e5dc] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <p className="text-[10px] text-[#78716c] font-bold uppercase tracking-wider">Lecture Notes</p>
              <p className="text-xs font-extrabold text-[#1c1917]">4 PDFs & Cheatsheets</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-[10px] text-[#1e3a8a] font-bold uppercase tracking-wider">AI Teaching Aid</p>
              <p className="text-xs font-extrabold text-[#1c1917]">Instant Explanations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Decorative Badges (Editorial Stickers) */}
      <div className="hidden sm:flex absolute -top-4 -right-4 bg-white border border-[#e8e5dc] rounded-2xl px-4 py-2 shadow-lg items-center gap-2 animate-bounce [animation-duration:3s]">
        <span className="text-amber-500 font-bold text-sm">★ 4.9</span>
        <span className="text-xs font-bold text-[#1c1917]">Top Academy</span>
      </div>

      <div className="hidden sm:flex absolute -bottom-4 -left-4 bg-white border border-[#e8e5dc] rounded-2xl px-4 py-2.5 shadow-lg items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
          ✓
        </div>
        <div className="text-left">
          <p className="text-[10px] text-[#78716c] font-medium leading-none">Instant Access</p>
          <p className="text-xs font-extrabold text-[#1c1917] mt-0.5 leading-none">Verified Curriculum</p>
        </div>
      </div>

      {/* Hand-drawn Vector Sparkles */}
      <svg className="absolute -top-7 left-12 w-6 h-6 text-amber-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
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
