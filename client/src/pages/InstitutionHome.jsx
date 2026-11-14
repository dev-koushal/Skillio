import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CircleDot, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import { optimizeImage } from "../utils/imageOptimizer";
import { setStoredTenantSlug } from "../services/tenantStorage";
import { getAccessibleTextColor, getInstitutionTheme } from "../utils/institutionTheme";
import "./InstitutionHome.css";

function getCourseMeta(course) {
  const facts = [
    Array.isArray(course?.lectures) && course.lectures.length > 0 ? `${course.lectures.length} lessons` : null,
    course?.level,
  ].filter(Boolean);
  return facts.join(" · ") || course?.category || course?.subTitle || "";
}

function getInitials(label = "") {
  return label.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function InstitutionMark({ institution }) {
  return institution?.logo
    ? <img className="ih-institution-mark-image" src={institution.logo} alt="" width="64" height="64" />
    : <span className="ih-institution-mark-letters" aria-hidden="true">{getInitials(institution?.name) || "A"}</span>;
}

function CourseArtwork({ course, featured = false }) {
  return course?.thumbnail
    ? <img className={featured ? "ih-feature-art-image" : "ih-library-thumbnail"} src={optimizeImage(course.thumbnail, featured ? 320 : 180)} alt="" width={featured ? 160 : 112} height={featured ? 160 : 96} loading="lazy" decoding="async" />
    : <span className={featured ? "ih-feature-art-fallback" : "ih-library-art-fallback"} aria-hidden="true">{getInitials(course?.title) || "C"}</span>;
}

function LearningHero({ activeCourse, firstCourse, institution, institutionName, courseCount, coursePath, courseCountLabel }) {
  const hasActiveCourse = Boolean(activeCourse);
  const artworkCourse = activeCourse || firstCourse || null;

  return (
    <section className="ih-next-step" aria-labelledby="ih-next-step-title">
      <article className={`ih-learning-card${hasActiveCourse ? " is-continuing" : ""}`}>
        <div className="ih-learning-copy">
          <p className="ih-learning-kicker">{hasActiveCourse ? "CONTINUE LEARNING" : "YOUR NEXT STEP"}</p>
          <h2 id="ih-next-step-title">{hasActiveCourse ? activeCourse.title : courseCount ? "Find your next course" : "Start learning"}</h2>
          {hasActiveCourse ? (
            getCourseMeta(activeCourse) && <p className="ih-learning-detail">{getCourseMeta(activeCourse)}</p>
          ) : (
            <p className="ih-learning-detail">
              {courseCount
                ? `Explore ${courseCountLabel} courses from ${institutionName}.`
                : `Courses from ${institutionName} will appear here when published.`}
            </p>
          )}
          <Link className="ih-learning-action" to={hasActiveCourse ? `/viewlecture/${activeCourse._id}` : coursePath}>
            {hasActiveCourse ? "Continue course" : "Browse courses"} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="ih-learning-art" aria-hidden="true">
          <span className="ih-learning-art-orbit" />
          <span className="ih-learning-art-mark">
            {artworkCourse
              ? <CourseArtwork course={artworkCourse} featured />
              : <InstitutionMark institution={institution} />}
          </span>
          <span className="ih-learning-art-dot" />
        </div>
      </article>
    </section>
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

    if (targetSlug !== "default") setStoredTenantSlug(targetSlug);

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
        document.title = `${tenantData.name} - Student learning`;
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

    return () => { mounted = false; };
  }, [slug, contextTenant?.slug]);

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
  const tenantStyle = {
    "--primary": theme.primary,
    "--secondary": theme.secondary,
    "--accent": theme.accent,
    "--background": theme.background,
    "--surface": theme.surface,
    "--text": theme.text,
    "--muted": theme.muted,
    "--border": theme.border,
    "--primary-text": getAccessibleTextColor(theme.primary),
    "--display-font": "'Plus Jakarta Sans', 'DM Sans', ui-sans-serif, system-ui, sans-serif",
  };
  const resolvedSlug = activeTenant?.slug || slug;
  const coursePath = resolvedSlug ? `/institution/${encodeURIComponent(resolvedSlug)}/courses` : "/courses";

  const enrolledCourseIds = useMemo(() => new Set(
    (userData?.enrolledCourses || [])
      .map((item) => (typeof item === "object" ? item?._id : item))
      .filter(Boolean)
      .map(String),
  ), [userData?.enrolledCourses]);

  const enrolledCourses = institutionCourses.filter((course) => enrolledCourseIds.has(String(course._id)));
  const activeCourse = enrolledCourses[0]
    || (userData?.enrolledCourses || []).find((course) => course && typeof course === "object")
    || null;
  const rawFirstName = userData?.name?.trim().split(/\s+/)[0];
  const firstName = rawFirstName ? `${rawFirstName[0].toLocaleUpperCase()}${rawFirstName.slice(1)}` : "Student";
  const courseCountLabel = new Intl.NumberFormat().format(institutionCourses.length);
  const visibleCourses = useMemo(() => {
    const query = courseQuery.trim().toLowerCase();
    const courses = query
      ? institutionCourses.filter((course) => `${course.title || ""} ${course.category || ""} ${course.subTitle || ""}`.toLowerCase().includes(query))
      : institutionCourses;
    return courses.slice(0, 3);
  }, [courseQuery, institutionCourses]);

  return (
    <div className="institution-learning" style={tenantStyle}>
      <Navbar currentInstitution={activeTenant} studentHome={userData?.role === "student"} />
      <a className="ih-skip-link" href="#ih-main">Skip to main content</a>
      <main className="ih-main" id="ih-main">
        {loading ? (
          <div className="ih-loading" aria-live="polite">            <span>Opening {institutionName}{"\u2026"}</span>
          </div>
        ) : (
          <>
            <section className="ih-hero" aria-labelledby="ih-title">
              <h1 id="ih-title">Welcome back, {firstName}</h1>
            </section>

            <LearningHero
              activeCourse={activeCourse}
              firstCourse={institutionCourses[0]}
              institution={activeTenant}
              institutionName={institutionName}
              courseCount={institutionCourses.length}
              courseCountLabel={courseCountLabel}
              coursePath={coursePath}
            />

            {currentLiveClass && (
              <Link className="ih-live-row" to={`/institution/${encodeURIComponent(resolvedSlug)}/live`}>
                <span className="ih-live-indicator"><CircleDot size={13} aria-hidden="true" /> LIVE NOW</span>
                <span className="ih-live-title">
                  <strong>{currentLiveClass.title || "Live class"}</strong>
                  {currentLiveClass.createdBy?.name && <small>{currentLiveClass.createdBy.name}</small>}
                </span>
                <span className="ih-live-join">Join live <ArrowRight size={15} aria-hidden="true" /></span>
              </Link>
            )}

            <section className="ih-catalog" aria-labelledby="ih-catalog-title">
              <div className="ih-section-heading ih-catalog-heading">
                <h2 id="ih-catalog-title">Courses</h2>
                {institutionCourses.length > 3 && !courseQuery && <Link to={coursePath} className="ih-view-all">View all <ArrowRight size={15} aria-hidden="true" /></Link>}
              </div>
              {institutionCourses.length > 2 && <label className="ih-search"><Search size={16} aria-hidden="true" /><input name="courseSearch" autoComplete="off" value={courseQuery} onChange={(event) => setCourseQuery(event.target.value)} placeholder={"Find a course\u2026"} aria-label="Find a course" /></label>}

              {visibleCourses.length ? (
                <div className="ih-course-grid">
                  {visibleCourses.map((course) => (
                    <Link
                      key={course._id}
                      to={`/institution/${encodeURIComponent(resolvedSlug)}/course/${course._id}`}
                      className="ih-library-course"
                      aria-label={`View course ${course.title || "Untitled course"}`}
                    >
                      <CourseArtwork course={course} />
                      <span className="ih-library-copy">
                        <strong>{course.title || "Untitled course"}</strong>
                        {getCourseMeta(course) && <span>{getCourseMeta(course)}</span>}
                      </span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="ih-empty-courses">
                  <span className="ih-empty-course-mark" aria-hidden="true"><BookOpen size={19} strokeWidth={1.7} /></span>
                  <div>
                    <strong>{courseQuery ? "No matching courses" : "No courses yet"}</strong>
                    <p>{courseQuery ? "Try a different name or subject." : "Your educator’s published courses will appear here."}</p>
                  </div>
                </div>
              )}

            </section>

          </>
        )}
      </main>
    </div>
  );
}
