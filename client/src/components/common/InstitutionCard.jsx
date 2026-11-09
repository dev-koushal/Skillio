import React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, BookOpen, ArrowRight, ShieldCheck } from "lucide-react";
import { optimizeImage } from "../../utils/imageOptimizer";

export default function InstitutionCard({ institution, className = "" }) {
  const navigate = useNavigate();

  if (!institution) return null;

  const {
    name = "Academy",
    slug,
    description,
    institutionType = "Academy",
    logo,
    courseCount = 0,
    domainTags = [],
  } = institution;

  const handleClick = () => {
    if (slug) {
      localStorage.setItem("skillio_active_tenant", slug);
      navigate(`/institution/${slug}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 shadow-xs hover:shadow-lg card-lift cursor-pointer text-[#1c1917] transition-all duration-300 min-h-[220px] ${className}`}
    >
      <div className="space-y-4">
        {/* Top Header: Logo + Title + Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#f8f7f4] border border-[#e8e5dc] flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#1e3a8a]/30 transition-colors">
              {logo ? (
                <img
                  src={optimizeImage(logo, 100)}
                  alt={name}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    e.target.style.display = "none";
                    if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-base ${
                  logo ? "hidden" : "flex"
                }`}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors leading-snug line-clamp-1">
                {name}
              </h3>
              <span className="text-[11px] font-semibold text-[#78716c] uppercase tracking-wider">
                {institutionType}
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            <ShieldCheck size={12} className="text-emerald-600" />
            Verified
          </span>
        </div>

        {/* Short Description */}
        <p className="text-xs sm:text-sm text-[#57534e] line-clamp-2 leading-relaxed">
          {description || `Discover high-quality video lectures, curated notes, and practice curriculum at ${name}.`}
        </p>

        {/* Tags */}
        {domainTags && domainTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {domainTags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] font-medium bg-[#f8f7f4] text-[#78716c] px-2 py-0.5 rounded-md border border-[#e8e5dc]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info & Action */}
      <div className="pt-4 mt-3 border-t border-[#f2efe9] flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-[#78716c] font-medium">
          <BookOpen size={14} className="text-[#1e3a8a]" />
          <span>{courseCount} {courseCount === 1 ? "Course" : "Courses"}</span>
        </span>

        <span className="inline-flex items-center gap-1 font-bold text-[#1e3a8a] group-hover:text-[#172554] transition-colors">
          <span>Enter Academy</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </div>
  );
}

