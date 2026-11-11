import React, { useState, useEffect } from "react";
import { ArrowLeft, BookOpen, PlayCircle, GraduationCap, Video, ArrowRight, Sparkles } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import { optimizeImage } from "../utils/imageOptimizer";
import EmptyState from "../components/common/EmptyState";
import Button from "../components/common/Button";
import { useTenant } from "../context/TenantContext";
import { getStoredTenantSlug } from "../services/tenantStorage";
import "./MyEnrolledCourses.css";

function MyEnrolledCourses() {
  const { userData } = useSelector((state) => state.user);
  const { courseData } = useSelector((state) => state.course);
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useTenant();

  const activeSlug = slug || (tenant && !tenant.isPlatform ? tenant.slug : getStoredTenantSlug());
  const institution = tenant && !tenant.isPlatform && (!activeSlug || tenant.slug === activeSlug) ? tenant : null;
  const institutionName = institution?.name || "Your learning space";
  const institutionHomePath = activeSlug ? `/institution/${encodeURIComponent(activeSlug)}` : "/";
  const institutionCoursesPath = activeSlug
    ? `/institution/${encodeURIComponent(activeSlug)}/courses`
    : "/allcourses";
  const accent = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(institution?.primaryColor || "")
    ? institution.primaryColor
    : "#5b3cc4";
  const studentTheme = { "--student-accent": accent, "--institution-accent": accent };

  const [coursesList, setCoursesList] = useState([]);
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
      });
    }

    return () => {
      isMounted = false;
    };
  }, [userData, courseData]);

  // Primary active course to feature in the "Continue Learning" hero spotlight
  const activeCourse = coursesList.find((c) => c?.title) || coursesList[0];

  return (
    <div className="institution-student-page institution-student-library min-h-screen flex flex-col font-sans" style={studentTheme}>
      <Navbar currentInstitution={institution} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 flex-1 pb-28 md:pb-12">
        {/* Page Header */}
        <div className="institution-library-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e8e5dc]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(institutionHomePath)}
              className="p-2 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer touch-target pressable"
              aria-label="Back to home"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="institution-library-title">
              <div className="institution-library-brand">
                {institution?.logo && <img src={institution.logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                <span>{institutionName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="institution-library-heading-icon p-1.5 rounded-lg bg-[#eff6f4] text-[var(--student-accent)]">
                  <GraduationCap size={20} />
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">My courses</h1>
              </div>
              <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
                Your lessons and study materials, all in one place.
              </p>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          {coursesList.length > 0 && <div className="institution-course-count"><BookOpen size={16} /> {coursesList.length} {coursesList.length === 1 ? "course" : "courses"} to explore</div>}
        </div>

        {/* 1. Continue Learning Hero Spotlight */}
        {activeCourse && activeCourse.title && (
          <div className="institution-library-feature rounded-3xl bg-white border border-[#e8e5dc] p-5 sm:p-7 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="institution-library-feature-thumb lg:col-span-4 aspect-video rounded-2xl overflow-hidden bg-black relative flex items-center justify-center border border-[#e8e5dc]">
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
                  <Sparkles size={11} /> In your course library
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
                  {activeCourse.subTitle || activeCourse.description || "Open the lessons and study materials included with this course."}
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(`/viewlecture/${activeCourse._id}`)}
                  icon={PlayCircle}
                  className="shadow-sm pressable"
                >
                  Open lessons
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
            onAction={() => navigate(institutionCoursesPath)}
          />
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1c1917] tracking-tight">
              Your courses <span className="institution-course-total">{coursesList.length}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {coursesList.map((course, ind) => {
                if (!course) return null;
                const courseId = course._id;
                const hasThumbnail = Boolean(course?.thumbnail);

                return (
                  <div
                    key={courseId || ind}
                    className="institution-library-course-card group bg-white border border-[#e8e5dc] rounded-2xl overflow-hidden shadow-xs hover:border-[#1e3a8a]/40 hover:shadow-lg card-lift transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Thumbnail */}
                    <div className="institution-library-course-thumb relative aspect-video bg-[#f1ede4] overflow-hidden">
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
                        <span>Open lessons and notes</span>
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
