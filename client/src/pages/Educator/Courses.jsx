import React, { useEffect } from "react";
import { ArrowLeft, SquarePen, Plus, BookOpen, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../../services/api";
import { setCreatorCourseData, setCourseData } from "../../redux/courseSlice";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { toast } from "react-toastify";
import "./Courses.css";
import { canUseEducatorWorkspace } from "../../auth/permissions";

function Courses() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { creatorCourseData, courseData } = useSelector((state) => state.course);
  const { userData } = useSelector((state) => state.user);
  const [deletingCourseId, setDeletingCourseId] = React.useState(null);
  const [coursesLoading, setCoursesLoading] = React.useState(true);

  const courses = Array.isArray(creatorCourseData)
    ? creatorCourseData
    : creatorCourseData?.courses || [];

  const isEducator = canUseEducatorWorkspace(userData);

  const deleteCourse = async (course) => {
    if (!window.confirm(`Delete “${course.title}”? This also removes its lessons and cannot be undone.`)) return;
    setDeletingCourseId(course._id);
    try {
      await api.delete(`/api/course/remove/${course._id}`);
      const next = courses.filter((item) => item._id !== course._id);
      dispatch(setCreatorCourseData(Array.isArray(creatorCourseData) ? next : { ...creatorCourseData, courses: next }));
      dispatch(setCourseData(Array.isArray(courseData) ? courseData.filter((item) => item._id !== course._id) : []));
      toast.success("Course deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete this course");
    } finally {
      setDeletingCourseId(null);
    }
  };

  useEffect(() => {
    const fetchCreatorCourses = async () => {
      try {
        const { data } = await api.get("/api/course/getcreator");
        dispatch(setCreatorCourseData(data));
      } catch (error) {
        console.warn("[Courses] Error fetching courses:", error.message);
      } finally {
        setCoursesLoading(false);
      }
    };

    if (isEducator) {
      fetchCreatorCourses();
    } else setCoursesLoading(false);
  }, [userData?._id, userData?.role, isEducator, dispatch]);

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col">
      <Navbar />

      <main className="educator-courses-main max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 flex-1 pb-28 md:pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-1 rounded-md text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] transition cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                Course Management Studio
              </h1>
              <p className="text-xs sm:text-sm text-[#57534e]">
                Total {courses.length} {courses.length === 1 ? "course" : "courses"} in this organization
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/builder")}
            className="inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer min-h-[42px]"
          >
            <Plus size={16} /> Create New Course
          </button>
        </div>

        {/* Empty State */}
        {coursesLoading ? (
          <div className="course-list-loading" role="status"><span className="course-loading-spinner" />Loading your courses…</div>
        ) : courses.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 rounded-3xl bg-white border border-[#e8e5dc] space-y-4 shadow-xs">
            <BookOpen size={44} className="mx-auto text-[#a8a29e]" />
            <h2 className="text-base font-bold text-[#1c1917]">No courses created yet</h2>
            <p className="text-xs text-[#78716c]">
              Start building your first curriculum with video lectures, lecture notes, and student enrollment.
            </p>
            <button
              onClick={() => navigate("/builder")}
              className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
            >
              Create Your First Course
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white border border-[#e8e5dc] rounded-3xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#faf9f6] border-b border-[#e8e5dc] text-xs font-bold uppercase tracking-wider text-[#78716c]">
                  <tr>
                    <th className="py-3.5 px-6">Course</th>
                    <th className="py-3.5 px-6">Category</th>
                    <th className="py-3.5 px-6">Price</th>
                    <th className="py-3.5 px-6">Status</th>
            <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2efe9]">
                  {courses.map((course) => (
                    <tr key={course._id} className="hover:bg-[#faf9f6] transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              course?.thumbnail ||
                              "https://thumbs.dreamstime.com/b/no-thumbnail-image-placeholder-forums-blogs-websites-148010362.jpg"
                            }
                            alt=""
                            className="w-16 h-10 object-cover rounded-lg bg-gray-100 border border-[#e8e5dc]"
                          />
                          <div className="truncate max-w-xs">
                            <p className="font-bold text-[#1c1917] truncate">{course.title}</p>
                            <p className="text-xs text-[#78716c]">{course.lectures?.length || 0} Lectures</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-[#57534e]">
                        {course.category}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#1c1917]">
                        {course.price === 0 ? "Free" : `₹${(course.price || 0).toLocaleString("en-IN")}`}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            course.isPublished
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {course.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/builder/${course._id}`)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] hover:bg-blue-50 border border-[#d6d3c9] px-3 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          <SquarePen size={14} /> Edit in Builder
                        </button>
                        <button type="button" aria-label={`Delete ${course.title}`} title="Delete course" disabled={deletingCourseId === course._id} onClick={() => deleteCourse(course)} className="course-delete-button"><Trash2 size={15} /><span>Delete</span></button>
                        </div>
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
                  className="bg-white border border-[#e8e5dc] rounded-2xl p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        course?.thumbnail ||
                        "https://thumbs.dreamstime.com/b/no-thumbnail-image-placeholder-forums-blogs-websites-148010362.jpg"
                      }
                      alt=""
                      className="w-16 h-12 object-cover rounded-lg bg-gray-100 border border-[#e8e5dc]"
                    />
                    <div className="flex-1 truncate">
                      <p className="font-bold text-sm text-[#1c1917] truncate">{course.title}</p>
                      <p className="text-xs text-[#78716c]">{course.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#f2efe9]">
                    <span className="font-bold text-[#1c1917]">
                      {course.price === 0 ? "Free" : `₹${(course.price || 0).toLocaleString("en-IN")}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        course.isPublished
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>

                  <div className="course-mobile-actions">
                  <button
                    onClick={() => navigate(`/builder/${course._id}`)}
                    className="course-mobile-edit"
                  >
                    Open Course Builder
                  </button>
                  <button type="button" aria-label={`Delete ${course.title}`} disabled={deletingCourseId === course._id} onClick={() => deleteCourse(course)} className="course-mobile-delete"><Trash2 size={16}/><span>{deletingCourseId === course._id ? "Deleting" : "Delete"}</span></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Courses;
