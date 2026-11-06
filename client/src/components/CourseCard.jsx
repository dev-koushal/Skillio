import React from "react";
import { Star, BookOpen } from "lucide-react";
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

  return (
    <div
      onClick={() => navigate(`/viewcourse/${id}`)}
      className="group w-full flex flex-col rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-white border border-gray-100 hover:border-gray-200 cursor-pointer text-gray-900 focus-within:ring-2 focus-within:ring-cyan-600"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video sm:h-44 overflow-hidden bg-gray-100">
        <img
          src={thumbnail || defaultThumbnail}
          alt={title || "Course thumbnail"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = defaultThumbnail;
          }}
          loading="lazy"
        />
        {category && (
          <span className="absolute top-2.5 left-2.5 text-[11px] font-semibold bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-md tracking-wide">
            {category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-cyan-900 line-clamp-2 leading-snug transition-colors">
            {title || "Untitled Course"}
          </h3>
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-gray-900">
              ₹{typeof price === "number" ? price.toLocaleString("en-IN") : price || 0}
            </span>
          </div>

          <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
            <Star size={15} className="fill-amber-400 text-amber-400" />
            <span className="text-gray-700">{avgRating}</span>
            {reviewCount > 0 && (
              <span className="text-gray-400 font-normal">({reviewCount})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseCard;
