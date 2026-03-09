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
import blank_photo from "/blank_Profile.avif";
import { useNavigate } from "react-router-dom";

function Profile() {
  const { userData } = useSelector((store) => store.user);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center md:p-6">
      <div className="w-full md:max-w-4xl bg-white rounded-2xl shadow-md p-8">
        {/* Header */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 px-2  border rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-6 border-b pb-6">
          <img
            src={userData?.profilePicture || blank_photo}
            alt="profile"
            className="w-24 h-24 rounded-full object-cover"
          />

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

          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100">
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
