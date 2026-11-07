import React from "react";
import { Star, BookOpen, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../context/TenantContext";

function CourseCard({
  thumbnail,
  title,
  category,
  price,
  id,
  reviews,
  creator,
  enrolledStudents,
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

  const defaultThumbnail =
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";

  const isFree = !price || Number(price) === 0;
  const instructorName = creator?.name || tenant?.name || "Verified Educator";

  const studentCount = Array.isArray(enrolledStudents)
    ? enrolledStudents.length
    : typeof enrolledStudents === "number"
    ? enrolledStudents
    : null;

  return (
    <div
      onClick={() => navigate(`/viewcourse/${id}`)}
      className="group w-full flex flex-col rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 cursor-pointer text-[#1c1917] focus-within:ring-2 focus-within:ring-[#1e3a8a]"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video sm:h-44 overflow-hidden bg-[#f8f7f4]">
        <img
          src={thumbnail || defaultThumbnail}
          alt={title || "Course thumbnail"}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          onError={(e) => {
            e.target.src = defaultThumbnail;
          }}
          loading="lazy"
        />
        {category && (
          <span className="absolute top-2.5 left-2.5 text-[11px] font-semibold bg-white/90 backdrop-blur-xs text-[#1e3a8a] px-2.5 py-0.5 rounded-md border border-[#e8e5dc] shadow-xs">
            {category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <p className="text-[11px] text-[#78716c] font-medium truncate">
            {instructorName}
          </p>
          <h3 className="text-sm sm:text-base font-bold text-[#1c1917] group-hover:text-[#1e3a8a] line-clamp-2 leading-snug transition-colors">
            {title || "Untitled Course"}
          </h3>
        </div>

        <div className="pt-3 border-t border-[#f1ede4] flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            {isFree ? (
              <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                Free
              </span>
            ) : (
              <span className="text-sm sm:text-base font-extrabold text-[#1c1917]">
                ₹{typeof price === "number" ? price.toLocaleString("en-IN") : price || 0}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {studentCount !== null && studentCount > 0 && (
              <span className="text-[11px] text-[#78716c] flex items-center gap-1 font-medium">
                <Users size={12} /> {studentCount}
              </span>
            )}

            <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              <span className="text-[#44403c]">{avgRating}</span>
              <span className="text-[#a8a29e] font-normal text-[11px]">({reviewCount})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseCard;
