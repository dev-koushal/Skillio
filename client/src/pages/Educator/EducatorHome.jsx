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
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import AIAssistantButton from "../../components/AIAssistantButton";
import { useTenant } from "../../context/TenantContext";
import { optimizeImage } from "../../utils/imageOptimizer";
import api from "../../services/api";
import EducatorLiveClassPanel from "../../components/video/EducatorLiveClassPanel";
import "./EducatorHome.css";

export default function EducatorHome() {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { tenant } = useTenant();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

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

        <EducatorLiveClassPanel />

        {/* ============================================================== */}
        {/* 3. QUICK GLANCE STATS (4 HIGH-LEVEL METRICS)                   */}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ============================================================ */}
          {/* LEFT COLUMN: Course Glimpse & Quick Actions (Col-span-7)     */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 space-y-8">
            {/* 4A. Course Glimpse (Max 3-4 Courses) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#1c1917] tracking-tight">
                    Your Courses
                  </h2>
                  <p className="text-xs text-[#78716c]">
                    Quick glimpse of your active institution curriculum
                  </p>
                </div>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] hover:underline cursor-pointer"
                >
                  <span>View All Courses</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-20 bg-white border border-[#e8e5dc] rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : recentCourses.length > 0 ? (
                <div className="space-y-3">
                  {recentCourses.map((course) => (
                    <div
                      key={course._id}
                      onClick={() => navigate(`/builder/${course._id}`)}
                      className="group bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-4 cursor-pointer card-lift transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Course Thumbnail */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#f1ede4] shrink-0 border border-[#e8e5dc] relative">
                          {course.thumbnail ? (
                            <img
                              src={optimizeImage(course.thumbnail, 160)}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#0f172a] to-[#1e3a8a] flex items-center justify-center text-white">
                              <BookOpen size={18} className="text-amber-300" />
                            </div>
                          )}
                        </div>

                        {/* Title & Stats */}
                        <div className="min-w-0">
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
                              <span className="text-[10px] text-[#78716c] hidden sm:inline">
                                • {course.category}
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-sm sm:text-base text-[#1c1917] truncate mt-0.5 group-hover:text-[#1e3a8a] transition-colors">
                            {course.title}
                          </h3>

                          <div className="flex items-center gap-3 text-xs text-[#78716c] mt-0.5">
                            <span className="flex items-center gap-1">
                              <Users size={12} className="text-[#1e3a8a]" />
                              <span>{course.studentCount} Students</span>
                            </span>
                            <span>•</span>
                            <span className="font-mono font-bold text-[#1c1917]">
                              {course.price ? `₹${course.price}` : "Free"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight size={18} className="text-[#78716c] group-hover:text-[#1e3a8a] group-hover:translate-x-0.5 transition shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 text-center space-y-3">
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

            {/* 4B. Quick Administrative Entry Actions */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#78716c]">
                Quick Entry Controls
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => navigate("/builder/new")}
                  className="bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 p-4 rounded-2xl text-left flex flex-col justify-between h-28 card-lift transition cursor-pointer pressable"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
                    <PlusCircle size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#1c1917]">New Course</p>
                    <p className="text-[10px] text-[#78716c]">Course Builder</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/students")}
                  className="bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 p-4 rounded-2xl text-left flex flex-col justify-between h-28 card-lift transition cursor-pointer pressable"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#1c1917]">Students</p>
                    <p className="text-[10px] text-[#78716c]">Manage & Invite</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/dashboard")}
                  className="bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 p-4 rounded-2xl text-left flex flex-col justify-between h-28 card-lift transition cursor-pointer pressable"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <LayoutDashboard size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#1c1917]">Dashboard</p>
                    <p className="text-[10px] text-[#78716c]">Full Operations</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/create-institution")}
                  className="bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 p-4 rounded-2xl text-left flex flex-col justify-between h-28 card-lift transition cursor-pointer pressable"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#1c1917]">Institution</p>
                    <p className="text-[10px] text-[#78716c]">Brand Settings</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: Recent Students, Activity & Small Trend (Col 5)*/}
          {/* ============================================================ */}
          <div className="lg:col-span-5 space-y-8">
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

              {/* Lightweight CSS Bar Visualization */}
              <div className="pt-2">
                <div className="h-28 flex items-end justify-between gap-2 px-1 pb-2 border-b border-[#f2efe9]">
                  {trend.map((point, idx) => {
                    const maxVal = Math.max(...trend.map((t) => t.students), 5);
                    const heightPct = Math.max(12, Math.round((point.students / maxVal) * 100));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <span className="text-[9px] font-mono font-bold text-[#78716c] opacity-0 group-hover:opacity-100 transition-opacity">
                          {point.students}
                        </span>
                        <div className="w-full max-w-[28px] bg-[#eff6ff] group-hover:bg-[#1e3a8a] rounded-t-md transition-colors relative flex items-end justify-center" style={{ height: `${heightPct}%` }}>
                          <div className="w-full bg-[#1e3a8a] rounded-t-md h-full transition-all duration-300 opacity-80 group-hover:opacity-100" />
                        </div>
                        <span className="text-[10px] font-medium text-[#78716c] truncate">
                          {point.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[#78716c] text-[11px]">
                  Real-time database analytics
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

            {/* 5B. Recent Students Glimpse (Max 3-5 Students) */}
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
                  className="text-xs font-bold text-[#1e3a8a] hover:underline"
                >
                  View All →
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-12 bg-[#f8f7f4] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentStudents.length > 0 ? (
                <div className="space-y-3">
                  {recentStudents.map((student) => (
                    <div
                      key={student._id}
                      onClick={() => navigate(`/students?search=${encodeURIComponent(student.name || "")}`)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f8f7f4] transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
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
                          <p className="font-bold text-xs text-[#1c1917] truncate">
                            {student.name}
                          </p>
                          <p className="text-[10px] text-[#78716c] truncate">
                            {student.courseName}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-[#a8a29e] shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-[#78716c]">
                  No students have joined this institution yet.
                </div>
              )}
            </div>

            {/* 5C. Recent Activity (Max 5 Events) */}
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
                <Activity size={16} className="text-[#1e3a8a]" />
              </div>

              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-9 bg-[#f8f7f4] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5 text-xs">
                      <div className="w-2 h-2 rounded-full bg-[#1e3a8a] mt-1.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[#1c1917] font-medium leading-snug line-clamp-2">
                          {act.title}
                        </p>
                        <p className="text-[10px] text-[#78716c] mt-0.5">
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-[#78716c]">
                  No recent activities recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating AI Copilot for Educator (Aware of Educator Home) */}
      <AIAssistantButton />

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

