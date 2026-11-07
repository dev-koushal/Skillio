import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Plus, Users, IndianRupee, BarChart3, Building2 } from "lucide-react";
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

function Dashboard() {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { creatorCourseData } = useSelector((state) => state.course);

  const courses = Array.isArray(creatorCourseData)
    ? creatorCourseData
    : creatorCourseData?.courses || [];

  const CourseProgressData = courses.slice(0, 8).map((course) => ({
    name: course.title ? (course.title.length > 12 ? course.title.slice(0, 10) + "..." : course.title) : "Course",
    lectures: course.lectures?.length || 0,
  }));

  const EnrollData = courses.slice(0, 8).map((course) => ({
    name: course.title ? (course.title.length > 12 ? course.title.slice(0, 10) + "..." : course.title) : "Course",
    enrolled: course.enrolledStudents?.length || 0,
  }));

  const totalEarning =
    courses.reduce((sum, c) => {
      const studentCount = c.enrolledStudents?.length || 0;
      const courseRevenue = c.price ? c.price * studentCount : 0;
      return sum + courseRevenue;
    }, 0) || 0;

  const totalStudents = courses.reduce((sum, c) => sum + (c.enrolledStudents?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1 rounded-md text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] transition cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                Educator Analytics & Studio
              </h1>
              <p className="text-xs sm:text-sm text-[#57534e]">
                Monitor curriculum progression, verified student enrollments, and tuition earnings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/courses")}
              className="bg-white hover:bg-[#f2efe9] text-[#1c1917] border border-[#d6d3c9] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              Manage Courses
            </button>
            <button
              onClick={() => navigate("/createcourses")}
              className="inline-flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Create Course
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[#78716c] text-xs font-bold uppercase tracking-wider">
              <span>Total Revenue</span>
              <IndianRupee size={16} className="text-emerald-700" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1c1917]">
              ₹{totalEarning.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-[#78716c]">Verified student purchases</p>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[#78716c] text-xs font-bold uppercase tracking-wider">
              <span>Published Courses</span>
              <BookOpen size={16} className="text-[#1e3a8a]" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1c1917]">
              {courses.length}
            </p>
            <p className="text-[11px] text-[#78716c]">In this institution</p>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[#78716c] text-xs font-bold uppercase tracking-wider">
              <span>Enrolled Students</span>
              <Users size={16} className="text-[#b45309]" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1c1917]">
              {totalStudents}
            </p>
            <p className="text-[11px] text-[#78716c]">Active classroom learners</p>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[#78716c] text-xs font-bold uppercase tracking-wider">
              <span>Role / Account</span>
              <span className="text-[10px] font-mono uppercase bg-blue-50 text-[#1e3a8a] px-2 py-0.5 rounded-full border border-blue-200 font-bold">
                {userData?.role || "Educator"}
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-[#1c1917] truncate">
              {userData?.name || "Educator"}
            </p>
            <p className="text-[11px] text-[#78716c] truncate">{userData?.email}</p>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress / Lectures Chart */}
          <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-[#1c1917]">
                Curriculum Depth (Lectures per Course)
              </h2>
              <BarChart3 size={18} className="text-[#78716c]" />
            </div>
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CourseProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dc" />
                  <XAxis dataKey="name" stroke="#78716c" fontSize={11} />
                  <YAxis stroke="#78716c" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e8e5dc", color: "#1c1917", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                  />
                  <Bar dataKey="lectures" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Enrolled Students Chart */}
          <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-[#1c1917]">
                Student Enrollment Distribution
              </h2>
              <Users size={18} className="text-[#78716c]" />
            </div>
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={EnrollData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dc" />
                  <XAxis dataKey="name" stroke="#78716c" fontSize={11} />
                  <YAxis stroke="#78716c" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e8e5dc", color: "#1c1917", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                  />
                  <Bar dataKey="enrolled" fill="#b45309" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;
