import React, { useEffect, useState } from "react";
import { ArrowLeft, Video, Trash2, Eye, EyeOff, UploadCloud, CheckCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { setCourseData } from "../../redux/courseSlice";
import Button from "../../components/common/Button";
import Navbar from "../../components/Navbar";

const CATEGORIES = [
  "Development",
  "Cyber Security",
  "Business",
  "AI/ML",
  "Data Science",
  "UI/UX Design",
  "Cloud & DevOps",
];

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

function EditCourse() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const dispatch = useDispatch();
  const { courseData } = useSelector((state) => state.course);

  const [title, setTitle] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [price, setPrice] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [frontendImage, setFrontendImage] = useState("");
  const [backendImage, setBackendImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const getCourseById = async () => {
    try {
      setFetching(true);
      const res = await api.get(`/api/course/getcourse/${courseId}`);
      const course = res.data;
      if (course) {
        setTitle(course.title || "");
        setSubTitle(course.subTitle || "");
        setDescription(course.description || "");
        setCategory(course.category || "");
        setLevel(course.level || "Beginner");
        setPrice(course.price || 0);
        setIsPublished(Boolean(course.isPublished));
        setFrontendImage(course.thumbnail || "");
      }
    } catch (error) {
      console.error("[EditCourse Error]", error);
      toast.error("Failed to fetch course details");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    getCourseById();
  }, [courseId]);

  const handleThumbnail = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackendImage(file);
      setFrontendImage(URL.createObjectURL(file));
    }
  };

  const handleEditCourse = async (e) => {
    e?.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("subTitle", subTitle);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("level", level);
    formData.append("price", price);
    formData.append("isPublished", isPublished);

    if (backendImage) {
      formData.append("thumbnail", backendImage);
    }

    try {
      const res = await api.post(`/api/course/editcourse/${courseId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data;

      // Update Redux state safely
      if (Array.isArray(courseData)) {
        const updatedList = courseData.map((c) => (c._id === courseId ? updated : c));
        if (!courseData.some((c) => c._id === courseId) && updated.isPublished) {
          updatedList.push(updated);
        }
        dispatch(setCourseData(updatedList));
      }

      toast.success("Course saved successfully!");
      navigate("/courses");
    } catch (error) {
      console.error("[EditCourse Save Error]", error);
      toast.error(error.response?.data?.message || "Failed to update course");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCourse = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this course and all its lectures?")) {
      return;
    }

    setDeleteLoading(true);
    try {
      await api.delete(`/api/course/remove/${courseId}`);
      if (Array.isArray(courseData)) {
        dispatch(setCourseData(courseData.filter((c) => c._id !== courseId)));
      }
      toast.success("Course deleted successfully");
      navigate("/courses");
    } catch (error) {
      console.error("[RemoveCourse Error]", error);
      toast.error(error.response?.data?.message || "Failed to delete course");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/courses")}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-900 transition cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Course Studio
              </h1>
              <p className="text-xs text-gray-400">
                Configure curriculum, pricing, and media assets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/createlecture/${courseId}`)}
              className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white border border-gray-800 text-xs sm:text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              <Video size={16} className="text-cyan-400" />
              Manage Lectures
            </button>
            <button
              onClick={handleRemoveCourse}
              disabled={deleteLoading}
              className="inline-flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-900/60 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg transition"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>

        {/* Publication Status Banner */}
        <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Visibility Status:{" "}
            </span>
            <span
              className={`font-semibold text-xs ml-1 ${
                isPublished ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {isPublished ? "Published (Live for Students)" : "Draft (Hidden from Catalog)"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer ${
              isPublished
                ? "bg-amber-950/70 border border-amber-800 text-amber-300 hover:bg-amber-900/80"
                : "bg-emerald-950/70 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/80"
            }`}
          >
            {isPublished ? (
              <>
                <EyeOff size={14} /> Unpublish to Draft
              </>
            ) : (
              <>
                <Eye size={14} /> Publish Course Live
              </>
            )}
          </button>
        </div>

        {/* Course Form */}
        <form onSubmit={handleEditCourse} className="space-y-6">
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
              Basic Course Information
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Course Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Course title"
                className="w-full bg-gray-950 border border-gray-700/80 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Short Subtitle
              </label>
              <input
                type="text"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                placeholder="Brief summary displayed under the title"
                className="w-full bg-gray-950 border border-gray-700/80 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Detailed Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what students will learn, prerequisites, and project outcomes..."
                className="w-full bg-gray-950 border border-gray-700/80 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Category / Level / Price Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700/80 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 min-h-[42px]"
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Difficulty Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700/80 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 min-h-[42px]"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Price (INR ₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700/80 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 min-h-[42px]"
                />
              </div>
            </div>
          </div>

          {/* Thumbnail Media Asset */}
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
              Course Thumbnail
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-full sm:w-64 aspect-video rounded-xl bg-black border border-gray-800 overflow-hidden flex items-center justify-center">
                {frontendImage ? (
                  <img
                    src={frontendImage}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-500">No image selected</span>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <label
                  htmlFor="thumbnail-upload"
                  className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-lg border border-gray-700 transition cursor-pointer"
                >
                  <UploadCloud size={16} /> Choose Image File
                </label>
                <input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnail}
                  className="sr-only"
                />
                <p className="text-[11px] text-gray-400">
                  Recommended size: 1280x720 (16:9 ratio). JPEG, PNG, or WebP.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/courses")}
              className="bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs sm:text-sm font-medium px-5 py-2.5 rounded-lg border border-gray-800 transition"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="px-6"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditCourse;
