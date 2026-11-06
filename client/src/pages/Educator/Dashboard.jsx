import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Plus, Users, IndianRupee, BarChart3 } from "lucide-react";
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-900 transition cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Educator Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Overview of course engagement, student enrollments, and earnings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/courses")}
              className="bg-gray-900 hover:bg-gray-800 text-white border border-gray-800 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
              Manage Courses
            </button>
            <button
              onClick={() => navigate("/createcourses")}
              className="inline-flex items-center gap-1.5 bg-cyan-900 hover:bg-cyan-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition active:scale-95"
            >
              <Plus size={16} /> Create Course
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Total Revenue</span>
              <IndianRupee size={16} className="text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              ₹{totalEarning.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-gray-500">Based on verified enrollments</p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Total Courses</span>
              <BookOpen size={16} className="text-cyan-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              {courses.length}
            </p>
            <p className="text-[11px] text-gray-500">Published & draft courses</p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Total Students</span>
              <Users size={16} className="text-blue-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              {totalStudents}
            </p>
            <p className="text-[11px] text-gray-500">Enrolled across all courses</p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Instructor</span>
              <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">Active</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white truncate">
              {userData?.name || "Educator"}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{userData?.email}</p>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress / Lectures Chart */}
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold text-white">
                Course Depth (Lectures per Course)
              </h2>
              <BarChart3 size={18} className="text-gray-500" />
            </div>
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CourseProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="name" stroke="#737373" fontSize={11} />
                  <YAxis stroke="#737373" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", color: "#fff", borderRadius: "8px" }}
                  />
                  <Bar dataKey="lectures" fill="#164e63" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Enrolled Students Chart */}
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold text-white">
                Student Enrollment Distribution
              </h2>
              <Users size={18} className="text-gray-500" />
            </div>
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={EnrollData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="name" stroke="#737373" fontSize={11} />
                  <YAxis stroke="#737373" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", color: "#fff", borderRadius: "8px" }}
                  />
                  <Bar dataKey="enrolled" fill="#0891b2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
