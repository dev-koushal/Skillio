import React, { useState } from "react";
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
  const [option, setOption] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-black/90 flex justify-center md:p-6">
      <div className="w-full md:max-w-4xl bg-white/90 rounded-2xl shadow-md p-8">
        {/* Header */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 px-2  border rounded-lg hover:bg-gray-100 mb-4 cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-6 border-b pb-6">
          {userData.photoUrl ? (
            <img
              src={userData.photoUrl}
              className="flex w-20 h-20 border-40 border-cyan-900 rounded-full items-center justify-center"
            />
          ) : (
            <div
              onClick={() => setOption(!option)}
              className="flex w-20 h-20 border-2 border-cyan-900 rounded-full items-center justify-center text-4xl"
            >
              {userData?.profilePicture ? (
                <img
                  src={userData.profilePicture}
                  className="w-20 h-20 border-2 border-cyan-900 rounded-full object-cover"
                />
              ) : (
                <div
                  onClick={() => setOption(!option)}
                  className="flex w-20 h-20 border-2 border-cyan-900 rounded-full items-center justify-center text-4xl"
                >
                  {userData?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
            </div>
          )}

          <div className="flex-1">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <User size={20} /> {userData.name}
            </h2>

            <p className="text-gray-500 mt-1">{userData.description}</p>

            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <BadgeCheck size={16} />
              {userData.role}
            </div>
          </div>

          <button
            onClick={() => navigate("/editprofile")}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <Edit size={16} />
            Edit
          </button>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="flex items-center gap-3 text-gray-700">
            <Mail size={18} />
            <span>{userData.email}</span>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <BookOpen size={18} />
            <span>{userData.enrolledCourses?.length} Courses Enrolled</span>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <Calendar size={18} />
            <span>
              Joined {new Date(userData.createdAt).toLocaleDateString()}
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
            <p className="text-gray-500">No courses enrolled</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {userData.enrolledCourses.map((course, index) => (
                <div
                  key={index}
                  className="border rounded-xl p-4 hover:shadow-sm transition"
                >
                  <p className="font-medium">{course.title || "Course"}</p>
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
