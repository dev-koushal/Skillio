import React from "react";
import { Star, BookOpen, Clock, Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../context/TenantContext";
import { optimizeImage } from "../utils/imageOptimizer";

function CourseCard({
  thumbnail,
  title,
  subTitle,
  category,
  price,
  id,
  reviews,
  creator,
  enrolledStudents,
  progress = null,
  lecturesCount = 0,
}) {
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const calculateAvgReview = (revs) => {
    if (!revs || revs.length === 0) return 0;
    const total = revs.reduce((sum, r) => sum + (r.rating || 0), 0);
    return (total / revs.length).toFixed(1);
  };

  const avgRating = calculateAvgReview(reviews);
  const reviewCount = reviews?.length || 0;

  const isFree = !price || Number(price) === 0;
  const instructorName = creator?.name || tenant?.name || "Verified Educator";

  const studentCount = Array.isArray(enrolledStudents)
    ? enrolledStudents.length
    : typeof enrolledStudents === "number"
    ? enrolledStudents
    : null;

  const hasThumbnail = Boolean(thumbnail);

  return (
    <div
      onClick={() => navigate(`/viewcourse/${id}`)}
      className="group w-full flex flex-col rounded-2xl overflow-hidden bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 shadow-xs hover:shadow-lg card-lift cursor-pointer text-[#1c1917] transition-all duration-300 select-none"
    >
      {/* Thumbnail with Zoom on Hover */}
      <div className="relative w-full aspect-video overflow-hidden bg-[#f8f7f4]">
        {hasThumbnail ? (
          <img
            src={optimizeImage(thumbnail, 600)}
            alt={title || "Course thumbnail"}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = "none";
              if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
            }}
            loading="lazy"
          />
        ) : null}

        {/* Branded Fallback if no thumbnail uploaded */}
        <div
          className={`w-full h-full bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] flex-col items-center justify-center text-white p-4 text-center space-y-1.5 ${
            hasThumbnail ? "hidden" : "flex"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-xs">
            <BookOpen size={20} />
          </div>
          <span className="text-xs font-bold text-white/90 line-clamp-1">{title}</span>
        </div>

        {category && (
          <span className="absolute top-3 left-3 text-[10px] font-bold bg-white/95 backdrop-blur-xs text-[#1e3a8a] px-2.5 py-1 rounded-lg border border-[#e8e5dc] shadow-2xs">
            {category}
          </span>
        )}

        {/* Enrolled Progress Bar overlay if course is active */}
        {progress !== null && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>

      {/* Course Info */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-[#78716c] truncate">
            {instructorName}
          </p>

          <h3 className="text-sm sm:text-base font-extrabold text-[#1c1917] group-hover:text-[#1e3a8a] line-clamp-2 leading-snug transition-colors tracking-tight">
            {title || "Untitled Course"}
          </h3>

          {subTitle && (
            <p className="text-xs text-[#78716c] line-clamp-1 leading-relaxed">
              {subTitle}
            </p>
          )}
        </div>

        {/* Pricing & Metadata Bar */}
        <div className="pt-3 border-t border-[#f2efe9] flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            {isFree ? (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                Free
              </span>
            ) : (
              <span className="text-sm sm:text-base font-extrabold text-[#1c1917] tracking-tight">
                ₹{typeof price === "number" ? price.toLocaleString("en-IN") : price || 0}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {studentCount !== null && studentCount > 0 ? (
              <span className="text-[11px] text-[#78716c] flex items-center gap-1 font-medium">
                <Users size={12} /> {studentCount}
              </span>
            ) : null}

            <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              <span className="text-[#44403c] font-bold">{avgRating}</span>
              <span className="text-[#a8a29e] font-normal text-[11px]">({reviewCount})</span>
            </div>

            <span className="text-[#1e3a8a] group-hover:translate-x-1 transition-transform">
              <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseCard;
