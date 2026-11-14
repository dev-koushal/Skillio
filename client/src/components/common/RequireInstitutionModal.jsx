import React from "react";
import { Building2, X, AlertCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function RequireInstitutionModal({
  isOpen,
  onClose,
  title = "Create your institution first",
  description = "Your institution is the home for your courses, students and learning content. Create it before launching your first course.",
}) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="require-institution-title"
    >
      <div
        className="w-full max-w-md bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1e3a8a] shrink-0">
            <Building2 size={24} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <h2 id="require-institution-title" className="text-lg sm:text-xl font-bold text-[#1c1917] tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#d6d3c9] bg-white hover:bg-[#f8f7f4] text-xs sm:text-sm font-semibold text-[#44403c] transition cursor-pointer pressable min-h-[42px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/create-institution");
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer pressable min-h-[42px]"
          >
            <span>Create Institution</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
