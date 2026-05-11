import React from "react";
import {
  User,
  Mail,
  BookOpen,
  Calendar,
  BadgeCheck,
  Edit,
  ArrowLeft,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

function Profile() {
  const { userData } = useSelector((store) => store.user);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black/90 flex justify-center px-3 py-4 sm:px-5 sm:py-6">
      <div className="w-full max-w-4xl bg-white/95 rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
        {/* Header */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-100 mb-5 cursor-pointer text-sm sm:text-base"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b pb-6">
          {/* Profile Image */}
          <div className="flex justify-center sm:justify-start">
            {userData.photoUrl || userData.profilePicture ? (
              <img
                src={userData.photoUrl || userData.profilePicture}
                alt="profile"
                className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-cyan-900 rounded-full object-cover"
              />
            ) : (
              <div className="flex w-24 h-24 sm:w-28 sm:h-28 border-2 border-cyan-900 rounded-full items-center justify-center text-4xl font-semibold">
                {userData?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-semibold flex items-center justify-center sm:justify-start gap-2 break-words">
              <User size={20} />
              {userData.name}
            </h2>

            <p className="text-gray-500 mt-2 text-sm sm:text-base break-words">
              {userData.description}
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 text-sm text-gray-600">
              <BadgeCheck size={16} />
              {userData.role}
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex justify-center sm:justify-end">
            <button
              onClick={() => navigate("/editprofile")}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100 cursor-pointer w-full sm:w-auto justify-center"
            >
              <Edit size={16} />
              Edit
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          <div className="flex items-start gap-3 text-gray-700 break-all">
            <Mail size={18} className="mt-1 shrink-0" />
            <span className="text-sm sm:text-base">{userData.email}</span>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <BookOpen size={18} className="shrink-0" />
            <span className="text-sm sm:text-base">
              {userData.enrolledCourses?.length} Courses Enrolled
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <Calendar size={18} className="shrink-0" />
            <span className="text-sm sm:text-base">
              Joined{" "}
              {new Date(userData.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Courses */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen size={18} />
            Enrolled Courses
          </h3>

          {userData.enrolledCourses?.length === 0 ? (
            <p className="text-gray-500 text-sm sm:text-base">
              No courses enrolled
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userData.enrolledCourses.map((course, index) => (
                <div
                  key={index}
                  className="border rounded-xl p-4 hover:shadow-md transition bg-white"
                >
                  <p className="font-medium text-sm sm:text-base break-words">
                    {course.title || "Course"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;