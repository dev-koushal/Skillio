import React from "react";
import { ArrowLeft, BookOpen, PlayCircle, Clock, GraduationCap } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function MyEnrolledCourses() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const enrolled = userData?.enrolledCourses || [];

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-[#eff6ff] text-[#1e3a8a]">
                <GraduationCap size={20} />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1917] tracking-tight">
                My Enrolled Courses
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
              Access your learning curriculum, watch lectures, and download course notes & resources
            </p>
          </div>
        </div>

        {/* Course Cards Grid or Empty State */}
        {enrolled.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 rounded-2xl bg-white border border-[#e8e5dc] shadow-sm space-y-4 my-8">
            <div className="w-16 h-16 rounded-full bg-[#f1ede4] text-[#78716c] flex items-center justify-center mx-auto">
              <BookOpen size={28} />
            </div>
            <h2 className="text-lg font-bold text-[#1c1917]">No courses enrolled yet</h2>
            <p className="text-xs sm:text-sm text-[#78716c]">
              You haven't enrolled in any courses in this organization yet. Browse the curriculum and find something exciting to master!
            </p>
            <button
              onClick={() => navigate("/allcourses")}
              className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolled.map((course, ind) => {
              if (!course) return null;
              const courseId = course._id || course;
              return (
                <div
                  key={courseId || ind}
                  className="bg-white border border-[#e8e5dc] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-[#1e3a8a]/40 hover:shadow-md transition"
                >
                  <div className="relative aspect-video bg-[#f1ede4] overflow-hidden">
                    <img
                      src={
                        course?.thumbnail ||
                        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"
                      }
                      alt={course?.title || "Course"}
                      className="w-full h-full object-cover"
                    />
                    {course?.category && (
                      <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-[#1e3a8a] text-xs px-2.5 py-0.5 rounded-md font-semibold border border-[#e8e5dc]">
                        {course.category}
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#1c1917] line-clamp-2">
                        {course?.title || "Enrolled Course"}
                      </h3>
                      <p className="text-xs text-[#78716c] mt-1 line-clamp-2">
                        {course?.description || course?.subTitle || "Continue learning your curriculum and access resources"}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/viewlecture/${courseId}`)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white font-medium text-xs sm:text-sm py-2.5 rounded-xl transition shadow-sm cursor-pointer min-h-[42px]"
                    >
                      <PlayCircle size={16} />
                      <span>Resume Watching & Notes</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyEnrolledCourses;
