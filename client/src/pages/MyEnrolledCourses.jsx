import React, { useState, useEffect } from "react";
import { ArrowLeft, BookOpen, PlayCircle, Clock, GraduationCap, Video, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import { optimizeImage } from "../utils/imageOptimizer";
import EmptyState from "../components/common/EmptyState";
import Button from "../components/common/Button";
import { useTenant } from "../context/TenantContext";

function MyEnrolledCourses() {
  const { userData } = useSelector((state) => state.user);
  const { courseData } = useSelector((state) => state.course);
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useTenant();

  const activeSlug = slug || (tenant && !tenant.isPlatform ? tenant.slug : localStorage.getItem("skillio_active_tenant"));

  const [coursesList, setCoursesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "in_progress" | "completed"

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
      if (typeof item === "object" && item.title) {
        return item;
      }
      const foundInStore = (courseData || []).find((c) => c._id === id);
      if (foundInStore) return foundInStore;

      return typeof item === "object" ? item : { _id: id };
    });

    setCoursesList(initialList);

    // Asynchronously fetch any missing full course records
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

  // Primary active course to feature in the "Continue Learning" hero spotlight
  const activeCourse = coursesList.find((c) => c?.title) || coursesList[0];

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans selection:bg-[#1e3a8a] selection:text-white">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 flex-1 pb-28 md:pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e8e5dc]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(activeSlug ? `/institution/${activeSlug}` : "/")}
              className="p-2 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer touch-target pressable"
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
                  My Courses
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
                Resume video lectures, download instructor notes, and track your curriculum progress
              </p>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          {coursesList.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-[#e8e5dc] p-1 rounded-xl shadow-2xs self-start sm:self-auto">
              <button
                onClick={() => setFilterTab("all")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === "all"
                    ? "bg-[#1e3a8a] text-white"
                    : "text-[#57534e] hover:bg-[#f8f7f4]"
                }`}
              >
                All Courses ({coursesList.length})
              </button>
              <button
                onClick={() => setFilterTab("in_progress")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === "in_progress"
                    ? "bg-[#1e3a8a] text-white"
                    : "text-[#57534e] hover:bg-[#f8f7f4]"
                }`}
              >
                Active Session
              </button>
            </div>
          )}
        </div>

        {/* 1. Continue Learning Hero Spotlight */}
        {activeCourse && activeCourse.title && (
          <div className="rounded-3xl bg-white border border-[#e8e5dc] p-5 sm:p-7 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-4 aspect-video rounded-2xl overflow-hidden bg-black relative flex items-center justify-center border border-[#e8e5dc]">
              {activeCourse.thumbnail ? (
                <img
                  src={optimizeImage(activeCourse.thumbnail, 600)}
                  alt={activeCourse.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] flex flex-col items-center justify-center text-white p-4">
                  <PlayCircle size={36} className="text-amber-300 mb-1" />
                  <span className="text-xs font-bold line-clamp-1">{activeCourse.title}</span>
                </div>
              )}
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#1e3a8a] bg-[#eff6ff] px-2.5 py-0.5 rounded-full border border-[#bfdbfe]">
                  <Sparkles size={11} /> Continue Learning
                </span>
                <span className="text-xs text-[#78716c] font-medium">
                  {activeCourse.category || "Academy Track"}
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1c1917] tracking-tight leading-tight">
                  {activeCourse.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#78716c] line-clamp-2 mt-1">
                  {activeCourse.subTitle || activeCourse.description || "Pick up right where you left off in your classroom video lecture and study notes."}
                </p>
              </div>

              {/* Progress Bar & CTA */}
              <div className="space-y-2 pt-1 max-w-lg">
                <div className="flex items-center justify-between text-xs font-semibold text-[#57534e]">
                  <span>Curriculum Progress</span>
                  <span className="font-mono text-[#1e3a8a]">Active Session</span>
                </div>
                <div className="w-full h-2 bg-[#f2efe9] rounded-full overflow-hidden border border-[#e8e5dc]">
                  <div className="h-full bg-[#1e3a8a] rounded-full w-[65%]" />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(`/viewlecture/${activeCourse._id}`)}
                  icon={PlayCircle}
                  className="shadow-sm pressable"
                >
                  Resume Watching & Notes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Enrolled Courses Grid or Empty State */}
        {coursesList.length === 0 ? (
          <EmptyState
            type="enrollments"
            title="You haven't joined a course yet"
            description="Explore courses and enroll in verified curriculum with high-definition video lectures and downloadable notes."
            actionLabel="Explore Course Catalog"
            onAction={() => navigate("/allcourses")}
          />
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1c1917] tracking-tight">
              All Enrolled Courses ({coursesList.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {coursesList.map((course, ind) => {
                if (!course) return null;
                const courseId = course._id;
                const hasThumbnail = Boolean(course?.thumbnail);

                return (
                  <div
                    key={courseId || ind}
                    className="group bg-white border border-[#e8e5dc] rounded-2xl overflow-hidden shadow-xs hover:border-[#1e3a8a]/40 hover:shadow-lg card-lift transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-[#f1ede4] overflow-hidden">
                      {hasThumbnail ? (
                        <img
                          src={optimizeImage(course.thumbnail, 600)}
                          alt={course?.title || "Course thumbnail"}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = "none";
                            if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}

                      {/* Clean Gradient Fallback */}
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

                      {course?.category && (
                        <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-[#1e3a8a] text-[10px] px-2 py-0.5 rounded-md font-bold border border-[#e8e5dc] shadow-xs">
                          {course.category}
                        </span>
                      )}
                    </div>

                    {/* Body Content */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <h3 className="text-base font-extrabold text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors line-clamp-2 tracking-tight">
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
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl transition shadow-xs cursor-pointer min-h-[44px] active:scale-98 pressable"
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
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default MyEnrolledCourses;
