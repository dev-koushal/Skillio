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
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { useTenant } from "../../context/TenantContext";
import AIAssistantButton from "../../components/AIAssistantButton";
import AIAssistantModal from "../../components/AIAssistantModal";

export default function Dashboard() {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { creatorCourseData } = useSelector((state) => state.course);
  const { tenant } = useTenant();

  const [aiModalOpen, setAiModalOpen] = useState(false);

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

  // Latest course worked on
  const mostRecentCourse = courses.length > 0 ? courses[0] : null;

  // Time-appropriate greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 flex-1">
        {/* Welcome Greeting & Academy Header */}
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

        {/* Action Callout Hero (3 Quick Intent Paths) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Create Course */}
          <div
            onClick={() => navigate("/builder/new")}
            className="group bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/50 rounded-2xl p-6 cursor-pointer transition shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center font-bold">
                <Plus size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors">
                  Create a New Course
                </h3>
                <p className="text-xs text-[#78716c] mt-1 leading-relaxed">
                  Start fresh in the single Course Builder workspace. Add lectures, study notes, and set pricing.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#f1ede4] flex items-center justify-between text-xs font-semibold text-[#1e3a8a]">
              <span>Open Course Builder</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Continue Teaching (Latest Course) */}
          {mostRecentCourse ? (
            <div
              onClick={() => navigate(`/builder/${mostRecentCourse._id}`)}
              className="group bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/50 rounded-2xl p-6 cursor-pointer transition shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  <PlayCircle size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors truncate">
                      Continue: {mostRecentCourse.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#78716c] mt-1 line-clamp-2 leading-relaxed">
                    Resume editing curriculum ({mostRecentCourse.lectures?.length || 0} lectures) and publishing resources.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#f1ede4] flex items-center justify-between text-xs font-semibold text-[#1e3a8a]">
                <span>Resume in Builder</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ) : (
            <div
              onClick={() => setAiModalOpen(true)}
              className="group bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/50 rounded-2xl p-6 cursor-pointer transition shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors">
                    Build with AI Assistant
                  </h3>
                  <p className="text-xs text-[#78716c] mt-1 leading-relaxed">
                    Speak or type your syllabus in Hindi/English. The assistant creates draft courses & lectures for you.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#f1ede4] flex items-center justify-between text-xs font-semibold text-[#1e3a8a]">
                <span>Open Assistant</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {/* Card 3: AI Voice Teaching Assistant */}
          <div
            onClick={() => setAiModalOpen(true)}
            className="group bg-gradient-to-br from-[#eff6ff] to-white border border-[#bfdbfe] hover:border-[#1e3a8a]/60 rounded-2xl p-6 cursor-pointer transition shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-bold shadow-xs">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1c1917]">
                  Speak & Create Course
                </h3>
                <p className="text-xs text-[#57534e] mt-1 leading-relaxed">
                  "Ek course banao jiska naam English Full Course hai aur usme 3 lectures add karo."
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#bfdbfe]/60 flex items-center justify-between text-xs font-bold text-[#1e3a8a]">
              <span>Speak or Type</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* High-Level Essential Metrics */}
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

        {/* Your Courses Catalog */}
        <section className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e8e5dc]">
            <div>
              <h2 className="text-lg font-bold text-[#1c1917]">Your Academy Courses</h2>
              <p className="text-xs text-[#78716c] mt-0.5">
                Single-click access to open the course builder, edit lessons, or preview student view
              </p>
            </div>

            <button
              onClick={() => navigate("/builder/new")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e3a8a] bg-[#eff6ff] hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-[#bfdbfe] transition cursor-pointer self-start sm:self-auto"
            >
              <Plus size={14} /> Add Another Course
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-12 px-6 bg-[#faf8f5] rounded-xl border border-[#e8e5dc] space-y-3">
              <BookOpen size={40} className="mx-auto text-[#a8a29e]" />
              <h3 className="text-base font-bold text-[#1c1917]">No courses created yet</h3>
              <p className="text-xs text-[#78716c] max-w-sm mx-auto">
                Click "+ Create Course" to start building your first video curriculum, or ask the AI Assistant.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => navigate("/builder/new")}
                  className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Create Course Now
                </button>
                <button
                  onClick={() => setAiModalOpen(true)}
                  className="bg-white border border-[#d6d3d1] hover:bg-[#f1ede4] text-[#1c1917] text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Build with AI ✨
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#f1ede4]">
              {courses.map((course) => (
                <div
                  key={course._id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={
                        course?.thumbnail ||
                        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"
                      }
                      alt=""
                      className="w-20 h-14 object-cover rounded-xl bg-[#f1ede4] border border-[#e8e5dc] shrink-0"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-[#1c1917] truncate max-w-xs sm:max-w-md">
                          {course.title}
                        </h4>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                            course.isPublished
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {course.isPublished ? "Live" : "Draft"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#78716c]">
                        <span className="font-medium text-[#1e3a8a]">
                          {course.category || "General"}
                        </span>
                        <span>•</span>
                        <span>{course.lectures?.length || 0} Lectures</span>
                        <span>•</span>
                        <span>{course.enrolledStudents?.length || 0} Students</span>
                        <span>•</span>
                        <span className="font-semibold text-[#1c1917]">
                          {course.price ? `₹${course.price.toLocaleString("en-IN")}` : "Free"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => navigate(`/builder/${course._id}`)}
                      className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Open Builder</span>
                      <ArrowRight size={13} />
                    </button>

                    <button
                      onClick={() => navigate(`/viewcourse/${course._id}`)}
                      className="p-2 rounded-xl border border-[#d6d3d1] hover:bg-[#f1ede4] text-[#78716c] hover:text-[#1c1917] transition cursor-pointer"
                      title="Preview in Student View"
                    >
                      <ExternalLink size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Floating AI Teaching Assistant Button */}
      <AIAssistantButton />

      {/* Modal AI Assistant */}
      <AIAssistantModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />

      <Footer />
    </div>
  );
}
