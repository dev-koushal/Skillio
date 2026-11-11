import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleDot,
  FileText,
  GraduationCap,
  Layers3,
  Play,
  Search,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import CourseCard from "../components/CourseCard";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import { optimizeImage } from "../utils/imageOptimizer";
import SecureVideoPlayer from "../components/video/SecureVideoPlayer";
import { setStoredTenantSlug } from "../services/tenantStorage";
import "./InstitutionHome.css";

const fallbackAccent = "#5b3cc4";

function getBrandColor(value) {
  return /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value || "") ? value : fallbackAccent;
}

function getAccentText(color) {
  const hex = color.replace("#", "");
  const normalized = hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex;
  const channels = normalized.match(/.{2}/g)?.map((channel) => parseInt(channel, 16) / 255) || [];
  if (channels.length !== 3) return "#ffffff";
  const luminance = channels
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const darkInkLuminance = 0.012;
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / (darkInkLuminance + 0.05);
  return darkContrast > whiteContrast ? "#17211d" : "#ffffff";
}

function StudyIllustration({ course, institutionName, institutionLogo }) {
  return (
    <div className="ih-study-visual">
      <div className="ih-visual-topline">
        <span className="ih-visual-brand">
          <img src={institutionLogo || "/skillio.png"} alt="" />
          <span>{institutionName}</span>
        </span>
        <span className="ih-visual-status"><span /> Learning space</span>
      </div>

      <div className="ih-visual-content">
        <div className="ih-book-art" aria-hidden="true">
          <svg viewBox="0 0 280 220" role="presentation">
            <path className="ih-art-orbit" d="M31 167C23 96 77 32 151 31c53-1 88 33 99 71" />
            <path className="ih-art-orbit ih-art-orbit-two" d="M50 188c44 17 101 13 144-16" />
            <circle className="ih-art-dot" cx="226" cy="71" r="7" />
            <circle className="ih-art-dot ih-art-dot-small" cx="48" cy="71" r="4" />
            <path className="ih-book-shadow" d="M45 169c29-7 54-5 78 10 24-15 49-17 78-10v-91c-27-7-53-5-78 11-25-16-51-18-78-11z" />
            <path className="ih-book-page" d="M45 157c29-7 54-5 78 10 24-15 49-17 78-10V66c-27-7-53-5-78 11-25-16-51-18-78-11z" />
            <path className="ih-book-fold" d="M123 77v90" />
            <path className="ih-book-line" d="M62 94c16-3 31-1 44 5M62 111c16-3 31-1 44 5M140 94c15-9 30-12 45-10M140 111c15-9 30-12 45-10" />
            <path className="ih-art-spark" d="M212 143v18m-9-9h18M74 42v12m-6-6h12" />
          </svg>
          <div className="ih-art-orbit-label"><Play size={13} fill="currentColor" /> One lesson at a time</div>
        </div>

        <div className="ih-visual-course">
          <div className="ih-visual-course-icon"><BookOpen size={17} /></div>
          <div className="ih-visual-course-copy">
            <span>{course ? course.category || "Your course" : "Your next step"}</span>
            <strong>{course?.title || "Choose a course to begin"}</strong>
          </div>
          <span className="ih-visual-check"><Check size={14} /></span>
        </div>
      </div>
    </div>
  );
}

