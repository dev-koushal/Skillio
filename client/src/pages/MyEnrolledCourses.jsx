import React from "react";
import { ArrowLeft, BookOpen, PlayCircle, Clock } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function MyEnrolledCourses() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const enrolled = userData?.enrolledCourses || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-900 transition cursor-pointer"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              My Enrolled Courses
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Access your learning paths, track progress, and resume lectures
            </p>
          </div>
        </div>

        {/* Course Cards Grid or Empty State */}
        {enrolled.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-4">
            <BookOpen size={44} className="mx-auto text-gray-600" />
            <h2 className="text-lg font-semibold text-white">No courses enrolled yet</h2>
            <p className="text-xs sm:text-sm text-gray-400">
              You haven't enrolled in any courses in this organization yet. Browse the catalog and find something exciting to master!
            </p>
            <button
              onClick={() => navigate("/allcourses")}
              className="bg-cyan-900 hover:bg-cyan-800 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg transition"
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
                  className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between hover:border-gray-700 transition"
                >
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img
                      src={
                        course?.thumbnail ||
                        "https://thumbs.dreamstime.com/b/no-thumbnail-image-placeholder-forums-blogs-websites-148010362.jpg"
                      }
                      alt={course?.title || "Course"}
                      className="w-full h-full object-cover"
                    />
                    {course?.category && (
                      <span className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-sm text-cyan-300 text-xs px-2.5 py-0.5 rounded-md font-semibold">
                        {course.category}
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white line-clamp-2">
                        {course?.title || "Enrolled Course"}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {course?.description || course?.subTitle || "Continue learning your curriculum"}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/viewlecture/${courseId}`)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-cyan-900 hover:bg-cyan-800 text-white font-medium text-xs sm:text-sm py-2.5 rounded-lg transition shadow-sm cursor-pointer min-h-[42px]"
                    >
                      <PlayCircle size={16} />
                      <span>Resume Watching</span>
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
