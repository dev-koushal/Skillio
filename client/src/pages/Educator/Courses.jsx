import React, { useEffect } from "react";
import { ArrowLeft, SquarePen, Plus, BookOpen, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../../services/api";
import { setCreatorCourseData } from "../../redux/courseSlice";
import Navbar from "../../components/Navbar";

function Courses() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { creatorCourseData } = useSelector((state) => state.course);
  const { userData } = useSelector((state) => state.user);

  const courses = Array.isArray(creatorCourseData)
    ? creatorCourseData
    : creatorCourseData?.courses || [];

  useEffect(() => {
    const fetchCreatorCourses = async () => {
      try {
        const { data } = await api.get("/api/course/getcreator");
        dispatch(setCreatorCourseData(data));
      } catch (error) {
        console.warn("[Courses] Error fetching courses:", error.message);
      }
    };

    if (userData?.role === "educator") {
      fetchCreatorCourses();
    }
  }, [userData, dispatch]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-900 transition cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                My Created Courses
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Total {courses.length} {courses.length === 1 ? "course" : "courses"} in this organization
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/createcourses")}
            className="inline-flex items-center justify-center gap-2 bg-cyan-900 hover:bg-cyan-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer min-h-[42px]"
          >
            <Plus size={16} /> Create Course
          </button>
        </div>

        {/* Empty State */}
        {courses.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-4">
            <BookOpen size={44} className="mx-auto text-gray-600" />
            <h2 className="text-lg font-semibold text-white">No courses created yet</h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Start building your first curriculum with video lectures, student enrollment, and verified certificates.
            </p>
            <button
              onClick={() => navigate("/createcourses")}
              className="bg-cyan-900 hover:bg-cyan-800 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg transition"
            >
              Create Your First Course
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-900 border-b border-gray-800 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="py-3.5 px-6">Course</th>
                    <th className="py-3.5 px-6">Category</th>
                    <th className="py-3.5 px-6">Price</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80">
                  {courses.map((course) => (
                    <tr key={course._id} className="hover:bg-gray-850/50 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              course?.thumbnail ||
                              "https://thumbs.dreamstime.com/b/no-thumbnail-image-placeholder-forums-blogs-websites-148010362.jpg"
                            }
                            alt=""
                            className="w-16 h-10 object-cover rounded-lg bg-black"
                          />
                          <div className="truncate max-w-xs">
                            <p className="font-semibold text-white truncate">{course.title}</p>
                            <p className="text-xs text-gray-400">{course.lectures?.length || 0} Lectures</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-300">
                        {course.category}
                      </td>
                      <td className="py-4 px-6 font-semibold text-white">
                        ₹{(course.price || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            course.isPublished
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}
                        >
                          {course.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => navigate(`/editcourse/${course._id}`)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 px-3 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          <SquarePen size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden space-y-3">
              {courses.map((course) => (
                <div
                  key={course._id}
                  className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex gap-3 items-center">
                    <img
                      src={
                        course?.thumbnail ||
                        "https://thumbs.dreamstime.com/b/no-thumbnail-image-placeholder-forums-blogs-websites-148010362.jpg"
                      }
                      alt=""
                      className="w-16 h-12 object-cover rounded-lg bg-black shrink-0"
                    />
                    <div className="flex-1 truncate">
                      <h3 className="font-semibold text-sm text-white truncate">
                        {course.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {course.category} • {course.lectures?.length || 0} Lectures
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        ₹{(course.price || 0).toLocaleString("en-IN")}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          course.isPublished
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-amber-950 text-amber-300 border border-amber-800"
                        }`}
                      >
                        {course.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>

                    <button
                      onClick={() => navigate(`/editcourse/${course._id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-3 py-1.5 rounded-lg"
                    >
                      <SquarePen size={13} /> Edit Course
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Courses;
