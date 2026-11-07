import React from "react";
import { User, Mail, BookOpen, Calendar, BadgeCheck, Edit, ArrowLeft, GraduationCap, Building2 } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useTenant } from "../context/TenantContext";

function Profile() {
  const { userData } = useSelector((store) => store.user);
  const navigate = useNavigate();
  const { tenant } = useTenant();

  if (!userData) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
        <Navbar />
        <div className="p-8 text-center text-[#78716c]">Loading user profile...</div>
      </div>
    );
  }

  const enrolledCount = userData.enrolledCourses?.length || 0;
  const joinedDate = userData.createdAt
    ? new Date(userData.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Back Link */}
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        {/* Profile Card */}
        <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Avatar and Info Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-[#e8e5dc] text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[#eff6ff] border-2 border-[#1e3a8a]/30 flex items-center justify-center text-3xl font-bold text-[#1e3a8a] shadow-xs shrink-0">
                {userData.profilePicture ? (
                  <img
                    src={userData.profilePicture}
                    alt={userData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userData.name?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1917] tracking-tight">
                  {userData.name}
                </h1>
                <p className="text-xs sm:text-sm text-[#78716c] max-w-md">
                  {userData.description || "Student & Lifelong Learner"}
                </p>
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]">
                    <BadgeCheck size={13} /> {userData.role}
                  </span>
                  {tenant?.name && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-[#faf8f5] text-[#57534e] border border-[#e8e5dc]">
                      <Building2 size={12} /> {tenant.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/editprofile")}
              className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer min-h-[40px]"
            >
              <Edit size={16} /> Edit Profile
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e8e5dc] flex items-center gap-3">
              <Mail className="text-[#1e3a8a] shrink-0" size={20} />
              <div className="min-w-0">
                <span className="text-[11px] text-[#78716c] uppercase font-semibold block">Email</span>
                <span className="text-sm font-medium text-[#1c1917] truncate block">
                  {userData.email}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e8e5dc] flex items-center gap-3">
              <BookOpen className="text-[#1e3a8a] shrink-0" size={20} />
              <div>
                <span className="text-[11px] text-[#78716c] uppercase font-semibold block">
                  Enrolled Courses
                </span>
                <span className="text-sm font-bold text-[#1c1917]">
                  {enrolledCount} {enrolledCount === 1 ? "Course" : "Courses"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e8e5dc] flex items-center gap-3">
              <Calendar className="text-[#1e3a8a] shrink-0" size={20} />
              <div>
                <span className="text-[11px] text-[#78716c] uppercase font-semibold block">Joined On</span>
                <span className="text-sm font-medium text-[#1c1917]">{joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="pt-4 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/mycourses")}
              className="px-4 py-2 rounded-xl bg-[#faf8f5] hover:bg-[#f1ede4] border border-[#e8e5dc] text-xs font-semibold text-[#1c1917] transition cursor-pointer"
            >
              View Enrolled Courses →
            </button>
            {userData.role === "educator" && (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-xl bg-[#faf8f5] hover:bg-[#f1ede4] border border-[#e8e5dc] text-xs font-semibold text-[#1e3a8a] transition cursor-pointer"
              >
                Educator Dashboard →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
