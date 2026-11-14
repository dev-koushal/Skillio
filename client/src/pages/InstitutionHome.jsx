import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleDot, Search } from "lucide-react";
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
        document.title = `${tenantData.name} â€” Student learning`;
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
  const firstName = userData?.name?.trim().split(/\s+/)[0];
  const activeCourseMeta = getCourseMeta(activeCourse);
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
      <main className="ih-main">
        {loading ? (
          <div className="ih-loading" aria-live="polite">            <span>Opening {institutionName}{"\u2026"}</span>
          </div>
        ) : (
          <>
            <section className="ih-hero" aria-labelledby="ih-title">
              <h1 id="ih-title">{firstName ? `Welcome back, ${firstName}` : `Welcome to ${institutionName}`}</h1>
            </section>

            {activeCourse && (
              <section className="ih-resume" aria-labelledby="ih-resume-title">
                <div className="ih-section-heading"><h2 id="ih-resume-title">Continue learning</h2></div>
                <article className="ih-featured-course">
                  {activeCourse.thumbnail && <img className="ih-featured-thumbnail" src={optimizeImage(activeCourse.thumbnail, 760)} alt="" width="760" height="428" loading="lazy" decoding="async" />}
                  <div className="ih-featured-copy">
                    <h3>{activeCourse.title}</h3>
                    {activeCourseMeta && <p>{activeCourseMeta}</p>}
                    <Link className="ih-continue-link" to={`/viewlecture/${activeCourse._id}`}>Continue <ArrowRight size={16} aria-hidden="true" /></Link>
                  </div>
                </article>
              </section>
            )}

            {!activeCourse && institutionCourses.length > 0 && (
              <section className="ih-resume" aria-labelledby="ih-resume-title">
                <div className="ih-section-heading"><h2 id="ih-resume-title">Start learning</h2></div>
                <article className="ih-featured-course ih-featured-course-empty">
                  <div className="ih-featured-copy">
                    <h3>No enrolled courses yet</h3>
                    <p>Explore courses available at {institutionName}.</p>
                    <Link className="ih-continue-link" to={coursePath}>Browse courses <ArrowRight size={16} aria-hidden="true" /></Link>
                  </div>
                </article>
              </section>
            )}

            {currentLiveClass && (
              <Link className="ih-live-row" to={`/institution/${encodeURIComponent(resolvedSlug)}/live`}>
                <span className="ih-live-indicator"><CircleDot size={13} aria-hidden="true" /> LIVE NOW</span>
                <span className="ih-live-title">{currentLiveClass.title || "Live class"}</span>
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
                      {course.thumbnail && <img className="ih-library-thumbnail" src={optimizeImage(course.thumbnail, 180)} alt="" width="180" height="160" loading="lazy" decoding="async" />}
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
                  <strong>{courseQuery ? "No matching courses" : "No courses published yet."}</strong>
                  <p>{courseQuery ? "Try another course name or subject." : "Your educator will add courses here when they are ready."}</p>
                </div>
              )}

            </section>

          </>
        )}
      </main>
    </div>
  );
}
