import React, { useState, useEffect } from "react";
import { ArrowLeft, BookOpen, PlayCircle, Clock, GraduationCap, Video, ArrowRight, Loader2 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import { optimizeImage } from "../utils/imageOptimizer";

function MyEnrolledCourses() {
  const { userData } = useSelector((state) => state.user);
  const { courseData } = useSelector((state) => state.course);
  const navigate = useNavigate();

  const [coursesList, setCoursesList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const rawEnrolled = userData?.enrolledCourses || [];

    if (rawEnrolled.length === 0) {
      setCoursesList([]);
      return;
    }

    // Resolve enrolled courses immediately from userData and courseData
    const initialList = rawEnrolled.map((item) => {
      const id = typeof item === "object" ? item._id : item;
      // If already populated with title & thumbnail, use it
      if (typeof item === "object" && item.title) {
        return item;
      }
      // Look up in Redux courseData
      const foundInStore = (courseData || []).find((c) => c._id === id);
      if (foundInStore) return foundInStore;

      return typeof item === "object" ? item : { _id: id };
    });

    setCoursesList(initialList);

    // For any courses that are still just IDs, fetch their real details asynchronously
    const missingIds = initialList
      .filter((c) => !c.title)
      .map((c) => c._id)
      .filter(Boolean);

    if (missingIds.length > 0) {
      setLoading(true);
      Promise.all(
        missingIds.map((id) =>
          api
            .get(`/api/course/getcourse/${id}`)
            .then((res) => res.data)
            .catch(() => null)
        )
      ).then((fetched) => {
        if (!isMounted) return;
        const validFetched = fetched.filter(Boolean);
        if (validFetched.length > 0) {
          setCoursesList((prev) =>
            prev.map((c) => {
              const match = validFetched.find((f) => f._id === c._id);
              return match || c;
            })
          );
        }
        setLoading(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [userData, courseData]);

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#e8e5dc]">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#eff6ff] text-[#1e3a8a]">
                <GraduationCap size={20} />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                My Enrolled Courses
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
              Access your learning curriculum, watch lectures, and download course notes & resources
            </p>
          </div>
        </div>

        {/* Course Cards Grid or Empty State */}
        {coursesList.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 rounded-2xl bg-white border border-[#e8e5dc] shadow-xs space-y-4 my-8">
            <div className="w-16 h-16 rounded-full bg-[#f1ede4] text-[#78716c] flex items-center justify-center mx-auto">
              <BookOpen size={28} />
            </div>
            <h2 className="text-lg font-bold text-[#1c1917]">No courses enrolled yet</h2>
            <p className="text-xs sm:text-sm text-[#78716c]">
              You haven&apos;t enrolled in any courses in this academy yet. Browse the curriculum and find something exciting to master!
            </p>
            <button
              onClick={() => navigate("/allcourses")}
              className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coursesList.map((course, ind) => {
              if (!course) return null;
              const courseId = course._id;
              const hasThumbnail = Boolean(course?.thumbnail);

              return (
                <div
                  key={courseId || ind}
                  className="group bg-white border border-[#e8e5dc] rounded-2xl overflow-hidden shadow-xs hover:border-[#1e3a8a]/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Thumbnail / Branded Gradient */}
                  <div className="relative aspect-video bg-[#f1ede4] overflow-hidden">
                    {hasThumbnail ? (
                      <img
                        src={optimizeImage(course.thumbnail, 600)}
                        alt={course?.title || "Course thumbnail"}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}

                    {/* Clean Gradient Fallback if no thumbnail uploaded */}
                    <div
                      className={`w-full h-full bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] flex-col items-center justify-center text-white p-6 text-center space-y-2 ${
                        hasThumbnail ? "hidden" : "flex"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-xs">
                        <GraduationCap size={24} />
                      </div>
                      <p className="text-sm font-bold text-white line-clamp-1">
                        {course.title || "Enrolled Course"}
                      </p>
                    </div>

                    {/* Floating Category Tag */}
                    {course?.category && (
                      <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-[#1e3a8a] text-[11px] px-2.5 py-0.5 rounded-md font-semibold border border-[#e8e5dc] shadow-xs">
                        {course.category}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors line-clamp-2">
                        {course?.title || "Enrolled Course"}
                      </h3>
                      <p className="text-xs text-[#78716c] line-clamp-2 leading-relaxed">
                        {course?.description || course?.subTitle || "Continue learning your curriculum and access lecture resources."}
                      </p>

                      {course?.lectures && course.lectures.length > 0 && (
                        <div className="pt-2 flex items-center gap-1.5 text-xs text-[#78716c] font-medium">
                          <Video size={13} className="text-[#1e3a8a]" />
                          <span>{course.lectures.length} Lectures</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(`/viewlecture/${courseId}`)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white font-semibold text-xs sm:text-sm py-2.5 rounded-xl transition shadow-xs cursor-pointer min-h-[42px] active:scale-98"
                    >
                      <PlayCircle size={16} />
                      <span>Resume Watching & Notes</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default MyEnrolledCourses;
