import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CircleDot, Play, Search, GraduationCap } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import { optimizeImage } from "../utils/imageOptimizer";
import { setStoredTenantSlug } from "../services/tenantStorage";
import { getAccessibleTextColor, getInstitutionTheme } from "../utils/institutionTheme";
import "./InstitutionHome.css";

function getInitials(label = "") {
  return label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function CourseThumbnail({ course, className = "", size = "normal" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = getInitials(course?.title) || "C";

  if (course?.thumbnail && !imgFailed) {
    return (
      <img
        src={optimizeImage(course.thumbnail, size === "large" ? 360 : 200)}
        alt=""
        className={`ih-thumb-img ${className}`}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className={`ih-thumb-fallback ${size} ${className}`} aria-hidden="true">
      <div className="ih-thumb-pattern" />
      <span className="ih-thumb-initials">{initials}</span>
    </div>
  );
}

export default function InstitutionHome() {
  const { slug } = useParams();
  const { userData } = useSelector((state) => state.user);
  const { tenant: contextTenant } = useTenant();
  const [institution, setInstitution] = useState(null);
  const [institutionCourses, setInstitutionCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseQuery, setCourseQuery] = useState("");
  const [currentLiveClass, setCurrentLiveClass] = useState(null);

  useEffect(() => {
    let mounted = true;
    const targetSlug = slug || contextTenant?.slug || "default";
    setLoading(true);

    if (targetSlug !== "default") {
      setStoredTenantSlug(targetSlug);
    }

    Promise.allSettled([
      api.get(`/api/tenant/by-slug/${targetSlug}`),
      api.get(`/api/course/by-institution/${targetSlug}`),
    ]).then(([tenantResult, coursesResult]) => {
      if (!mounted) return;

      if (
        tenantResult.status === "fulfilled" &&
        tenantResult.value.data?.success &&
        tenantResult.value.data?.tenant
      ) {
        const tenantData = tenantResult.value.data.tenant;
        setInstitution(tenantData);
        document.title = `${tenantData.name} — Student Learning`;
      } else if (contextTenant?.slug === targetSlug) {
        setInstitution(contextTenant);
      }

      if (coursesResult.status === "fulfilled" && Array.isArray(coursesResult.value.data)) {
        setInstitutionCourses(coursesResult.value.data);
      } else {
        setInstitutionCourses([]);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [slug, contextTenant?.slug]);

  // Poll for active live broadcast in this institution
  useEffect(() => {
    let mounted = true;
    const loadLiveClass = async () => {
      if (!userData?._id && !userData?.id) {
        if (mounted) setCurrentLiveClass(null);
        return;
      }
      try {
        const { data } = await api.get("/api/institution/live/current");
        if (mounted) setCurrentLiveClass(data?.liveClass || null);
      } catch {
        if (mounted) setCurrentLiveClass(null);
      }
    };
    void loadLiveClass();
    const timer = window.setInterval(loadLiveClass, 20_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [userData?._id, userData?.id, slug, contextTenant?.slug]);

  const activeTenant = institution || contextTenant;
  const institutionName = activeTenant?.name || "Your Academy";
  const theme = getInstitutionTheme(activeTenant);

  // Dynamic Theme Controls scoped to semantic CSS variables
  const tenantStyle = {
    "--primary": theme.primary,
    "--primary-soft": `color-mix(in srgb, ${theme.primary} 8%, white)`,
    "--primary-border": `color-mix(in srgb, ${theme.primary} 20%, #e7e5e4)`,
    "--accent": theme.accent,
    "--background": theme.background || "#fafaf9",
    "--surface": theme.surface || "#ffffff",
    "--text": theme.text || "#1c1917",
    "--muted": theme.muted || "#78716c",
    "--border": theme.border || "#e7e5e4",
    "--primary-text": getAccessibleTextColor(theme.primary),
  };

  const resolvedSlug = activeTenant?.slug || slug;
  const courseCatalogPath = resolvedSlug
    ? `/institution/${encodeURIComponent(resolvedSlug)}/courses`
    : "/courses";

  // Check which courses in this institution the student is enrolled in
  const enrolledCourseIds = useMemo(() => {
    return new Set(
      (userData?.enrolledCourses || [])
        .map((item) => (typeof item === "object" ? item?._id : item))
        .filter(Boolean)
        .map(String)
    );
  }, [userData?.enrolledCourses]);

  const enrolledInThisInstitution = useMemo(() => {
    return institutionCourses.filter((course) => enrolledCourseIds.has(String(course._id)));
  }, [institutionCourses, enrolledCourseIds]);

  // Active enrolled course for "Continue learning"
  const activeCourse = enrolledInThisInstitution[0] || null;

  // Time-aware personalized greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const studentFirstName = userData?.name ? userData.name.trim().split(/\s+/)[0] : "Student";

  // Filter courses for search
  const visibleCourses = useMemo(() => {
    const q = courseQuery.trim().toLowerCase();
    if (!q) return institutionCourses.slice(0, 6);
    return institutionCourses.filter(
      (c) =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.subTitle && c.subTitle.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [courseQuery, institutionCourses]);

  return (
    <div className="ih-app-shell" style={tenantStyle}>
      {/* Compact Native App Bar */}
      <Navbar currentInstitution={activeTenant} studentHome={userData?.role === "student"} />

      <main className="ih-content-container" id="ih-main">
        {loading ? (
          <div className="ih-loading-state" role="status" aria-live="polite">
            <div className="ih-loading-spinner" />
            <span>Loading {institutionName}…</span>
          </div>
        ) : (
          <div className="ih-screen-flow">
            {/* 1. Header Greeting & Identity */}
            <header className="ih-welcome-header">
              <div className="ih-greeting-group">
                <span className="ih-institution-badge">
                  {activeTenant?.institutionType || "Academy"}
                </span>
                <h1 className="ih-welcome-title">
                  {timeGreeting}, {studentFirstName}
                </h1>
                <p className="ih-institution-tagline">
                  {activeTenant?.title || `Welcome to ${institutionName}`}
                </p>
              </div>
            </header>

            {/* 2. Optional Live Session Banner (Subtle & Compact) */}
            {currentLiveClass && (
              <section className="ih-live-banner-section" aria-label="Live Broadcast">
                <Link
                  to={`/institution/${encodeURIComponent(resolvedSlug)}/live`}
                  className="ih-live-banner"
                >
                  <div className="ih-live-badge">
                    <CircleDot size={12} className="ih-live-pulse-dot" />
                    <span>LIVE NOW</span>
                  </div>
                  <div className="ih-live-info">
                    <strong className="ih-live-name">
                      {currentLiveClass.title || "Live class session"}
                    </strong>
                    {currentLiveClass.createdBy?.name && (
                      <span className="ih-live-host">with {currentLiveClass.createdBy.name}</span>
                    )}
                  </div>
                  <span className="ih-live-join-action">
                    Join <ArrowRight size={14} />
                  </span>
                </Link>
              </section>
            )}

            {/* 3. Continue Learning (Priority Surface when student has enrolled courses) */}
            {activeCourse ? (
              <section className="ih-learning-section" aria-labelledby="ih-continue-heading">
                <div className="ih-section-header">
                  <h2 id="ih-continue-heading" className="ih-section-title">
                    Continue learning
                  </h2>
                </div>

                <div className="ih-continue-card">
                  <div className="ih-continue-thumb-wrap">
                    <CourseThumbnail course={activeCourse} size="large" />
                    <div className="ih-continue-play-overlay">
                      <Play size={20} className="ih-play-icon" />
                    </div>
                  </div>

                  <div className="ih-continue-details">
                    <span className="ih-continue-category">
                      {activeCourse.category || "In Progress"}
                    </span>
                    <h3 className="ih-continue-title">{activeCourse.title}</h3>

                    <div className="ih-continue-meta">
                      <span className="ih-progress-text">
                        {Array.isArray(activeCourse.lectures) && activeCourse.lectures.length > 0
                          ? `${activeCourse.lectures.length} lessons available`
                          : "Curriculum ready"}
                      </span>
                      <div className="ih-progress-track">
                        <div
                          className="ih-progress-fill"
                          style={{ width: "35%" }}
                          role="progressbar"
                          aria-valuenow={35}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                    </div>

                    <div className="ih-continue-action-wrap">
                      <Link
                        to={`/viewlecture/${activeCourse._id}`}
                        className="ih-continue-btn"
                      >
                        <span>Continue</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* 4. Institution Course Catalog */}
            <section className="ih-courses-section" aria-labelledby="ih-courses-heading">
              <div className="ih-section-header">
                <div className="ih-section-title-wrap">
                  <h2 id="ih-courses-heading" className="ih-section-title">
                    Courses
                  </h2>
                  <span className="ih-courses-count-pill">
                    {institutionCourses.length}
                  </span>
                </div>
                {institutionCourses.length > 3 && !courseQuery && (
                  <Link to={courseCatalogPath} className="ih-view-all-link">
                    <span>View all</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>

              {/* Course Search Filter (if multiple courses exist) */}
              {institutionCourses.length > 2 && (
                <div className="ih-search-box">
                  <Search size={15} className="ih-search-icon" aria-hidden="true" />
                  <input
                    type="text"
                    value={courseQuery}
                    onChange={(e) => setCourseQuery(e.target.value)}
                    placeholder="Search courses…"
                    aria-label="Search courses"
                    className="ih-search-input"
                  />
                </div>
              )}

              {visibleCourses.length > 0 ? (
                <div className="ih-course-list">
                  {visibleCourses.map((course) => {
                    const isEnrolled = enrolledCourseIds.has(String(course._id));
                    const lectureCount = Array.isArray(course.lectures) ? course.lectures.length : 0;

                    return (
                      <Link
                        key={course._id}
                        to={`/institution/${encodeURIComponent(resolvedSlug)}/course/${course._id}`}
                        className="ih-course-row"
                        aria-label={`View course: ${course.title}`}
                      >
                        <div className="ih-course-row-thumb">
                          <CourseThumbnail course={course} />
                        </div>

                        <div className="ih-course-row-info">
                          <div className="ih-course-row-top">
                            <span className="ih-course-row-cat">{course.category || "General"}</span>
                            {isEnrolled && (
                              <span className="ih-enrolled-tag">
                                Enrolled
                              </span>
                            )}
                          </div>
                          <h3 className="ih-course-row-title">{course.title}</h3>
                          <div className="ih-course-row-meta">
                            {lectureCount > 0 && (
                              <span>{lectureCount} {lectureCount === 1 ? "lesson" : "lessons"}</span>
                            )}
                            {course.level && <span>• {course.level}</span>}
                            {!isEnrolled && (
                              <span className="ih-course-row-price">
                                {course.price === 0 || !course.price
                                  ? "Free"
                                  : `₹${Number(course.price).toLocaleString("en-IN")}`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ih-course-row-arrow" aria-hidden="true">
                          <ArrowRight size={16} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                /* 5. Elegant Empty State (No Giant Graphics, Restrained & Branded) */
                <div className="ih-empty-state">
                  <div className="ih-empty-icon-wrap" aria-hidden="true">
                    <BookOpen size={22} className="ih-empty-icon" />
                  </div>
                  <div className="ih-empty-copy">
                    <h3 className="ih-empty-title">
                      {courseQuery ? "No matching courses" : "Start learning"}
                    </h3>
                    <p className="ih-empty-desc">
                      {courseQuery
                        ? `No courses matching "${courseQuery}". Try another keyword.`
                        : "No courses have been published yet. Your educator will add courses here when they're ready."}
                    </p>
                  </div>
                  {courseQuery ? (
                    <button
                      type="button"
                      onClick={() => setCourseQuery("")}
                      className="ih-empty-btn"
                    >
                      Clear search
                    </button>
                  ) : (
                    <Link to="/courses" className="ih-empty-btn">
                      <span>Browse courses</span>
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
