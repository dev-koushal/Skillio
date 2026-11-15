import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import {
  Users,
  BookOpen,
  IndianRupee,
  GraduationCap,
  PlusCircle,
  LayoutDashboard,
  Building2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  Play,
  FileText,
  Radio,
  Eye,
  SquarePen,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import AIAssistantButton from "../../components/AIAssistantButton";
import { useTenant } from "../../context/TenantContext";
import { optimizeImage } from "../../utils/imageOptimizer";
import api from "../../services/api";

import RequireInstitutionModal from "../../components/common/RequireInstitutionModal";
import { hasEducatorInstitution } from "../../auth/permissions";
import "./EducatorHome.css";

export default function EducatorHome() {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { tenant } = useTenant();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  const [requireInstitutionModalOpen, setRequireInstitutionModalOpen] = useState(false);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const educatorName = userData?.name ? userData.name.split(" ")[0] : "Educator";
  const tenantName = tenant?.name || overview?.institution?.name || "Your Academy";
  const educatorAccent = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(tenant?.primaryColor || "")
    ? tenant.primaryColor
    : "#5b3cc4";

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    api
      .get("/api/institutions/me/overview")
      .then(({ data }) => {
        if (mounted && data?.success) {
          setOverview(data);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.warn("[EducatorHome] Could not load overview, fallback to local state:", err.message);
          setError(err.message);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = overview?.stats || {
    totalStudents: 0,
    activeStudents: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalRevenue: 0,
  };

  const recentCourses = overview?.recentCourses || [];
  const recentStudents = overview?.recentStudents || [];
  const recentActivity = overview?.recentActivity || [];
  const trend = overview?.trend || [];

  return (
    <div className="institution-educator-home min-h-screen text-[#1c1917] flex flex-col font-sans pb-20 md:pb-0" style={{ "--educator-accent": educatorAccent }}>
      {/* 1. Global Navigation Bar */}
      <Navbar currentInstitution={tenant} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 flex-1 ">
        {/* ============================================================== */}
        {/* 2. WELCOMING HERO & GREETING SECTION                            */}
        {/* ============================================================== */}
        <section className="relative rounded-3xl bg-gradient-to-br from-white via-[#fcfbf9] to-[#f8f7f4] border border-[#e8e5dc] p-2 sm:p-8 lg:p-10 shadow-sm overflow-hidden">
          {/* Subtle Technical Grid Background */}
          <div className="absolute inset-0 opacity-40 pointer-events-none overflow-hidden rounded-3xl">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="educator-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#e8e5dc" strokeWidth="0.75" strokeDasharray="3 3" />
                  <circle cx="32" cy="32" r="1" fill="#1e3a8a" opacity="0.25" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#educator-grid)" />
            </svg>
          </div>

          {/* Soft Radial Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Greeting, Institution Indicator & Pitch */}
            <div className="lg:col-span-7 space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{tenantName} • Educator Home</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1c1917] leading-tight">
                {getGreeting()}, {educatorName}
              </h1>

              <p className="text-sm sm:text-base text-[#57534e] max-w-xl leading-relaxed">
                {tenantName} is active and operating. Here is your institution's live performance, recent learner activity, and quick curriculum controls at a glance.
              </p>

              {/* Quick Action Navigation Buttons */}
              <div className="pt-2 flex flex-wrap gap-2.5 items-center">


                <button
                  onClick={() => navigate("/students")}
                  className="inline-flex items-center gap-2 bg-white hover:bg-[#f8f7f4] border border-[#d6d3c9] text-[#1c1917] font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition active:scale-98 cursor-pointer touch-target pressable shadow-2xs"
                >
                  <Users size={16} className="text-[#1e3a8a]" />
                  <span>Manage Students</span>
                </button>

                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 bg-[#eff6ff] hover:bg-blue-100/70 border border-[#bfdbfe] text-[#1e3a8a] font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition active:scale-98 cursor-pointer touch-target pressable"
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </button>
              </div>
            </div>

            {/* Right Column: Visual Tactile Educator Composition (Anti-Slop Editorial Motif) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[360px] bg-white/95 backdrop-blur-md rounded-2xl border border-[#e8e5dc] p-4 sm:p-5 shadow-lg space-y-3.5">
                {/* Visual Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#f2efe9]">
                  <div className="flex items-center gap-2.5">
                    <div className="educator-home-mark w-8 h-8 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      {tenant?.logo ? <img className="educator-home-logo" src={tenant.logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : tenantName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1c1917] truncate">{tenantName}</p>
                      <p className="text-[10px] text-[#78716c] font-medium">Learning institution</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 size={11} className="text-emerald-600" />
                    Operational
                  </span>
                </div>

                {/* Simulated Quick Focus Pill */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] text-white space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-blue-200 font-mono">
                    <span>Active Curriculum</span>
                    <span>{stats.publishedCourses} Live Courses</span>
                  </div>
                  <p className="font-bold text-xs sm:text-sm truncate text-white">
                    {recentCourses[0]?.title || "Verified Course Tracks"}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-white/80 pt-1 border-t border-white/10">
                    <span>Total Enrollment</span>
                    <span className="font-bold font-mono text-amber-300">{stats.totalStudents} Learners</span>
                  </div>
                </div>

                {/* Supporting Trust & Security Badge */}
                <div className="flex items-center justify-between text-[11px] text-[#78716c] pt-0.5">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    Strict Tenant Isolation
                  </span>
                  <span className="font-mono font-bold text-[#1e3a8a]">
                    ₹{stats.totalRevenue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. QUICK ENTRY CONTROLS (FULL WIDTH, 6 EQUAL CARDS)            */}
        {/* ============================================================== */}
        <section className="space-y-3 w-full">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#78716c]">
            Quick Entry Controls
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 w-full">
            <button
              onClick={() => {
                if (!hasEducatorInstitution(userData, tenant)) {
                  setRequireInstitutionModalOpen(true);
                  return;
                }
                navigate("/builder/new");
              }}
              className="bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 p-4 rounded-2xl text-left flex flex-col justify-between h-28 w-full card-lift transition-all cursor-pointer pressable"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
                <PlusCircle size={16} />
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-[#1c1917] truncate">New Course</p>
                <p className="text-[10px] text-[#78716c] truncate">Course Builder</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/educator/notes")}
              className="bg-white border border-[#e8e5dc] hover:border-[#5b3cc4]/40 p-4 rounded-2xl text-left flex flex-col justify-between h-28 w-full card-lift transition-all cursor-pointer pressable"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5b3cc4] flex items-center justify-center">
                <FileText size={16} />
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-[#1c1917] truncate">Notes</p>
                <p className="text-[10px] text-[#78716c] truncate">Study Material</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/students")}
              className="bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 p-4 rounded-2xl text-left flex flex-col justify-between h-28 w-full card-lift transition-all cursor-pointer pressable"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <UserPlus size={16} />
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-[#1c1917] truncate">Students</p>
                <p className="text-[10px] text-[#78716c] truncate">Manage & Invite</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 p-4 rounded-2xl text-left flex flex-col justify-between h-28 w-full card-lift transition-all cursor-pointer pressable"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <LayoutDashboard size={16} />
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-[#1c1917] truncate">Dashboard</p>
                <p className="text-[10px] text-[#78716c] truncate">Full Operations</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/create-institution")}
              className="bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 p-4 rounded-2xl text-left flex flex-col justify-between h-28 w-full card-lift transition-all cursor-pointer pressable"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Building2 size={16} />
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-[#1c1917] truncate">Institution</p>
                <p className="text-[10px] text-[#78716c] truncate">Brand Settings</p>
              </div>
            </button>

            <button
              onClick={() => {
                const targetSlug = tenant?.slug;
                if (targetSlug && targetSlug !== "platform" && targetSlug !== "default") {
                  navigate(`/institution/${encodeURIComponent(targetSlug)}/live`);
                } else {
                  navigate("/dashboard");
                }
              }}
              className="bg-white border border-[#e8e5dc] hover:border-rose-500/40 p-4 rounded-2xl text-left flex flex-col justify-between h-28 w-full card-lift transition-all cursor-pointer pressable"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Radio size={16} />
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-[#1c1917] truncate">Live Classes</p>
                <p className="text-[10px] text-[#78716c] truncate">Schedule & manage</p>
              </div>
            </button>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. QUICK GLANCE STATS (4 HIGH-LEVEL METRICS)                   */}
        {/* ============================================================== */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#78716c]">
              Institution Overview
            </h2>
            <Link
              to="/dashboard"
              className="text-xs font-bold text-[#1e3a8a] hover:underline flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* 1. Total Students */}
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#1e3a8a]/40 card-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#78716c]">Total Students</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                {loading ? (
                  <div className="h-7 w-16 bg-[#f2efe9] animate-pulse rounded-md" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                      {stats.totalStudents}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Enrolled
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-[#78716c] mt-1 truncate">
                  Learners across your academy
                </p>
              </div>
            </div>

            {/* 2. Active Students */}
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#1e3a8a]/40 card-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#78716c]">Active Learners</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <GraduationCap size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                {loading ? (
                  <div className="h-7 w-16 bg-[#f2efe9] animate-pulse rounded-md" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                      {stats.activeStudents}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-[#78716c] mt-1 truncate">
                  With verified course access
                </p>
              </div>
            </div>

            {/* 3. Courses */}
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#1e3a8a]/40 card-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#78716c]">Courses</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                {loading ? (
                  <div className="h-7 w-16 bg-[#f2efe9] animate-pulse rounded-md" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                      {stats.totalCourses}
                    </span>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {stats.publishedCourses} Published
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-[#78716c] mt-1 truncate">
                  Published and draft courses
                </p>
              </div>
            </div>

            {/* 4. Revenue */}
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#1e3a8a]/40 card-lift transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#78716c]">Total Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <IndianRupee size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                {loading ? (
                  <div className="h-7 w-20 bg-[#f2efe9] animate-pulse rounded-md" />
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                      ₹{stats.totalRevenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-[#78716c] mt-1 truncate">
                  From paid student enrollments
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. MAIN TWO-COLUMN CONTENT GRID                                */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ============================================================ */}
          {/* LEFT COLUMN: Your Courses & Recent Activity (Col-span-7)     */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 space-y-6">
            {/* 4A. Course Glimpse */}
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold text-[#1c1917] tracking-tight">
                      Your Courses
                    </h2>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#f4f2ec] text-[#57534e]">
                      {recentCourses.length}
                    </span>
                  </div>
                  <p className="text-xs text-[#78716c] mt-0.5">
                    Click any course to preview as student or edit in builder
                  </p>
                </div>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1e3a8a] hover:underline"
                >
                  <span>View All</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((n) => (
                    <div key={n} className="h-24 bg-[#f8f7f4] rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : recentCourses.length > 0 ? (
                <div className="space-y-3">
                  {recentCourses.map((course) => {
                    const targetSlug = tenant?.slug;
                    const previewUrl = targetSlug && targetSlug !== "platform" && targetSlug !== "default"
                      ? `/institution/${encodeURIComponent(targetSlug)}/course/${course._id}`
                      : `/viewcourse/${course._id}`;

                    return (
                      <div
                        key={course._id}
                        onClick={() => navigate(previewUrl)}
                        className="group bg-[#fcfbf9] hover:bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer card-lift transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Course Thumbnail */}
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#f1ede4] shrink-0 border border-[#e8e5dc] relative shadow-2xs">
                            {course.thumbnail ? (
                              <img
                                src={optimizeImage(course.thumbnail, 160)}
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#0f172a] to-[#1e3a8a] flex items-center justify-center text-white">
                                <BookOpen size={20} className="text-amber-300" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  course.isPublished
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {course.isPublished ? "Live" : "Draft"}
                              </span>
                              {course.category && (
                                <span className="text-[10px] text-[#78716c] truncate">
                                  • {course.category}
                                </span>
                              )}
                            </div>

                            <h3 className="font-extrabold text-sm sm:text-base text-[#1c1917] truncate mt-1 group-hover:text-[#1e3a8a] transition-colors">
                              {course.title}
                            </h3>

                            <div className="flex items-center gap-2.5 text-xs text-[#78716c] mt-1">
                              <span className="flex items-center gap-1 font-medium">
                                <Users size={12} className="text-[#1e3a8a]" />
                                <span>{course.studentCount || 0} Students</span>
                              </span>
                              <span>•</span>
                              <span className="font-mono font-bold text-[#1c1917]">
                                {course.price ? `₹${course.price}` : "Free"}
                              </span>
                              <span>•</span>
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                Enrolled (Creator)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f2efe9] justify-end shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(previewUrl);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-[#f5f4f0] text-[#1c1917] text-xs font-bold transition border border-[#d6d3c9] cursor-pointer pressable shadow-2xs"
                            title="Preview Course as Student"
                          >
                            <Eye size={13} className="text-[#1e3a8a]" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/builder/${course._id}`);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#eff6ff] hover:bg-blue-100 text-[#1e3a8a] text-xs font-bold transition border border-[#bfdbfe] cursor-pointer pressable shadow-2xs"
                            title="Edit Course in Builder"
                          >
                            <SquarePen size={13} />
                            <span>Builder</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#fcfbf9] border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center mx-auto">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1c1917]">No courses created yet</h3>
                    <p className="text-xs text-[#78716c] max-w-sm mx-auto mt-1">
                      Start building your curriculum with video lectures, chapters, and resources.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/builder/new")}
                    className="inline-flex items-center gap-1.5 bg-[#1e3a8a] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer pressable"
                  >
                    <PlusCircle size={14} />
                    <span>Create Your First Course</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4B. Recent Activity */}
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#1c1917]">
                    Recent Activity
                  </h3>
                  <p className="text-[11px] text-[#78716c]">
                    Chronological actions inside your institution
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-violet-50 text-violet-700">
                  <Activity size={16} />
                </div>
              </div>

              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-10 bg-[#f8f7f4] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3 relative pl-2">
                  <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-[#f0ede6]" />

                  {recentActivity.map((act) => {
                    const isPublished = act.title?.toLowerCase().includes("published");
                    const isEnrolled = act.title?.toLowerCase().includes("enrolled");
                    const isJoined = act.title?.toLowerCase().includes("joined");

                    return (
                      <div key={act.id} className="relative flex items-start gap-3 text-xs group">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border ${
                            isPublished
                              ? "bg-blue-50 border-blue-200 text-[#1e3a8a]"
                              : isEnrolled
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : isJoined
                              ? "bg-purple-50 border-purple-200 text-purple-700"
                              : "bg-amber-50 border-amber-200 text-amber-700"
                          }`}
                        >
                          {isPublished ? (
                            <Sparkles size={11} />
                          ) : isEnrolled ? (
                            <GraduationCap size={11} />
                          ) : isJoined ? (
                            <UserPlus size={11} />
                          ) : (
                            <Activity size={11} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 bg-[#fcfbf9] group-hover:bg-[#f8f7f4] p-2.5 rounded-xl border border-[#f0ede6] transition">
                          <p className="text-[#1c1917] font-semibold leading-snug line-clamp-2">
                            {act.title}
                          </p>
                          <p className="text-[10px] text-[#78716c] mt-1 font-mono">
                            {act.timestamp
                              ? new Date(act.timestamp).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Recent"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-[#78716c]">
                  No recent activities recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: Enrollment Trend & Recent Students (Col 5)    */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 space-y-6">
            {/* 5A. Performance Glimpse (Compact 6-Month Trend Chart) */}
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#1c1917]">
                    Enrollment Trend
                  </h3>
                  <p className="text-[11px] text-[#78716c]">
                    New student grants & enrollments (Last 6 months)
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-blue-50 text-[#1e3a8a]">
                  <TrendingUp size={16} />
                </div>
              </div>

              {/* KPI highlight row */}
              <div className="flex items-center justify-between bg-[#fcfbf9] border border-[#f0ede6] rounded-xl px-3.5 py-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716c]">Total Active Cohort</span>
                  <p className="font-extrabold text-base text-[#1c1917]">{stats.totalStudents} Learners</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </div>

              {/* Lightweight CSS Bar Visualization */}
              <div className="pt-2">
                <div className="h-28 flex items-end justify-between gap-2 px-1 pb-2 border-b border-[#f2efe9]">
                  {trend.map((point, idx) => {
                    const maxVal = Math.max(...trend.map((t) => t.students), 5);
                    const heightPct = Math.max(14, Math.round((point.students / maxVal) * 100));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group cursor-default">
                        <span className="text-[9px] font-mono font-bold text-[#1e3a8a] opacity-0 group-hover:opacity-100 transition-opacity">
                          {point.students}
                        </span>
                        <div className="w-full max-w-[32px] bg-[#f4f2ec] rounded-t-lg transition-colors relative flex items-end justify-center h-full p-0.5">
                          <div
                            className="w-full bg-[#1e3a8a] rounded-t-md transition-all duration-300 opacity-85 group-hover:opacity-100 group-hover:bg-[#172554]"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-[#78716c] truncate">
                          {point.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[#78716c] text-[11px]">
                  Database-verified analytics
                </span>
                <Link
                  to="/dashboard"
                  className="font-bold text-[#1e3a8a] hover:underline flex items-center gap-1"
                >
                  <span>Detailed Analytics</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* 5B. Recent Students Glimpse */}
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#1c1917]">
                    Recent Students
                  </h3>
                  <p className="text-[11px] text-[#78716c]">
                    Latest learners enrolled in your institution
                  </p>
                </div>
                <Link
                  to="/students"
                  className="text-xs font-bold text-[#1e3a8a] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-12 bg-[#f8f7f4] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentStudents.length > 0 ? (
                <div className="space-y-2.5">
                  {recentStudents.map((student) => (
                    <div
                      key={student._id}
                      onClick={() => navigate(`/students?search=${encodeURIComponent(student.name || "")}`)}
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-[#fcfbf9] hover:bg-white border border-[#f0ede6] hover:border-[#1e3a8a]/30 transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-white shadow-xs">
                          {student.profilePicture ? (
                            <img
                              src={student.profilePicture}
                              alt={student.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            student.name?.charAt(0)?.toUpperCase() || "S"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-[#1c1917] truncate group-hover:text-[#1e3a8a] transition-colors">
                            {student.name}
                          </p>
                          <p className="text-[10px] text-[#78716c] truncate flex items-center gap-1">
                            <span>{student.courseName || "Enrolled Learner"}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Enrolled
                        </span>
                        <ChevronRight size={14} className="text-[#a8a29e] group-hover:text-[#1e3a8a] group-hover:translate-x-0.5 transition shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-[#78716c]">
                  No students have joined this institution yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Blocking Dialog for Course Creation without an Institution */}
      <RequireInstitutionModal
        isOpen={requireInstitutionModalOpen}
        onClose={() => setRequireInstitutionModalOpen(false)}
      />

      {/* Floating AI Copilot for Educator (Aware of Educator Home) */}
      <AIAssistantButton />

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

