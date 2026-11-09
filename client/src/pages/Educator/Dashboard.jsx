import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  PlayCircle,
  Sparkles,
  Users,
  IndianRupee,
  BookOpen,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Building2,
  Video,
  FileText,
  Search,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { useTenant } from "../../context/TenantContext";
import AIAssistantModal from "../../components/AIAssistantModal";
import { optimizeImage } from "../../utils/imageOptimizer";

export default function Dashboard() {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { creatorCourseData } = useSelector((state) => state.course);
  const { tenant } = useTenant();

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "live" | "draft"

  const courses = Array.isArray(creatorCourseData)
    ? creatorCourseData
    : creatorCourseData?.courses || [];

  const tenantName = tenant?.name || "Your Academy";
  const teacherName = userData?.name || "Teacher";

  // Calculate high-level summary metrics
  const totalRevenue = courses.reduce((sum, c) => {
    const studentCount = c.enrolledStudents?.length || 0;
    const coursePrice = c.price ? c.price * studentCount : 0;
    return sum + coursePrice;
  }, 0);

  const totalStudents = courses.reduce(
    (sum, c) => sum + (c.enrolledStudents?.length || 0),
    0
  );

  const publishedCourses = courses.filter((c) => c.isPublished);
  const draftCourses = courses.filter((c) => !c.isPublished);

  const filteredCourses = courses.filter((c) => {
    if (filterStatus === "live") return c.isPublished;
    if (filterStatus === "draft") return !c.isPublished;
    return true;
  });

  // Time-appropriate greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 flex-1 pb-28 md:pb-12">
        {/* ============================================================== */}
        {/* 1. WELCOME GREETING & HEADER (PRESERVED)                        */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e8e5dc]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-[#eff6ff] text-[#1e3a8a]">
                <Building2 size={16} />
              </span>
              <span className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">
                {tenantName} Studio
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
              {greeting}, {teacherName}
            </h1>
            <p className="text-xs sm:text-sm text-[#78716c]">
              What would you like to teach today? Build lessons, upload notes, or use your AI Assistant.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setAiModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#eff6ff] hover:bg-blue-100 text-[#1e3a8a] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#bfdbfe] transition cursor-pointer"
            >
              <Sparkles size={16} />
              <span>Ask AI Assistant</span>
            </button>

            <button
              onClick={() => navigate("/builder/new")}
              className="inline-flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer min-h-[42px]"
            >
              <Plus size={18} />
              <span>Create Course</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. STAT CAPSULES (THE THREE METRIC CARDS KEPT IN RED BOX)       */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <IndianRupee size={22} />
            </div>
            <div>
              <p className="text-xs text-[#78716c] font-semibold uppercase tracking-wider">
                Total Tuition Earnings
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-[#1c1917] mt-0.5">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center shrink-0">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs text-[#78716c] font-semibold uppercase tracking-wider">
                Active Enrolled Students
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-[#1c1917] mt-0.5">
                {totalStudents} {totalStudents === 1 ? "Learner" : "Learners"}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-xs text-[#78716c] font-semibold uppercase tracking-wider">
                Courses in Academy
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-[#1c1917] mt-0.5">
                {courses.length}{" "}
                <span className="text-xs font-semibold text-[#78716c]">
                  ({publishedCourses.length} Live • {draftCourses.length} Draft)
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. YOUR ACADEMY COURSES (WITH DOTTED CREATE BUTTON CARD)       */}
        {/* ============================================================== */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#1c1917]">Your Academy Courses</h2>
              <p className="text-xs text-[#78716c] mt-0.5">
                Single-click access to open the course builder, edit lessons, or preview student view
              </p>
            </div>

            {/* Quick Filter Tabs */}
            {courses.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-[#e8e5dc] p-1 rounded-xl shadow-2xs self-start sm:self-auto">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    filterStatus === "all"
                      ? "bg-[#1e3a8a] text-white"
                      : "text-[#57534e] hover:bg-[#f8f7f4]"
                  }`}
                >
                  All ({courses.length})
                </button>
                <button
                  onClick={() => setFilterStatus("live")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    filterStatus === "live"
                      ? "bg-[#1e3a8a] text-white"
                      : "text-[#57534e] hover:bg-[#f8f7f4]"
                  }`}
                >
                  Live ({publishedCourses.length})
                </button>
                <button
                  onClick={() => setFilterStatus("draft")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    filterStatus === "draft"
                      ? "bg-[#1e3a8a] text-white"
                      : "text-[#57534e] hover:bg-[#f8f7f4]"
                  }`}
                >
                  Draft ({draftCourses.length})
                </button>
              </div>
            )}
          </div>

          {/* Unified Grid: Dotted Create Card + Actual Course Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* World-Class Dotted / Dashed "Create New Course" Card */}
            <div
              onClick={() => navigate("/builder/new")}
              className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl border-2 border-dashed border-[#d6d3d1] hover:border-[#1e3a8a] bg-white/60 hover:bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1e3a8a]/5 cursor-pointer min-h-[320px]"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] text-[#1e3a8a] group-hover:bg-[#1e3a8a] group-hover:text-white transition-all duration-300 group-hover:scale-108 group-hover:rotate-90 flex items-center justify-center shadow-xs">
                  <Plus size={26} strokeWidth={2.5} />
                </div>

                <div className="space-y-2">
                  <h3 className="font-extrabold text-lg text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors tracking-tight">
                    Create New Course
                  </h3>
                  <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
                    Launch the unified course builder. Add video lectures, attach study notes, and set your pricing in one place.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#f1ede4] flex items-center justify-between text-xs font-bold text-[#1e3a8a] group-hover:text-[#172554]">
                <span className="inline-flex items-center gap-1.5 bg-[#eff6ff] group-hover:bg-blue-100/70 px-3 py-1.5 rounded-xl transition">
                  + Start Building Course
                </span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Educator Course Cards */}
            {filteredCourses.map((course) => (
              <div
                key={course._id}
                className="group bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Banner */}
                  <div className="relative w-full aspect-video overflow-hidden bg-[#f8f7f4]">
                    {course.thumbnail ? (
                      <img
                        src={optimizeImage(course.thumbnail, 500)}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = "none";
                          if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                        }}
                        loading="lazy"
                      />
                    ) : null}

                    {/* Clean Gradient Fallback */}
                    <div
                      className={`w-full h-full bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] flex-col items-center justify-center text-white p-4 text-center space-y-1.5 ${
                        course.thumbnail ? "hidden" : "flex"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-xs">
                        <BookOpen size={20} />
                      </div>
                      <span className="text-xs font-bold text-white/90 line-clamp-1">{course.title}</span>
                    </div>

                    {/* Floating Status & Category Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border shadow-xs backdrop-blur-xs ${
                          course.isPublished
                            ? "bg-emerald-500/90 text-white border-emerald-400"
                            : "bg-amber-500/90 text-white border-amber-400"
                        }`}
                      >
                        {course.isPublished ? "Live" : "Draft"}
                      </span>

                      {course.category && (
                        <span className="text-[10px] font-semibold bg-white/90 text-[#1e3a8a] px-2 py-0.5 rounded-md border border-[#e8e5dc] shadow-xs">
                          {course.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Course Details */}
                  <div className="p-4 sm:p-5 space-y-2">
                    <h3 className="font-bold text-base text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors line-clamp-1">
                      {course.title || "Untitled Course"}
                    </h3>

                    <p className="text-xs text-[#78716c] line-clamp-2 leading-relaxed">
                      {course.description || course.subTitle || "Curriculum lessons and study resources."}
                    </p>

                    <div className="pt-2 flex items-center gap-3 text-xs text-[#78716c] font-medium">
                      <span className="flex items-center gap-1">
                        <Video size={13} className="text-[#1e3a8a]" />
                        {course.lectures?.length || 0} Lectures
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users size={13} className="text-[#1e3a8a]" />
                        {course.enrolledStudents?.length || 0} Students
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 sm:p-5 pt-0 border-t border-[#f1ede4] mt-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-extrabold text-[#1c1917]">
                    {course.price ? `₹${course.price.toLocaleString("en-IN")}` : "Free"}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/viewcourse/${course._id}`)}
                      className="p-2 rounded-xl border border-[#d6d3d1] hover:bg-[#f1ede4] text-[#78716c] hover:text-[#1c1917] transition cursor-pointer"
                      title="Preview Course"
                    >
                      <ExternalLink size={14} />
                    </button>

                    <button
                      onClick={() => navigate(`/builder/${course._id}`)}
                      className="inline-flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>Open Builder</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Modal AI Assistant */}
      <AIAssistantModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />

      <Footer />
    </div>
  );
}
