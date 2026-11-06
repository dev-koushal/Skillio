import React from "react";
import { User, Mail, BookOpen, Calendar, BadgeCheck, Edit, ArrowLeft } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function Profile() {
  const { userData } = useSelector((store) => store.user);
  const navigate = useNavigate();

  if (!userData) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Navbar />
        <div className="p-8 text-center text-gray-400">Loading user profile...</div>
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Back Link */}
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        {/* Profile Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Avatar and Info Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-gray-800 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-cyan-950 border-2 border-cyan-800 flex items-center justify-center text-3xl font-bold text-cyan-200 shadow-lg shrink-0">
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
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {userData.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 max-w-md">
                  {userData.description || "Student & Lifelong Learner"}
                </p>
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    <BadgeCheck size={13} /> {userData.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/editprofile")}
              className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-lg border border-gray-700 transition cursor-pointer"
            >
              <Edit size={15} /> Edit Profile
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-4 flex items-center gap-3">
              <Mail size={18} className="text-cyan-400 shrink-0" />
              <div className="truncate">
                <p className="text-[11px] text-gray-500 uppercase font-semibold">Email</p>
                <p className="text-xs sm:text-sm text-white font-medium truncate">{userData.email}</p>
              </div>
            </div>

            <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-4 flex items-center gap-3">
              <BookOpen size={18} className="text-cyan-400 shrink-0" />
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-semibold">Enrolled</p>
                <p className="text-xs sm:text-sm text-white font-medium">{enrolledCount} Courses</p>
              </div>
            </div>

            <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-4 flex items-center gap-3">
              <Calendar size={18} className="text-cyan-400 shrink-0" />
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-semibold">Joined</p>
                <p className="text-xs sm:text-sm text-white font-medium">{joinedDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
