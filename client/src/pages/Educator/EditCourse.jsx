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
  CreditCard,
  Settings,
  Layers,
  Save,
  ExternalLink,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { setCourseData } from "../../redux/courseSlice";
import Button from "../../components/common/Button";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import WriteWithAIModal from "../../components/WriteWithAIModal";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const SUGGESTED_TOPICS = [
  "General",
  "Spoken English",
  "Grammar",
  "Physics",
  "Mathematics",
  "Programming",
  "Exam Preparation",
  "Business & Career",
];

function EditCourse() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const dispatch = useDispatch();
  const { courseData } = useSelector((state) => state.course);

  // Workflow steps: "info" | "curriculum" | "resources" | "pricing" | "publish"
  const [activeTab, setActiveTab] = useState("info");

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

  // Write With AI Modal State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiFieldTarget, setAiFieldTarget] = useState("all");

  const handleApplyAIGenerated = (fields) => {
    if (fields.title) setTitle(fields.title);
    if (fields.subTitle) setSubTitle(fields.subTitle);
    if (fields.description) setDescription(fields.description);
    if (fields.category) setCategory(fields.category);
    if (fields.level) setLevel(fields.level);
    if (typeof fields.price === "number" && fields.price > 0) setPrice(fields.price);
  };

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

  const handleSaveCourse = async (e, shouldNotify = true) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      toast.error("Course title is required");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("subTitle", subTitle.trim());
    formData.append("description", description.trim());
    formData.append("category", category.trim() || "General");
    formData.append("level", level);
    formData.append("price", Number(price) || 0);
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

      if (shouldNotify) {
        toast.success("Changes saved successfully!");
      }
    } catch (error) {
      console.error("[EditCourse Save Error]", error);
      toast.error(error.response?.data?.message || "Failed to update course");
    } finally {
      setLoading(false);
    }
  };

  // Toggle publish state and save immediately
  const togglePublishState = async () => {
    const nextState = !isPublished;
    setIsPublished(nextState);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("subTitle", subTitle.trim());
    formData.append("description", description.trim());
    formData.append("category", category.trim() || "General");
    formData.append("level", level);
    formData.append("price", Number(price) || 0);
    formData.append("isPublished", nextState);

    try {
      await api.post(`/api/course/editcourse/${courseId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(
        nextState
          ? "Course published! It is now visible to students in your academy."
          : "Course moved to Draft. It is now hidden from public students."
      );
    } catch (err) {
      toast.error("Failed to update publication status");
      setIsPublished(!nextState); // rollback
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
        toast.success("Resource attached successfully!");
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

  // Delete Course Permanently
  const handleRemoveCourse = async () => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this course, its lectures, and all attached study resources? This cannot be undone."
      )
    ) {
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
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 flex-1">
        {/* Top Header & Sticky Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e8e5dc]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/courses")}
              className="p-2 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer"
              aria-label="Back to courses"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight truncate max-w-md">
                  {title || "Course Studio"}
                </h1>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${isPublished
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                >
                  {isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <p className="text-xs text-[#78716c] mt-0.5">
                {courseLectures.length} {courseLectures.length === 1 ? "lecture" : "lectures"} •{" "}
                {resources.length} {resources.length === 1 ? "resource" : "resources"} attached
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAiFieldTarget("all");
                setShowAIModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-xs font-semibold text-[#1e3a8a] transition cursor-pointer shadow-xs"
            >
              <Sparkles size={13} className="text-[#1e3a8a]" />
              <span>Write with AI</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/viewcourse/${courseId}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#d6d3d1] bg-white hover:bg-[#f1ede4] text-xs font-semibold text-[#44403c] transition cursor-pointer"
            >
              <ExternalLink size={14} /> Preview
            </button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={loading}
              onClick={(e) => handleSaveCourse(e, true)}
              className="!bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold px-4 py-2 rounded-xl shadow-xs"
            >
              <Save size={14} className="inline-block mr-2" /> Save Changes
            </Button>
          </div>
        </div>

        {/* 5-Step Progressive Studio Workflow Navigation */}
        <div className="flex items-center gap-1 border-b border-[#e8e5dc] overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${activeTab === "info"
                ? "border-[#1e3a8a] text-[#1e3a8a]"
                : "border-transparent text-[#78716c] hover:text-[#1c1917]"
              }`}
          >
            <BookOpen size={15} />
            <span>1. Course Information</span>
          </button>

          <button
            onClick={() => setActiveTab("curriculum")}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${activeTab === "curriculum"
                ? "border-[#1e3a8a] text-[#1e3a8a]"
                : "border-transparent text-[#78716c] hover:text-[#1c1917]"
              }`}
          >
            <Video size={15} />
            <span>2. Lectures ({courseLectures.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("resources")}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${activeTab === "resources"
                ? "border-[#1e3a8a] text-[#1e3a8a]"
                : "border-transparent text-[#78716c] hover:text-[#1c1917]"
              }`}
          >
            <FileText size={15} />
            <span>3. Notes & Resources ({resources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pricing")}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${activeTab === "pricing"
                ? "border-[#1e3a8a] text-[#1e3a8a]"
                : "border-transparent text-[#78716c] hover:text-[#1c1917]"
              }`}
          >
            <CreditCard size={15} />
            <span>4. Pricing & Access</span>
          </button>

          <button
            onClick={() => setActiveTab("publish")}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${activeTab === "publish"
                ? "border-[#1e3a8a] text-[#1e3a8a]"
                : "border-transparent text-[#78716c] hover:text-[#1c1917]"
              }`}
          >
            <Eye size={15} />
            <span>5. Visibility & Publish</span>
          </button>
        </div>

        {/* STEP 1: COURSE INFORMATION */}
        {activeTab === "info" && (
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-[#1c1917]">Course Fundamentals</h2>
              <p className="text-xs text-[#78716c] mt-0.5">
                Set title, subject, headline, and course thumbnail
              </p>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                  Course Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Practical Spoken English"
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
                />
              </div>

              {/* Subtitle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c]">
                    Headline / Brief Subtitle
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAiFieldTarget("subTitle");
                      setShowAIModal(true);
                    }}
                    className="text-[11px] font-semibold text-[#1e3a8a] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} /> Suggest
                  </button>
                </div>
                <input
                  type="text"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="e.g. Real-world speaking drills, vocabulary, and grammar confidence"
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
                />
              </div>

              {/* Subject / Topic + Difficulty Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                    Subject or Topic
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Spoken English, Mechanics, React..."
                    className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {SUGGESTED_TOPICS.slice(0, 5).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCategory(t)}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#f8f7f4] border border-[#e8e5dc] text-[#57534e] hover:bg-[#f1ede4] cursor-pointer"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c]">
                    Detailed Course Description
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAiFieldTarget("description");
                      setShowAIModal(true);
                    }}
                    className="text-[11px] font-semibold text-[#1e3a8a] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} /> Write with AI
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the course curriculum, learning outcomes, required background, and target students..."
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl p-3 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
                />
              </div>

              {/* Thumbnail */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-2">
                  Course Thumbnail Image
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="w-full sm:w-60 aspect-video rounded-xl bg-[#f8f7f4] border border-[#d6d3d1] overflow-hidden flex items-center justify-center">
                    {frontendImage ? (
                      <img
                        src={frontendImage}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[#a8a29e]">No image chosen</span>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <label
                      htmlFor="thumbnail-upload"
                      className="inline-flex items-center gap-2 bg-[#faf8f5] hover:bg-[#f1ede4] text-[#1c1917] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#d6d3d1] transition cursor-pointer"
                    >
                      <UploadCloud size={16} /> Choose Image
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
            </div>

            <div className="pt-4 border-t border-[#e8e5dc] flex items-center justify-between">
              <span className="text-xs text-[#78716c]">Step 1 of 5</span>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  handleSaveCourse(null, false);
                  setActiveTab("curriculum");
                }}
                className="!bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold px-5 py-2.5 rounded-xl"
              >
                Save & Continue to Lectures →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: CURRICULUM & LECTURES */}
        {activeTab === "curriculum" && (
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e8e5dc]">
              <div>
                <h2 className="text-base font-bold text-[#1c1917]">Course Lectures & Video Lessons</h2>
                <p className="text-xs text-[#78716c] mt-0.5">
                  Organize video lessons. Mark introductory lessons as free preview for prospective students.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/createlecture/${courseId}`)}
                className="inline-flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Plus size={16} /> Add New Lecture
              </button>
            </div>

            {courseLectures.length === 0 ? (
              <div className="text-center py-12 px-6 bg-[#faf8f5] rounded-xl border border-[#e8e5dc] space-y-3">
                <Video size={36} className="mx-auto text-[#a8a29e]" />
                <h3 className="text-sm font-bold text-[#1c1917]">No lectures uploaded yet</h3>
                <p className="text-xs text-[#78716c] max-w-sm mx-auto">
                  Add your first video lecture to start building the curriculum for your students.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/createlecture/${courseId}`)}
                  className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Upload Lecture 1
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#f1ede4]">
                {courseLectures.map((lec, idx) => (
                  <div
                    key={lec._id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#eff6ff] text-[#1e3a8a] text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-semibold text-[#1c1917]">
                          {lec.lectureTitle}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#78716c] pl-8">
                        {lec.isPreviewFree ? (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Free Preview Available
                          </span>
                        ) : (
                          <span className="text-[#78716c]">Locked (Enrollment Required)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto pl-8 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/editlecture/${courseId}/${lec._id}`)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#d6d3d1] hover:bg-[#f1ede4] text-[#44403c] transition cursor-pointer"
                      >
                        Edit Video
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-[#e8e5dc] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className="text-xs text-[#78716c] hover:text-[#1c1917] font-semibold"
              >
                ← Back to Information
              </button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setActiveTab("resources")}
                className="!bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold px-5 py-2.5 rounded-xl"
              >
                Continue to Notes & Resources →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: NOTES & RESOURCES */}
        {activeTab === "resources" && (
          <div className="space-y-6">
            {/* Upload New Resource Form */}
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="pb-3 border-b border-[#e8e5dc]">
                <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
                  <UploadCloud size={18} className="text-[#1e3a8a]" />
                  Upload Course Notes, Formula Sheets or Practice Files
                </h2>
                <p className="text-xs text-[#78716c] mt-0.5">
                  Attach PDF study sheets or notes at either the course level or to a specific lecture
                </p>
              </div>

              <form onSubmit={handleUploadResource} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                      Resource Title <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={resourceTitle}
                      onChange={(e) => setResourceTitle(e.target.value)}
                      placeholder="e.g. Vocabulary Checklist & Common Idioms"
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#1e3a8a] min-h-[42px]"
                    />
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                      Topic or Module
                    </label>
                    <input
                      type="text"
                      value={resourceTopic}
                      onChange={(e) => setResourceTopic(e.target.value)}
                      placeholder="e.g. Grammar Fundamentals, Mechanics"
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#1e3a8a] min-h-[42px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                      Resource Type
                    </label>
                    <select
                      value={resourceType}
                      onChange={(e) => setResourceType(e.target.value)}
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#1e3a8a] min-h-[42px]"
                    >
                      <option value="pdf">PDF Document</option>
                      <option value="notes">Lecture Notes</option>
                      <option value="formula_sheet">Formula Sheet / Cheat Sheet</option>
                      <option value="code">Code / Project Files</option>
                      <option value="file">General Study File</option>
                    </select>
                  </div>

                  {/* Lecture link */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                      Attach to Specific Lecture (Optional)
                    </label>
                    <select
                      value={resourceLectureId}
                      onChange={(e) => setResourceLectureId(e.target.value)}
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#1e3a8a] min-h-[42px]"
                    >
                      <option value="">Course-Level (Visible across all lectures)</option>
                      {courseLectures.map((lec, idx) => (
                        <option key={lec._id} value={lec._id}>
                          Lecture {idx + 1}: {lec.lectureTitle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                    File to Upload (PDF, Word, Zip, Code) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setResourceFile(e.target.files[0])}
                    className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl p-2 text-xs text-[#1c1917] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1e3a8a] file:text-white cursor-pointer"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={resourceUploading}
                    className="!bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold"
                  >
                    Upload Resource
                  </Button>
                </div>
              </form>
            </div>

            {/* List of Resources */}
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-[#1c1917]">
                Existing Study Resources ({resources.length})
              </h3>

              {resourcesLoading ? (
                <p className="text-xs text-[#78716c] py-4 text-center">Loading resources...</p>
              ) : resources.length > 0 ? (
                <div className="divide-y divide-[#f1ede4]">
                  {resources.map((r) => (
                    <div
                      key={r._id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-[#1e3a8a] shrink-0" />
                          <h4 className="text-xs sm:text-sm font-semibold text-[#1c1917]">{r.title}</h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#78716c]">
                          <span className="uppercase font-mono bg-[#f8f7f4] px-1.5 py-0.5 rounded border border-[#e8e5dc]">
                            {r.type}
                          </span>
                          {r.topic && <span>• Topic: {r.topic}</span>}
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
                          className="p-1.5 rounded-lg border border-[#d6d3d1] text-[#1e3a8a] hover:bg-[#eff6ff] text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Download size={13} /> View
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
                  No resources uploaded yet. Add lecture notes or cheat sheets above.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-[#e8e5dc] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("curriculum")}
                className="text-xs text-[#78716c] hover:text-[#1c1917] font-semibold"
              >
                ← Back to Lectures
              </button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setActiveTab("pricing")}
                className="!bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold px-5 py-2.5 rounded-xl"
              >
                Continue to Pricing →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: PRICING & ACCESS */}
        {activeTab === "pricing" && (
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-[#1c1917]">Enrollment & Pricing Model</h2>
              <p className="text-xs text-[#78716c] mt-0.5">
                Configure student access fees or offer this course as free open access
              </p>
            </div>

            <div className="space-y-4 max-w-lg">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrice(0)}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer ${!price || Number(price) === 0
                      ? "bg-[#eff6ff] border-[#1e3a8a] text-[#1e3a8a]"
                      : "bg-[#fcfbf9] border-[#e8e5dc] text-[#57534e] hover:bg-[#f1ede4]"
                    }`}
                >
                  <p className="text-sm font-bold">Free Course</p>
                  <p className="text-xs mt-1 opacity-80">Students enroll instantly with one click</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!price || Number(price) === 0) setPrice(499);
                  }}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer ${price && Number(price) > 0
                      ? "bg-[#eff6ff] border-[#1e3a8a] text-[#1e3a8a]"
                      : "bg-[#fcfbf9] border-[#e8e5dc] text-[#57534e] hover:bg-[#f1ede4]"
                    }`}
                >
                  <p className="text-sm font-bold">Paid Tuition</p>
                  <p className="text-xs mt-1 opacity-80">Enforces Razorpay payment before video access</p>
                </button>
              </div>

              {price && Number(price) > 0 ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                    Course Fee (INR ₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#78716c]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-8 pr-4 py-2.5 text-[#1c1917] text-sm font-bold focus:outline-none focus:border-[#1e3a8a] min-h-[44px]"
                    />
                  </div>
                  <p className="text-[11px] text-[#78716c] mt-1">
                    Protected videos and downloads will only unlock once payment verification succeeds.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-[#e8e5dc] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("resources")}
                className="text-xs text-[#78716c] hover:text-[#1c1917] font-semibold"
              >
                ← Back to Resources
              </button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  handleSaveCourse(null, false);
                  setActiveTab("publish");
                }}
                className="!bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold px-5 py-2.5 rounded-xl"
              >
                Continue to Publish & Visibility →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: VISIBILITY & PUBLISH */}
        {activeTab === "publish" && (
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-[#1c1917]">Publication & Student Visibility</h2>
              <p className="text-xs text-[#78716c] mt-0.5">
                Control whether this course is live in your catalog or safely kept in draft mode
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#faf8f5] border border-[#e8e5dc] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#78716c]">
                  Current Status
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold px-3 py-1 rounded-full border ${isPublished
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                  >
                    {isPublished ? "Published (Live to Students)" : "Draft (Hidden from Catalog)"}
                  </span>
                </div>
                <p className="text-xs text-[#78716c] pt-1">
                  {isPublished
                    ? "Students can discover this course, preview free lectures, enroll, and download materials."
                    : "Only instructors and administrators can view this course while it is under construction."}
                </p>
              </div>

              <button
                type="button"
                onClick={togglePublishState}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer min-h-[42px] ${isPublished
                    ? "bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100"
                    : "bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                  }`}
              >
                {isPublished ? (
                  <>
                    <EyeOff size={15} /> Switch to Draft
                  </>
                ) : (
                  <>
                    <Eye size={15} /> Publish Course Live
                  </>
                )}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="pt-6 border-t border-[#e8e5dc] space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700">Danger Zone</h3>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50/50 rounded-xl border border-rose-200">
                <div>
                  <p className="text-xs font-semibold text-rose-900">Permanently Delete Course</p>
                  <p className="text-[11px] text-rose-700">
                    Removes all associated lectures, video files, and student study resources.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCourse}
                  disabled={deleteLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shrink-0"
                >
                  Delete Course
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#e8e5dc] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("pricing")}
                className="text-xs text-[#78716c] hover:text-[#1c1917] font-semibold"
              >
                ← Back to Pricing
              </button>
              <button
                type="button"
                onClick={() => navigate("/courses")}
                className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
              >
                Done (Back to Courses)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Write With AI Modal */}
      <WriteWithAIModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onApply={handleApplyAIGenerated}
        currentFields={{ title, subTitle, description, category, level, price }}
        initialField={aiFieldTarget}
      />

      <Footer />
    </div>
  );
}

export default EditCourse;
