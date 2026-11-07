import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Video,
  Trash2,
  Eye,
  EyeOff,
  UploadCloud,
  FileText,
  Plus,
  Download,
  BookOpen,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { setCourseData } from "../../redux/courseSlice";
import Button from "../../components/common/Button";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const CATEGORIES = [
  "Development",
  "Physics",
  "Cyber Security",
  "Business",
  "AI/ML",
  "Data Science",
  "UI/UX Design",
  "Cloud & DevOps",
  "Engineering",
];

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

function EditCourse() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const dispatch = useDispatch();
  const { courseData } = useSelector((state) => state.course);

  // Active Tab: "overview" | "resources"
  const [activeTab, setActiveTab] = useState("overview");

  // Course Fields
  const [title, setTitle] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [price, setPrice] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [frontendImage, setFrontendImage] = useState("");
  const [backendImage, setBackendImage] = useState(null);
  const [courseLectures, setCourseLectures] = useState([]);

  // Resource Upload Form State
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceTopic, setResourceTopic] = useState("General");
  const [resourceType, setResourceType] = useState("pdf");
  const [resourceLectureId, setResourceLectureId] = useState("");
  const [resourceFile, setResourceFile] = useState(null);
  const [resourceUploading, setResourceUploading] = useState(false);

  // Resource List State
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

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
        setCourseLectures(course.lectures || []);
      }
    } catch (error) {
      console.error("[EditCourse Error]", error);
      toast.error("Failed to fetch course details");
    } finally {
      setFetching(false);
    }
  };

  const loadResources = async () => {
    try {
      setResourcesLoading(true);
      const res = await api.get(`/api/resource/course/${courseId}`);
      if (res.data?.success) {
        setResources(res.data.resources || []);
      }
    } catch (err) {
      console.warn("[EditCourse] Resource load error:", err.message);
    } finally {
      setResourcesLoading(false);
    }
  };

  useEffect(() => {
    getCourseById();
    loadResources();
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

      if (Array.isArray(courseData)) {
        const updatedList = courseData.map((c) => (c._id === courseId ? updated : c));
        if (!courseData.some((c) => c._id === courseId) && updated.isPublished) {
          updatedList.push(updated);
        }
        dispatch(setCourseData(updatedList));
      }

      toast.success("Course updated successfully!");
      navigate("/courses");
    } catch (error) {
      console.error("[EditCourse Save Error]", error);
      toast.error(error.response?.data?.message || "Failed to update course");
    } finally {
      setLoading(false);
    }
  };

  // Upload Resource Handler
  const handleUploadResource = async (e) => {
    e.preventDefault();
    if (!resourceTitle.trim()) {
      toast.error("Please provide a resource title");
      return;
    }
    if (!resourceFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setResourceUploading(true);
    const formData = new FormData();
    formData.append("courseId", courseId);
    formData.append("title", resourceTitle.trim());
    formData.append("topic", resourceTopic.trim());
    formData.append("type", resourceType);
    if (resourceLectureId) {
      formData.append("lectureId", resourceLectureId);
    }
    formData.append("file", resourceFile);

    try {
      const res = await api.post("/api/resource/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        toast.success("Resource uploaded successfully!");
        setResourceTitle("");
        setResourceTopic("General");
        setResourceFile(null);
        setResourceLectureId("");
        loadResources();
      }
    } catch (err) {
      console.error("[UploadResource Error]", err);
      toast.error(err.response?.data?.message || "Failed to upload resource");
    } finally {
      setResourceUploading(false);
    }
  };

  // Delete Resource Handler
  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;

    try {
      await api.delete(`/api/resource/${resourceId}`);
      toast.success("Resource deleted");
      setResources((prev) => prev.filter((r) => r._id !== resourceId));
    } catch (err) {
      toast.error("Failed to delete resource");
    }
  };

  const handleRemoveCourse = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this course, all its lectures, and all attached notes?")) {
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
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col">
      <Navbar />

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 flex-1">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e8e5dc]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/courses")}
              className="p-1.5 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] transition cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1c1917] tracking-tight">
                Course Studio & Asset Manager
              </h1>
              <p className="text-xs text-[#78716c]">
                Configure curriculum, lecture videos, notes, and resources
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/createlecture/${courseId}`)}
              className="inline-flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs"
            >
              <Video size={16} />
              Manage Lectures ({courseLectures.length})
            </button>
            <button
              onClick={handleRemoveCourse}
              disabled={deleteLoading}
              className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              <Trash2 size={15} />
              Delete Course
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-[#e8e5dc]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === "overview"
                ? "border-[#1e3a8a] text-[#1e3a8a]"
                : "border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            Course Overview & Settings
          </button>
          <button
            onClick={() => setActiveTab("resources")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === "resources"
                ? "border-[#1e3a8a] text-[#1e3a8a]"
                : "border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <FileText size={15} />
            Notes & Resources ({resources.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW & SETTINGS */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Publication Status Banner */}
            <div className="p-4 rounded-2xl bg-white border border-[#e8e5dc] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                  Catalog Visibility:{" "}
                </span>
                <span
                  className={`font-bold text-xs ml-1 ${
                    isPublished ? "text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200" : "text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200"
                  }`}
                >
                  {isPublished ? "Published (Live)" : "Draft (Hidden from Catalog)"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer ${
                  isPublished
                    ? "bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100"
                    : "bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
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
              <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">
                  Basic Information
                </h2>

                {/* Title */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Modern Full-Stack System Design"
                    className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                  />
                </div>

                {/* Subtitle */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    Short Subtitle
                  </label>
                  <input
                    type="text"
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    placeholder="Brief summary displayed under the title"
                    className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    Detailed Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what students will learn, prerequisites, and milestone outcomes..."
                    className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl p-3 text-[#1c1917] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                  />
                </div>

                {/* Category / Level / Price Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-3 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                    >
                      <option value="">Select Category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                      Difficulty Level
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-3 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                    >
                      {LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                      Price (INR ₹ - 0 for Free)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Thumbnail Media Asset */}
              <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">
                  Course Thumbnail
                </h2>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-full sm:w-64 aspect-video rounded-2xl bg-[#faf9f6] border border-[#d6d3c9] overflow-hidden flex items-center justify-center">
                    {frontendImage ? (
                      <img
                        src={frontendImage}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[#78716c]">No image selected</span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <label
                      htmlFor="thumbnail-upload"
                      className="inline-flex items-center gap-2 bg-[#f2efe9] hover:bg-[#ebe7df] text-[#1c1917] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border border-[#d6d3c9] transition cursor-pointer"
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
                    <p className="text-[11px] text-[#78716c]">
                      Recommended: 1280x720 (16:9 ratio). JPEG, PNG, or WebP.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/courses")}
                  className="bg-white hover:bg-[#f2efe9] text-[#57534e] text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl border border-[#d6d3c9] transition cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  className="px-6 bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold rounded-xl shadow-xs"
                >
                  Save Course Changes
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: NOTES & RESOURCES MANAGEMENT */}
        {activeTab === "resources" && (
          <div className="space-y-6">
            {/* Upload New Resource Form */}
            <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="space-y-1 pb-3 border-b border-[#f2efe9]">
                <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
                  <UploadCloud size={18} className="text-[#1e3a8a]" />
                  Upload Course or Lecture Resource
                </h2>
                <p className="text-xs text-[#78716c]">
                  Attach lecture notes, formula sheets, problem sets, or code repositories.
                </p>
              </div>

              <form onSubmit={handleUploadResource} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                      Resource Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={resourceTitle}
                      onChange={(e) => setResourceTitle(e.target.value)}
                      placeholder="e.g. Physics Formula Sheet Chapter 1"
                      className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                    />
                  </div>

                  {/* Topic */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                      Topic / Module
                    </label>
                    <input
                      type="text"
                      value={resourceTopic}
                      onChange={(e) => setResourceTopic(e.target.value)}
                      placeholder="e.g. Mechanics, Thermodynamics"
                      className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                      Resource Type
                    </label>
                    <select
                      value={resourceType}
                      onChange={(e) => setResourceType(e.target.value)}
                      className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                    >
                      <option value="pdf">PDF Document</option>
                      <option value="notes">Lecture Notes</option>
                      <option value="formula_sheet">Formula Sheet</option>
                      <option value="code">Code / Project Files</option>
                      <option value="file">General File</option>
                    </select>
                  </div>

                  {/* Link to specific lecture (optional) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                      Associate with Lecture (Optional)
                    </label>
                    <select
                      value={resourceLectureId}
                      onChange={(e) => setResourceLectureId(e.target.value)}
                      className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                    >
                      <option value="">Course-Level (All Lectures)</option>
                      {courseLectures.map((lec, idx) => (
                        <option key={lec._id} value={lec._id}>
                          Lecture {idx + 1}: {lec.lectureTitle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File picker */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    File to Upload (PDF, Word, Zip, Code) *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setResourceFile(e.target.files[0])}
                    className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl p-2 text-xs text-[#1c1917] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1e3a8a] file:text-white cursor-pointer"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={resourceUploading}
                    className="bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold"
                  >
                    Upload Resource
                  </Button>
                </div>
              </form>
            </div>

            {/* List of Uploaded Resources */}
            <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#1c1917]">
                Existing Course Resources ({resources.length})
              </h3>

              {resourcesLoading ? (
                <p className="text-xs text-[#78716c] py-4 text-center">Loading resources...</p>
              ) : resources.length > 0 ? (
                <div className="divide-y divide-[#f2efe9]">
                  {resources.map((r) => (
                    <div
                      key={r._id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-[#1e3a8a] shrink-0" />
                          <h4 className="text-xs sm:text-sm font-bold text-[#1c1917]">{r.title}</h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#78716c]">
                          <span className="uppercase font-mono bg-[#f2efe9] px-1.5 py-0.5 rounded border border-[#e8e5dc] font-bold">
                            {r.type}
                          </span>
                          {r.topic && <span>• Topic: {r.topic}</span>}
                          {r.fileSize && <span>• {r.fileSize}</span>}
                          {r.lectureId?.lectureTitle ? (
                            <span className="text-[#1e3a8a] font-medium">
                              • Attached to: {r.lectureId.lectureTitle}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">• Course-Level</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-[#d6d3c9] text-[#1e3a8a] hover:bg-blue-50 text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Download size={13} /> View / Download
                        </a>
                        <button
                          onClick={() => handleDeleteResource(r._id)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#78716c] py-6 text-center">
                  No resources uploaded yet. Use the form above to add notes, cheat sheets, and study materials.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default EditCourse;
