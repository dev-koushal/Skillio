import React from "react";
import { BookOpen, GraduationCap, FileText, Search, Sparkles } from "lucide-react";
import Button from "./Button";

export default function EmptyState({
  type = "default", // "courses" | "enrollments" | "resources" | "search" | "default"
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) {
  // Configurable presets
  const presets = {
    courses: {
      defaultTitle: "Your learning journey starts here",
      defaultDesc: "Explore accredited academies and enroll in structured video courses to master new skills.",
      defaultAction: "Explore Institutions",
      iconBg: "bg-blue-50 text-[#1e3a8a] border-blue-200",
      illustration: (
        <svg viewBox="0 0 160 120" className="w-32 h-24 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="25" y="45" width="80" height="50" rx="8" fill="#FFFFFF" stroke="#D6D3C9" strokeWidth="2" />
          <rect x="35" y="55" width="40" height="6" rx="3" fill="#1E3A8A" />
          <rect x="35" y="67" width="60" height="4" rx="2" fill="#E8E5DC" />
          <rect x="35" y="75" width="50" height="4" rx="2" fill="#E8E5DC" />
          <rect x="55" y="25" width="80" height="50" rx="8" fill="#F8F7F4" stroke="#D6D3C9" strokeWidth="2" />
          <rect x="65" y="35" width="45" height="6" rx="3" fill="#B45309" />
          <rect x="65" y="47" width="60" height="4" rx="2" fill="#E8E5DC" />
          <path d="M120 18L122 24L128 26L122 28L120 34L118 28L112 26L118 24L120 18Z" fill="#F59E0B" />
          <circle cx="30" cy="30" r="3" fill="#3B82F6" />
        </svg>
      ),
    },
    enrollments: {
      defaultTitle: "You haven't joined a course yet",
      defaultDesc: "Enroll in courses to stream video lectures, take notes, and track your learning progress.",
      defaultAction: "Browse Courses",
      iconBg: "bg-amber-50 text-amber-700 border-amber-200",
      illustration: (
        <svg viewBox="0 0 160 120" className="w-32 h-24 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="80" cy="100" rx="45" ry="10" fill="#E8E5DC" />
          <path d="M40 50L80 30L120 50L80 70L40 50Z" fill="#1E3A8A" />
          <path d="M55 58V76C55 84 80 90 80 90C80 90 105 84 105 76V58" stroke="#1E3A8A" strokeWidth="3" fill="none" />
          <path d="M118 52V85" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
          <circle cx="118" cy="88" r="3" fill="#B45309" />
          <path d="M35 30L36 34L40 35L36 36L35 40L34 36L30 35L34 34L35 30Z" fill="#F59E0B" />
        </svg>
      ),
    },
    resources: {
      defaultTitle: "No resources have been added yet",
      defaultDesc: "Lecture notes, formula sheets, code snippets, and study PDFs will appear here once attached by the instructor.",
      defaultAction: "Check Course Details",
      iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      illustration: (
        <svg viewBox="0 0 160 120" className="w-32 h-24 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="45" y="25" width="70" height="80" rx="8" fill="#FFFFFF" stroke="#D6D3C9" strokeWidth="2" />
          <path d="M85 25V45H115" stroke="#D6D3C9" strokeWidth="2" />
          <rect x="60" y="55" width="40" height="4" rx="2" fill="#3B82F6" />
          <rect x="60" y="67" width="40" height="4" rx="2" fill="#E8E5DC" />
          <rect x="60" y="79" width="30" height="4" rx="2" fill="#E8E5DC" />
          <circle cx="125" cy="80" r="14" fill="#EFF6FF" stroke="#BFDBFE" />
          <path d="M125 74V84M120 80L125 85L130 80" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    search: {
      defaultTitle: "No matching results found",
      defaultDesc: "Try adjusting your search terms or filters to discover other courses or academies.",
      defaultAction: "Clear Search",
      iconBg: "bg-stone-100 text-[#57534e] border-stone-200",
      illustration: (
        <svg viewBox="0 0 160 120" className="w-32 h-24 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="75" cy="55" r="28" stroke="#D6D3C9" strokeWidth="3" fill="#FFFFFF" />
          <path d="M96 76L116 96" stroke="#1E3A8A" strokeWidth="4" strokeLinecap="round" />
          <path d="M65 50C65 44.4772 69.4772 40 75 40" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
          <circle cx="120" cy="35" r="3" fill="#F59E0B" />
        </svg>
      ),
    },
    default: {
      defaultTitle: "No items available",
      defaultDesc: "Check back later or explore other sections of the platform.",
      defaultAction: "Go Home",
      iconBg: "bg-blue-50 text-[#1e3a8a] border-blue-200",
      illustration: (
        <svg viewBox="0 0 160 120" className="w-32 h-24 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="35" width="80" height="60" rx="10" fill="#FFFFFF" stroke="#D6D3C9" strokeWidth="2" />
          <circle cx="80" cy="65" r="16" fill="#EFF6FF" stroke="#BFDBFE" />
          <path d="M80 58V68M75 63H85" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
  };

  const current = presets[type] || presets.default;
  const finalTitle = title || current.defaultTitle;
  const finalDesc = description || current.defaultDesc;
  const finalAction = actionLabel || current.defaultAction;

  return (
    <div
      className={`max-w-md mx-auto text-center py-10 sm:py-14 px-6 rounded-2xl bg-white border border-[#e8e5dc] shadow-xs space-y-4 my-6 ${className}`}
    >
      <div className="flex justify-center">{current.illustration}</div>

      <div className="space-y-1.5 max-w-sm mx-auto">
        <h3 className="text-base sm:text-lg font-bold text-[#1c1917] tracking-tight">
          {finalTitle}
        </h3>
        <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
          {finalDesc}
        </p>
      </div>

      {onAction && finalAction && (
        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={onAction}
            className="shadow-xs active:scale-95"
          >
            {finalAction}
          </Button>
        </div>
      )}
    </div>
  );
}
