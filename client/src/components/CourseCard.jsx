import React from "react";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
function CourseCard({thumbnail,title,category,price,id}) {
    const navigate = useNavigate();
  return (
    <div className="min-w-64 min-h-90 rounded-xl overflow-hidden shadow-lg hover:shadow-white/40  hover:scale-101 transition duration-300 bg-white hover:shadow-md hover:cursor-pointer text-black" onClick={()=>navigate(`/viewcourse/${id}`)}>
      
      {/* Image */}
      <div className="w-full h-40 md:h-48 overflow-hidden">
        <img
          src={thumbnail}
          alt="course"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">
          {title}
        </h2>

        <span className="inline-block text-xs bg-gray-200 px-2 py-1 rounded-md">
          {category}
        </span>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">
            ₹{price}
          </span>

          <div className="flex items-center gap-1 text-yellow-500">
            <Star size={18} />
            <span className="text-sm text-gray-700">5</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseCard;