import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Users,
  IndianRupee,
  BarChart3,
  Building2,
  FileText,
  ExternalLink,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { useTenant } from "../../context/TenantContext";

function Dashboard() {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { creatorCourseData } = useSelector((state) => state.course);
  const { tenant } = useTenant();

  const courses = Array.isArray(creatorCourseData)
    ? creatorCourseData
    : creatorCourseData?.courses || [];

  const tenantName = tenant?.name || "Your Academy";

  const CourseProgressData = courses.slice(0, 8).map((course) => ({
    name: course.title
      ? course.title.length > 14
        ? course.title.slice(0, 12) + "..."
        : course.title
      : "Course",
    lectures: course.lectures?.length || 0,
  }));

  const EnrollData = courses.slice(0, 8).map((course) => ({
    name: course.title
      ? course.title.length > 14
        ? course.title.slice(0, 12) + "..."
        : course.title
      : "Course",
    enrolled: course.enrolledStudents?.length || 0,
  }));

  const totalEarning =
    courses.reduce((sum, c) => {
      const studentCount = c.enrolledStudents?.length || 0;
      const courseRevenue = c.price ? c.price * studentCount : 0;
      return sum + courseRevenue;
    }, 0) || 0;

  const totalStudents = courses.reduce(
    (sum, c) => sum + (c.enrolledStudents?.length || 0),
    0
  );

  const publishedCount = courses.filter((c) => c.isPublished).length;
  const draftCount = courses.length - publishedCount;

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 flex-1">
        {/* Top Header & Sub-Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e8e5dc]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#eff6ff] text-[#1e3a8a]">
                  <Building2 size={18} />
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                  {tenantName} Studio
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
                Manage curriculum, review student enrollment metrics, and publish course notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/courses")}
              className="bg-white hover:bg-[#f1ede4] text-[#1c1917] border border-[#d6d3d1] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
            >
              Manage Courses ({courses.length})
            </button>
            <button
              onClick={() => navigate("/createcourses")}
              className="inline-flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> New Course
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[#78716c] text-xs font-semibold uppercase tracking-wider">
              <span>Tuition Revenue</span>
              <IndianRupee size={16} className="text-emerald-700" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1c1917]">
              ₹{totalEarning.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-[#78716c]">Verified student purchases</p>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[#78716c] text-xs font-semibold uppercase tracking-wider">
              <span>Active Students</span>
              <Users size={16} className="text-[#1e3a8a]" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1c1917]">
              {totalStudents}
            </p>
            <p className="text-[11px] text-[#78716c]">Enrolled across your courses</p>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[#78716c] text-xs font-semibold uppercase tracking-wider">
              <span>Courses Created</span>
              <BookOpen size={16} className="text-[#b45309]" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1c1917]">
              {courses.length}
            </p>
            <p className="text-[11px] text-[#78716c]">
              {publishedCount} Published • {draftCount} Draft
            </p>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[#78716c] text-xs font-semibold uppercase tracking-wider">
              <span>Educator Account</span>
              <span className="text-[10px] font-mono uppercase bg-[#eff6ff] text-[#1e3a8a] px-2 py-0.5 rounded-full border border-[#bfdbfe] font-bold">
                {userData?.role || "Educator"}
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold text-[#1c1917] truncate">
              {userData?.name || "Educator"}
            </p>
            <p className="text-[11px] text-[#78716c] truncate">{userData?.email}</p>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress / Lectures Chart */}
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#1c1917]">
                  Curriculum Depth (Lectures per Course)
                </h2>
                <p className="text-xs text-[#78716c]">Track instructional breadth</p>
              </div>
              <BarChart3 size={18} className="text-[#78716c]" />
            </div>
            <div className="w-full h-64 sm:h-72">
              {CourseProgressData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CourseProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dc" />
                    <XAxis dataKey="name" stroke="#78716c" fontSize={11} />
                    <YAxis stroke="#78716c" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e8e5dc",
                        color: "#1c1917",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                      }}
                    />
                    <Bar dataKey="lectures" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#78716c]">
                  No courses created yet to plot curriculum depth.
                </div>
              )}
            </div>
          </div>

          {/* Enrolled Students Chart */}
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#1c1917]">
                  Student Enrollment Distribution
                </h2>
                <p className="text-xs text-[#78716c]">Learner count per course</p>
              </div>
              <Users size={18} className="text-[#78716c]" />
            </div>
            <div className="w-full h-64 sm:h-72">
              {EnrollData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={EnrollData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dc" />
                    <XAxis dataKey="name" stroke="#78716c" fontSize={11} />
                    <YAxis stroke="#78716c" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e8e5dc",
                        color: "#1c1917",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                      }}
                    />
                    <Bar dataKey="enrolled" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#78716c]">
                  No student enrollments recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Access to Courses */}
        <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#e8e5dc]">
            <div>
              <h3 className="text-base font-bold text-[#1c1917]">Your Academy Courses</h3>
              <p className="text-xs text-[#78716c]">Quick links to edit lectures and study resources</p>
            </div>
            <button
              onClick={() => navigate("/courses")}
              className="text-xs text-[#1e3a8a] font-semibold hover:underline cursor-pointer"
            >
              View Full Table →
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-[#78716c]">You haven't created any courses yet.</p>
              <button
                onClick={() => navigate("/createcourses")}
                className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Create Your First Course
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#f1ede4]">
              {courses.slice(0, 5).map((course) => (
                <div
                  key={course._id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[#1c1917]">{course.title}</h4>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          course.isPublished
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {course.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-xs text-[#78716c]">
                      {course.category || "General"} • {course.lectures?.length || 0} lectures •{" "}
                      {course.enrolledStudents?.length || 0} students •{" "}
                      {course.price ? `₹${course.price}` : "Free"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/editcourse/${course._id}`)}
                      className="px-3 py-1.5 rounded-lg border border-[#d6d3d1] hover:bg-[#f1ede4] text-xs font-semibold text-[#44403c] transition cursor-pointer"
                    >
                      Open Studio
                    </button>
                    <button
                      onClick={() => navigate(`/viewcourse/${course._id}`)}
                      className="p-1.5 rounded-lg border border-[#d6d3d1] hover:bg-[#f1ede4] text-[#78716c] transition cursor-pointer"
                      title="Preview Course"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;
