import React from "react";
import { Star, BookOpen, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

function CourseCard({ thumbnail, title, category, price, id, reviews }) {
  const navigate = useNavigate();

  const calculateAvgReview = (revs) => {
    if (!revs || revs.length === 0) return 0;
    const total = revs.reduce((sum, r) => sum + (r.rating || 0), 0);
    return (total / revs.length).toFixed(1);
  };

  const avgRating = calculateAvgReview(reviews);
  const reviewCount = reviews?.length || 0;

  const defaultThumbnail =
    "https://thumbs.dreamstime.com/b/no-thumbnail-image-placeholder-forums-blogs-websites-148010362.jpg";

  const isFree = !price || Number(price) === 0;

  return (
    <div
      onClick={() => navigate(`/viewcourse/${id}`)}
      className="group w-full flex flex-col rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 cursor-pointer text-[#1c1917] focus-within:ring-2 focus-within:ring-[#1e3a8a]"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video sm:h-44 overflow-hidden bg-[#f2efe9]">
        <img
          src={thumbnail || defaultThumbnail}
          alt={title || "Course thumbnail"}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          onError={(e) => {
            e.target.src = defaultThumbnail;
          }}
          loading="lazy"
        />
        {category && (
          <span className="absolute top-2.5 left-2.5 text-[11px] font-bold bg-[#1c1917]/80 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-md tracking-wide">
            {category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#1c1917] group-hover:text-[#1e3a8a] line-clamp-2 leading-snug transition-colors">
            {title || "Untitled Course"}
          </h3>
        </div>

        <div className="pt-3 border-t border-[#f2efe9] flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            {isFree ? (
              <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                Free
              </span>
            ) : (
              <span className="text-base sm:text-lg font-extrabold text-[#1c1917]">
                ₹{typeof price === "number" ? price.toLocaleString("en-IN") : price || 0}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span className="text-[#44403c]">{avgRating}</span>
            <span className="text-[#a8a29e] font-normal text-[11px]">({reviewCount})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseCard;
