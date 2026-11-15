import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Play,
  Search,
  GraduationCap,
  Radio,
  CheckCircle2,
  FileText,
  Sparkles,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import { optimizeImage } from "../utils/imageOptimizer";
import { setStoredTenantSlug } from "../services/tenantStorage";
import { getAccessibleTextColor, getInstitutionTheme } from "../utils/institutionTheme";
import NoteCover from "../components/notes/NoteCover";
import { canUseEducatorWorkspace } from "../auth/permissions";

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
        src={optimizeImage(course.thumbnail, size === "large" ? 480 : 320)}
        alt=""
        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${className}`}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] text-[#5b3cc4] font-extrabold text-xl ${className}`}>
      {initials}
    </div>
  );
}

export default function InstitutionHome() {
  const { slug } = useParams();
  const { userData } = useSelector((state) => state.user);
  const { tenant: contextTenant } = useTenant();
  const [institution, setInstitution] = useState(null);
  const [institutionCourses, setInstitutionCourses] = useState([]);
  const [institutionNotes, setInstitutionNotes] = useState([]);
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
      api.get("/api/notes/student"),
    ]).then(([tenantResult, coursesResult, notesResult]) => {
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

      if (notesResult.status === "fulfilled" && Array.isArray(notesResult.value.data?.notes)) {
        setInstitutionNotes(notesResult.value.data.notes);
      } else {
        setInstitutionNotes([]);
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
  const accentColor = theme.accent || theme.primary || "#5b3cc4";

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

  const isEducator = canUseEducatorWorkspace(userData);

  const enrolledInThisInstitution = useMemo(() => {
    return institutionCourses.filter((course) => enrolledCourseIds.has(String(course._id)));
  }, [institutionCourses, enrolledCourseIds]);

  // Notes purchased by the student in this institution
  const purchasedNotes = useMemo(() => {
    return institutionNotes.filter((note) => Boolean(note.isPurchased));
  }, [institutionNotes]);

  // Active enrolled course for "Continue learning" - strictly for students, never for educators/owners
  const activeCourse = !isEducator && enrolledInThisInstitution.length > 0 ? enrolledInThisInstitution[0] : null;

  // Time-aware personalized greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const studentFirstName = userData?.name
    ? userData.name.trim().split(/\s+/)[0]
    : isEducator
    ? "Educator"
    : "Student";

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
    <div className="min-h-screen bg-[#fafaf9] text-[#1c1917] flex flex-col font-sans" style={tenantStyle}>
      {/* Compact Navigation Bar */}
      <Navbar currentInstitution={activeTenant} studentHome={userData?.role === "student"} />

      <main className="max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-12 space-y-6 sm:space-y-8 flex-1" id="ih-main">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-[#78716c]" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 border-2 border-[#5b3cc4] border-t-transparent rounded-full animate-spin" />
              <span>Loading {institutionName}…</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* 1. Welcoming Hero Banner */}
            <section className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white via-[#fcfbf9] to-[#f8f7f4] border border-[#e8e5dc] p-4 sm:p-6 lg:p-8 shadow-xs overflow-hidden">
              <div className="relative z-10 space-y-2.5 sm:space-y-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#f5f3ff] border border-[#e0e7ff] text-[#5b3cc4] text-[11px] sm:text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{activeTenant?.institutionType || "Academy"} • {institutionName}</span>
                </div>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-[#1c1917] tracking-tight">
                  {timeGreeting}, {studentFirstName}
                </h1>
                <p className="text-xs sm:text-base text-[#57534e] max-w-2xl leading-relaxed">
                  {activeTenant?.title || `Welcome to ${institutionName}. Explore curriculum, study notes, and master new concepts.`}
                </p>
              </div>
            </section>

            {/* 2. Quick Action Controls for Students (Tactile & Mobile-First) */}
            <section className="space-y-2.5" aria-label="Student Quick Actions">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#78716c]">
                  Quick Actions
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
                {/* 1. Your Courses */}
                <Link
                  to={userData ? `/institution/${encodeURIComponent(resolvedSlug)}/my-courses` : "/login"}
                  className="group bg-white border border-[#e8e5dc] hover:border-[#5b3cc4] p-3 sm:p-4 rounded-2xl flex flex-col justify-between h-24 sm:h-28 shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] select-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-[#f5f3ff] text-[#5b3cc4] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <GraduationCap size={16} />
                    </div>
                    {enrolledInThisInstitution.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {enrolledInThisInstitution.length} enrolled
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#1c1917] group-hover:text-[#5b3cc4] transition truncate">
                      Your Courses
                    </p>
                    <p className="text-[10px] text-[#78716c] truncate">
                      {enrolledInThisInstitution.length > 0
                        ? "Continue learning"
                        : "Enrolled curriculum"}
                    </p>
                  </div>
                </Link>

                {/* 2. Paid Notes */}
                <Link
                  to={`/institution/${encodeURIComponent(resolvedSlug)}/notes?filter=purchased`}
                  className="group bg-white border border-[#e8e5dc] hover:border-emerald-500 p-3 sm:p-4 rounded-2xl flex flex-col justify-between h-24 sm:h-28 shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] select-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f8f7f4] text-[#78716c] border border-[#e8e5dc]">
                      {purchasedNotes.length} unlocked
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#1c1917] group-hover:text-emerald-700 transition truncate">
                      Paid Notes
                    </p>
                    <p className="text-[10px] text-[#78716c] truncate">
                      {purchasedNotes.length > 0 ? "Ready to read" : "Unlocked material"}
                    </p>
                  </div>
                </Link>

                {/* 3. Institution Notes */}
                <Link
                  to={`/institution/${encodeURIComponent(resolvedSlug)}/notes`}
                  className="group bg-white border border-[#e8e5dc] hover:border-[#5b3cc4] p-3 sm:p-4 rounded-2xl flex flex-col justify-between h-24 sm:h-28 shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] select-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FileText size={16} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f8f7f4] text-[#78716c] border border-[#e8e5dc]">
                      {institutionNotes.length}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#1c1917] group-hover:text-[#5b3cc4] transition truncate">
                      Institution Notes
                    </p>
                    <p className="text-[10px] text-[#78716c] truncate">
                      All study materials
                    </p>
                  </div>
                </Link>

                {/* 4. Live Classes */}
                <Link
                  to={`/institution/${encodeURIComponent(resolvedSlug)}/live`}
                  className={`group bg-white border p-3 sm:p-4 rounded-2xl flex flex-col justify-between h-24 sm:h-28 shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] select-none ${
                    currentLiveClass
                      ? "border-rose-300 hover:border-rose-500 bg-rose-50/20"
                      : "border-[#e8e5dc] hover:border-[#1e3a8a]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                        currentLiveClass
                          ? "bg-rose-100 text-rose-700"
                          : "bg-blue-50 text-[#1e3a8a]"
                      }`}
                    >
                      <Radio size={16} className={currentLiveClass ? "animate-pulse" : ""} />
                    </div>
                    {currentLiveClass ? (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#a8a29e]">Live</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#1c1917] group-hover:text-[#1e3a8a] transition truncate">
                      Live Classes
                    </p>
                    <p className="text-[10px] text-[#78716c] truncate">
                      {currentLiveClass ? "Broadcasting live" : "Classroom stream"}
                    </p>
                  </div>
                </Link>
              </div>
            </section>

            {/* 3. Optional Live Broadcast Alert */}
            {currentLiveClass && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-rose-50/60 to-white border border-rose-200 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Live Broadcast</span>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1c1917] truncate">{currentLiveClass.title}</h4>
                  </div>
                </div>
                <Link
                  to={`/institution/${encodeURIComponent(resolvedSlug)}/live`}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-2xs w-full sm:w-auto shrink-0 cursor-pointer"
                >
                  <Radio size={13} className="animate-pulse" />
                  <span>Watch Live</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}

            {/* 4. Continue Learning Section (Compact Udemy-style mobile card) */}
            {!isEducator && activeCourse && (
              <section className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#78716c]">
                    Continue Learning
                  </h2>
                  <Link
                    to={userData ? `/institution/${encodeURIComponent(resolvedSlug)}/my-courses` : "/login"}
                    className="text-xs font-bold text-[#5b3cc4] hover:underline"
                  >
                    My Courses →
                  </Link>
                </div>

                <Link
                  to={`/viewlecture/${activeCourse._id}`}
                  className="group bg-white border border-[#e8e5dc] hover:border-[#5b3cc4] rounded-2xl p-2.5 sm:p-4 flex items-center gap-3 sm:gap-4 shadow-2xs hover:shadow-xs transition-all active:scale-[0.99] select-none"
                >
                  {/* Compact Thumbnail (Udemy style) */}
                  <div className="relative w-24 sm:w-40 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0 group">
                    <CourseThumbnail course={activeCourse} />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/95 text-[#5b3cc4] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Play size={12} className="fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Course Info */}
                  <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#5b3cc4] block truncate">
                      {activeCourse.category || "In Progress"}
                    </span>
                    <h3 className="text-xs sm:text-base font-bold text-[#1c1917] line-clamp-1 sm:line-clamp-2 group-hover:text-[#5b3cc4] transition">
                      {activeCourse.title}
                    </h3>
                    <p className="text-[11px] text-[#78716c] truncate">
                      {Array.isArray(activeCourse.lectures) && activeCourse.lectures.length > 0
                        ? `${activeCourse.lectures.length} lessons available`
                        : "Curriculum ready"}
                    </p>
                  </div>

                  {/* Compact Tactical CTA */}
                  <div className="shrink-0 pl-1">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5b3cc4] group-hover:bg-[#4a2eb0] text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-2xs transition">
                      <span className="hidden xs:inline sm:inline">Resume</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </Link>
              </section>
            )}

            {/* 5A. Your Paid Notes Section (shown when student has unlocked notes) */}
            {purchasedNotes.length > 0 && (
              <section className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-xl font-bold text-[#1c1917]">Your Paid Notes</h2>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200">
                      {purchasedNotes.length} unlocked
                    </span>
                  </div>
                  <Link
                    to={`/institution/${encodeURIComponent(resolvedSlug)}/notes?filter=purchased`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    <span>View all</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="flex overflow-x-auto sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pb-2 pt-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {purchasedNotes.slice(0, 6).map((note) => (
                    <Link
                      key={note._id}
                      to={`/institution/${encodeURIComponent(resolvedSlug)}/notes/${note._id}/read`}
                      className="w-[175px] sm:w-auto shrink-0 snap-start group bg-white border border-[#e8e5dc] hover:border-emerald-600 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 h-[225px] sm:h-full select-none"
                    >
                      <div className="w-full aspect-[16/10] rounded-xl overflow-hidden mb-2 sm:mb-2.5 bg-[#f8f7f4] shrink-0">
                        <NoteCover
                          thumbnail={note.thumbnail}
                          title={note.title}
                          topic={note.topic}
                          pageCount={note.pageCount}
                          accentColor="#059669"
                          className="w-full h-full object-cover group-hover:scale-103 transition duration-200"
                        />
                      </div>
                      <div className="space-y-1 sm:space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block truncate">
                            {note.topic || "General"}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-[#1c1917] line-clamp-2 group-hover:text-emerald-700 transition leading-snug mt-0.5">
                            {note.title}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-[#f2efe9]">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] sm:text-xs">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>Purchased</span>
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                            Read →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 5B. Institution Notes Section (all institution notes) */}
            {institutionNotes.length > 0 && (
              <section className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-xl font-bold text-[#1c1917]">Institution Notes</h2>
                    <span className="px-2 py-0.5 bg-[#f5f3ff] text-[#5b3cc4] text-[11px] font-bold rounded-full border border-[#ede9fe]">
                      {institutionNotes.length}
                    </span>
                  </div>
                  <Link
                    to={`/institution/${encodeURIComponent(resolvedSlug)}/notes`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#5b3cc4] hover:underline"
                  >
                    <span>View all</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="flex overflow-x-auto sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pb-2 pt-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {institutionNotes.slice(0, 6).map((note) => (
                    <Link
                      key={note._id}
                      to={
                        note.isPurchased
                          ? `/institution/${encodeURIComponent(resolvedSlug)}/notes/${note._id}/read`
                          : `/institution/${encodeURIComponent(resolvedSlug)}/notes/${note._id}`
                      }
                      className="w-[175px] sm:w-auto shrink-0 snap-start group bg-white border border-[#e8e5dc] hover:border-[#5b3cc4] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 h-[225px] sm:h-full select-none"
                    >
                      <div className="w-full aspect-[16/10] rounded-xl overflow-hidden mb-2 sm:mb-2.5 bg-[#f8f7f4] shrink-0">
                        <NoteCover
                          thumbnail={note.thumbnail}
                          title={note.title}
                          topic={note.topic}
                          pageCount={note.pageCount}
                          accentColor={accentColor}
                          className="w-full h-full object-cover group-hover:scale-103 transition duration-200"
                        />
                      </div>
                      <div className="space-y-1 sm:space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5b3cc4] block truncate">
                            {note.topic || "General"}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-[#1c1917] line-clamp-2 group-hover:text-[#5b3cc4] transition leading-snug mt-0.5">
                            {note.title}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-[#f2efe9]">
                          <span className="text-xs font-extrabold text-[#1c1917]">
                            {note.isPurchased ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] sm:text-xs">
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                <span>Purchased</span>
                              </span>
                            ) : note.accessType === "free" ? (
                              <span className="text-emerald-700 font-bold text-[11px] sm:text-xs">Free</span>
                            ) : (
                              `₹${note.price}`
                            )}
                          </span>
                          {note.pageCount ? (
                            <span className="text-[10px] font-medium text-[#78716c]">
                              {note.pageCount} {note.pageCount === 1 ? "page" : "pages"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Course Catalog Section */}
            <section className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-xl font-bold text-[#1c1917]">Courses</h2>
                  <span className="px-2 py-0.5 bg-[#f5f3ff] text-[#5b3cc4] text-[11px] font-bold rounded-full border border-[#ede9fe]">
                    {institutionCourses.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  {institutionCourses.length > 2 && (
                    <div className="relative flex-1 sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" />
                      <input
                        type="text"
                        value={courseQuery}
                        onChange={(e) => setCourseQuery(e.target.value)}
                        placeholder="Search courses…"
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e8e5dc] rounded-xl focus:outline-none focus:border-[#5b3cc4] text-[#1c1917]"
                      />
                    </div>
                  )}
                  {institutionCourses.length > 6 && !courseQuery && (
                    <Link
                      to={courseCatalogPath}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#5b3cc4] hover:underline shrink-0"
                    >
                      <span>View all</span>
                      <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>

              {visibleCourses.length > 0 ? (
                <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 pb-2 pt-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {visibleCourses.map((course) => {
                    const isEnrolled = enrolledCourseIds.has(String(course._id));
                    const lectureCount = Array.isArray(course.lectures) ? course.lectures.length : 0;

                    return (
                      <Link
                        key={course._id}
                        to={`/institution/${encodeURIComponent(resolvedSlug)}/course/${course._id}`}
                        className="w-[280px] sm:w-auto shrink-0 snap-start group bg-white border border-[#e8e5dc] hover:border-[#5b3cc4] rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md transition duration-200 select-none"
                      >
                        <div className="aspect-video w-full overflow-hidden bg-slate-900 relative shrink-0">
                          <CourseThumbnail course={course} />
                          {isEnrolled && (
                            <span className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg shadow-sm">
                              Enrolled
                            </span>
                          )}
                        </div>

                        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#5b3cc4]">
                              <span>{course.category || "General"}</span>
                              {course.level && <span className="text-[#78716c]">{course.level}</span>}
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-[#1c1917] line-clamp-2 group-hover:text-[#5b3cc4] transition">
                              {course.title}
                            </h3>
                            {course.subTitle && (
                              <p className="text-xs text-[#78716c] line-clamp-1">{course.subTitle}</p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[#f5f5f4] flex items-center justify-between text-xs">
                            <span className="text-[#78716c]">
                              {lectureCount} {lectureCount === 1 ? "lesson" : "lessons"}
                            </span>
                            <span className="font-extrabold text-[#1c1917]">
                              {isEnrolled ? (
                                <span className="text-emerald-700">Enrolled</span>
                              ) : course.price === 0 || !course.price ? (
                                <span className="text-emerald-700">Free</span>
                              ) : (
                                `₹${Number(course.price).toLocaleString("en-IN")}`
                              )}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-dashed border-[#d6d3c9] rounded-2xl p-6 sm:p-8 text-center space-y-2">
                  <GraduationCap size={28} className="mx-auto text-[#a8a29e]" />
                  <h4 className="text-sm font-bold text-[#1c1917]">No courses found</h4>
                  <p className="text-xs text-[#78716c]">Check back soon for new curriculum from this institution.</p>
                </div>
              )}

            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