export default function InstitutionHome() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { tenant: contextTenant } = useTenant();
  const [institution, setInstitution] = useState(null);
  const [institutionCourses, setInstitutionCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseQuery, setCourseQuery] = useState("");
  const [currentLiveClass, setCurrentLiveClass] = useState(null);
  const locallyEndedLiveClassId = useRef("");

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
        document.title = `${tenantData.name} — Student learning`;
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
        if (mounted) {
          const nextLiveClass = data?.liveClass || null;
          if (!nextLiveClass || nextLiveClass._id !== locallyEndedLiveClassId.current) {
            locallyEndedLiveClassId.current = "";
            setCurrentLiveClass(nextLiveClass);
          }
        }
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

  const handleLiveEnded = () => {
    locallyEndedLiveClassId.current = currentLiveClass?._id || "";
    setCurrentLiveClass(null);
  };

  const activeTenant = institution || contextTenant;
  const institutionName = activeTenant?.name || "Your Academy";
  const institutionType = activeTenant?.institutionType || "Academy";
  const accent = getBrandColor(activeTenant?.primaryColor);
  const accentText = getAccentText(accent);
  const tenantStyle = { "--ih-accent": accent, "--ih-accent-text": accentText };
  const resolvedSlug = activeTenant?.slug || slug;
  const coursePath = resolvedSlug ? `/institution/${encodeURIComponent(resolvedSlug)}/courses` : "/courses";
  const myCoursesPath = resolvedSlug ? `/institution/${encodeURIComponent(resolvedSlug)}/my-courses` : "/mycourses";

  const enrolledCourseIds = useMemo(() => new Set(
    (userData?.enrolledCourses || [])
      .map((item) => (typeof item === "object" ? item?._id : item))
      .filter(Boolean)
      .map(String),
  ), [userData?.enrolledCourses]);

  const enrolledCourses = institutionCourses.filter((course) => enrolledCourseIds.has(String(course._id)));
  const activeCourse = enrolledCourses[0] || null;
  const firstName = userData?.name?.trim().split(/\s+/)[0];
  const visibleCourses = useMemo(() => {
    const query = courseQuery.trim().toLowerCase();
    const courses = query
      ? institutionCourses.filter((course) => `${course.title || ""} ${course.category || ""} ${course.subTitle || ""}`.toLowerCase().includes(query))
      : institutionCourses;
    return courses.slice(0, 3);
  }, [courseQuery, institutionCourses]);

  return (
    <div className="institution-learning" style={tenantStyle}>
      <Navbar currentInstitution={activeTenant} />
      <main className="ih-main">
        {loading ? (
          <div className="ih-loading" aria-live="polite">
            <span className="ih-loading-mark"><BookOpen size={21} /></span>
            <span>Opening {institutionName}…</span>
          </div>
        ) : (
          <>
            <section className="ih-hero" aria-labelledby="ih-title">
              <div className="ih-hero-copy">
                <div className="ih-institution-lockup">
                  <span className="ih-institution-logo">
                    <img src={activeTenant?.logo || "/skillio.png"} alt="" onError={(event) => { event.currentTarget.src = "/skillio.png"; }} />
                  </span>
                  <span><small>{institutionType}</small><strong>{institutionName}</strong></span>
                </div>
                {firstName && <p className="ih-greeting">Welcome back, {firstName}</p>}
                <h1 id="ih-title">Courses at <span>{institutionName}</span></h1>
                <p className="ih-intro">{activeCourse
                  ? "Pick up where you left off, or choose a new lesson for your next study session."
                  : "Find a course, start with one lesson, and build your understanding at your own pace."}</p>
                <div className="ih-hero-actions">
                  <button className="ih-button ih-button-primary" type="button" onClick={() => activeCourse ? navigate(`/viewlecture/${activeCourse._id}`) : navigate(coursePath)}>
                    {activeCourse ? <><Play size={16} fill="currentColor" /> Continue learning</> : <>View course catalog <ArrowRight size={16} /></>}
                  </button>
                  {userData ? (
                    <button className="ih-button ih-button-secondary" type="button" onClick={() => navigate(myCoursesPath)}>My courses</button>
                  ) : (
                    <button className="ih-button ih-button-secondary" type="button" onClick={() => navigate("/login")}>Sign in</button>
                  )}
                </div>
                <div className="ih-hero-note"><Check size={15} /><span>Lessons and course materials in one learning space</span></div>
              </div>

              <StudyIllustration
                course={activeCourse || institutionCourses[0]}
                institutionName={institutionName}
                institutionLogo={activeTenant?.logo}
              />
            </section>

            {currentLiveClass && (
              <section className="ih-live-feature" aria-label="Institution live class">
                <div className="ih-live-video-orbit">
                  <div className="ih-live-video-frame">
                    <SecureVideoPlayer liveClassId={currentLiveClass._id} lectureTitle={currentLiveClass.title || "Live class"} onEnded={handleLiveEnded} />
                  </div>
                  <span className="ih-live-status"><CircleDot size={13} aria-hidden="true" /> LIVE NOW</span>
                </div>
                <div className="ih-live-feature-copy">
                  <span className="ih-live-kicker"><span /> LIVE FROM {institutionName}</span>
                  <h2>{currentLiveClass.title || "Live class"}</h2>
                  <p>{currentLiveClass.createdBy?.name ? `${currentLiveClass.createdBy.name} is live now.` : "Your educator is live now."}</p>
                  <button type="button" className="ih-button ih-live-join" onClick={() => navigate(`/institution/${encodeURIComponent(resolvedSlug)}/live`)}>Open live class <Play size={15} fill="currentColor" aria-hidden="true" /></button>
                </div>
              </section>
            )}

            {activeCourse && (
              <section className="ih-resume" aria-labelledby="ih-resume-title">
                <div className="ih-section-heading">
                  <div><p className="ih-eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2 id="ih-resume-title">Continue your course</h2></div>
                  <button className="ih-text-link" type="button" onClick={() => navigate(myCoursesPath)}>All my courses <ArrowRight size={15} /></button>
                </div>
                <button className="ih-resume-card" type="button" onClick={() => navigate(`/viewlecture/${activeCourse._id}`)}>
                  <span className="ih-resume-cover">
                    {activeCourse.thumbnail
                      ? <img src={optimizeImage(activeCourse.thumbnail, 420)} alt="" loading="lazy" />
                      : <span className="ih-resume-cover-art"><BookOpen size={30} /></span>}
                    <span className="ih-play-badge"><Play size={17} fill="currentColor" /></span>
                  </span>
                  <span className="ih-resume-info">
                    <small>{activeCourse.category || institutionName}</small>
                    <strong>{activeCourse.title}</strong>
                    <span>{activeCourse.subTitle || "Continue with your lessons and course materials."}</span>
                  </span>
                  <span className="ih-resume-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
                </button>
              </section>
            )}

            <section className="ih-catalog" aria-labelledby="ih-catalog-title">
              <div className="ih-section-heading ih-catalog-heading">
                <div><p className="ih-eyebrow">YOUR NEXT STUDY SESSION</p><h2 id="ih-catalog-title">Courses at {institutionName}</h2><p>Choose a subject and start with one lesson.</p></div>
                <label className="ih-search"><Search size={17} /><input value={courseQuery} onChange={(event) => setCourseQuery(event.target.value)} placeholder="Find a course" aria-label="Find a course" /></label>
              </div>

              {visibleCourses.length ? (
                <div className="ih-course-grid">
                  {visibleCourses.map((course) => (
                    <CourseCard
                      key={course._id}
                      id={course._id}
                      title={course.title}
                      thumbnail={course.thumbnail}
                      subTitle={course.subTitle}
                      category={course.category}
                      price={course.price}
                      reviews={course.reviews}
                      creator={course.creator}
                      enrolledStudents={course.enrolledStudents}
                    />
                  ))}
                </div>
              ) : (
                <div className="ih-empty-courses">
                  <span><Layers3 size={22} /></span>
                  <div><strong>{courseQuery ? "No matching courses" : `Courses from ${institutionName} will appear here`}</strong><p>{courseQuery ? "Try another course name or subject." : "Check back with your educator for the latest lessons and materials."}</p></div>
                </div>
              )}

              {institutionCourses.length > 3 && !courseQuery && (
                <button className="ih-button ih-button-secondary ih-view-all" type="button" onClick={() => navigate(coursePath)}>View all courses <ArrowRight size={16} /></button>
              )}
            </section>

            <section className="ih-study-support" aria-label="Study resources">
              <div className="ih-support-heading"><span><GraduationCap size={20} /></span><div><h2>Everything for your next lesson</h2><p>Move between teaching, reading, and review without leaving your course.</p></div></div>
              <div className="ih-support-items">
                <div><span><Play size={17} /></span><strong>Video lessons</strong><small>Learn from your course lectures</small></div>
                <div><span><FileText size={17} /></span><strong>Study materials</strong><small>Open notes and resources with a lesson</small></div>
                <div><span><BookOpen size={17} /></span><strong>Your course library</strong><small>Return to your learning at any time</small></div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
