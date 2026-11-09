import React, { useEffect, useState, useRef } from "react";
import {
  ArrowLeft,
  Sparkles,
  Video,
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  ExternalLink,
  CreditCard,
  Save,
  Check,
  AlertCircle,
  PlayCircle,
  Download,
  Loader2,
  Layers,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { setCourseData, setCreatorCourseData } from "../../redux/courseSlice";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import WriteWithAIModal from "../../components/WriteWithAIModal";

const SUGGESTED_TOPICS = [
  "Spoken English",
  "Grammar",
  "Physics",
  "Mathematics",
  "Programming",
  "Exam Prep",
  "Business & Career",
  "General",
];

export default function CourseBuilder() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  // Course Primary State
  const [activeCourseId, setActiveCourseId] = useState(courseId !== "new" ? courseId : null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [subTitle, setSubTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [price, setPrice] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [resources, setResources] = useState([]);

  // Loading & Save states
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Draft"); // "Saved", "Saving...", "Unsaved changes"
  const [fetching, setFetching] = useState(courseId && courseId !== "new");

  // Inline Lecture Creation Form State
  const [showAddLecture, setShowAddLecture] = useState(false);
  const [newLectureTitle, setNewLectureTitle] = useState("");
  const [newLecturePreview, setNewLecturePreview] = useState(false);
  const [newLectureVideo, setNewLectureVideo] = useState(null);
  const [newLectureNote, setNewLectureNote] = useState(null);
  const [newLectureNoteTitle, setNewLectureNoteTitle] = useState("");
  const [addingLecture, setAddingLecture] = useState(false);

  // Inline Lecture Edit State
  const [editingLecture, setEditingLecture] = useState(null);
  const [editLectureTitle, setEditLectureTitle] = useState("");
  const [editLecturePreview, setEditLecturePreview] = useState(false);
  const [editLectureVideo, setEditLectureVideo] = useState(null);
  const [savingEditLecture, setSavingEditLecture] = useState(false);

  // AI Course Outline Generator Modal State
  const [showAIPlanModal, setShowAIPlanModal] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Write With AI Modal State
  const [showWriteAIModal, setShowWriteAIModal] = useState(false);
  const [aiFieldTarget, setAiFieldTarget] = useState("all");

  const handleApplyAIGenerated = (fields) => {
    if (fields.title) setTitle(fields.title);
    if (fields.subTitle) setSubTitle(fields.subTitle);
    if (fields.description) setDescription(fields.description);
    if (fields.category) setCategory(fields.category);
    if (fields.level) setLevel(fields.level);
    if (typeof fields.price === "number" && fields.price > 0) setPrice(fields.price);
    setSaveStatus("Unsaved changes");
  };

  // Fetch Course details if editing existing course
  const loadCourse = async (idToLoad) => {
    const targetId = idToLoad || activeCourseId;
    if (!targetId || targetId === "new") {
      setFetching(false);
      return;
    }

    try {
      setFetching(true);
      const res = await api.get(`/api/course/getcourse/${targetId}`);
      const course = res.data;
      if (course) {
        setActiveCourseId(course._id);
        setTitle(course.title || "");
        setCategory(course.category || "General");
        setSubTitle(course.subTitle || "");
        setDescription(course.description || "");
        setLevel(course.level || "Beginner");
        setPrice(course.price || 0);
        setIsPublished(Boolean(course.isPublished));
        setThumbnailPreview(course.thumbnail || "");
        setLectures(course.lectures || []);
        setSaveStatus(course.isPublished ? "Published" : "Draft saved");
      }

      // Also load attached resources
      try {
        const resRes = await api.get(`/api/resource/course/${targetId}`);
        if (resRes.data?.success) {
          setResources(resRes.data.resources || []);
        }
      } catch (e) {
        // no resources yet
      }
    } catch (err) {
      console.error("[CourseBuilder Load Error]", err);
      toast.error("Failed to load course details");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (courseId && courseId !== "new") {
      loadCourse(courseId);
    } else {
      setFetching(false);
    }
  }, [courseId]);

  // Thumbnail change handler
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setSaveStatus("Unsaved changes");
    }
  };

  // Save or Create Course Draft
  const handleSaveCourse = async (publishIntent = null, silent = false) => {
    if (!title.trim()) {
      toast.error("Please enter a course title");
      return null;
    }

    setLoading(true);
    setSaveStatus("Saving...");

    const finalPublished =
      publishIntent !== null ? publishIntent : isPublished;

    try {
      let savedCourseId = activeCourseId;

      if (!activeCourseId) {
        // Create initial course draft
        const { data } = await api.post("/api/course/create", {
          title: title.trim(),
          category: category.trim() || "General",
          subTitle: subTitle.trim(),
          description: description.trim(),
          level,
          price: Number(price) || 0,
          isPublished: finalPublished,
        });
        savedCourseId = data._id;
        setActiveCourseId(data._id);
      }

      // Update details & thumbnail
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("category", category.trim() || "General");
      formData.append("subTitle", subTitle.trim());
      formData.append("description", description.trim());
      formData.append("level", level);
      formData.append("price", Number(price) || 0);
      formData.append("isPublished", finalPublished);

      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }

      const res = await api.post(`/api/course/editcourse/${savedCourseId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data;
      setIsPublished(finalPublished);
      setSaveStatus(finalPublished ? "Published (Live)" : "Draft saved");

      // Update Creator Courses in Redux
      try {
        const creatorRes = await api.get("/api/course/getcreator");
        dispatch(setCreatorCourseData(creatorRes.data));
      } catch (e) {
        // ignore
      }

      if (!silent) {
        toast.success(
          finalPublished
            ? "Course is live! Students can now view and enroll."
            : "Course draft saved successfully."
        );
      }

      return updated;
    } catch (err) {
      console.error("[CourseBuilder Save Error]", err);
      toast.error(err.response?.data?.message || "Failed to save course");
      setSaveStatus("Unsaved changes");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // In-place Lecture Creation
  const handleAddLecture = async (e) => {
    e?.preventDefault();
    if (!newLectureTitle.trim()) {
      toast.error("Please enter a lecture title");
      return;
    }

    setAddingLecture(true);

    try {
      let targetId = activeCourseId;
      if (!targetId) {
        const saved = await handleSaveCourse(false, true);
        if (!saved) {
          setAddingLecture(false);
          return;
        }
        targetId = saved._id;
      }

      const formData = new FormData();
      formData.append("lectureTitle", newLectureTitle.trim());
      formData.append("isPreviewFree", newLecturePreview);

      if (newLectureVideo) {
        formData.append("video", newLectureVideo);
      }

      if (newLectureNote && newLectureNoteTitle.trim()) {
        formData.append("resourceTitle", newLectureNoteTitle.trim());
        formData.append("resourceFileUrl", URL.createObjectURL(newLectureNote)); // fallback placeholder
      }

      const res = await api.post(`/api/course/createlecture/${targetId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newLec = res.data.lecture;

      // If a study note file was chosen, upload directly to resource endpoint
      if (newLectureNote && newLec?._id) {
        try {
          const resFormData = new FormData();
          resFormData.append("courseId", targetId);
          resFormData.append("lectureId", newLec._id);
          resFormData.append("title", newLectureNoteTitle.trim() || `${newLectureTitle.trim()} Notes`);
          resFormData.append("topic", category || "General");
          resFormData.append("type", "pdf");
          resFormData.append("file", newLectureNote);

          await api.post("/api/resource/upload", resFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (resErr) {
          console.warn("[Attach Resource Error]", resErr);
        }
      }

      toast.success(`Lecture "${newLectureTitle}" added!`);
      setNewLectureTitle("");
      setNewLecturePreview(false);
      setNewLectureVideo(null);
      setNewLectureNote(null);
      setNewLectureNoteTitle("");
      setShowAddLecture(false);

      // Refresh lectures in-place
      loadCourse(targetId);
    } catch (err) {
      console.error("[AddLecture Error]", err);
      toast.error(err.response?.data?.message || "Failed to add lecture");
    } finally {
      setAddingLecture(false);
    }
  };

  // In-place Lecture Editing
  const handleSaveEditLecture = async () => {
    if (!editingLecture || !editLectureTitle.trim()) return;

    setSavingEditLecture(true);
    try {
      const formData = new FormData();
      formData.append("lectureTitle", editLectureTitle.trim());
      formData.append("isPreviewFree", editLecturePreview);

      if (editLectureVideo) {
        formData.append("videoUrl", editLectureVideo);
      }

      await api.post(`/api/course/editlecture/${editingLecture._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Lecture updated!");
      setEditingLecture(null);
      loadCourse(activeCourseId);
    } catch (err) {
      toast.error("Failed to update lecture");
    } finally {
      setSavingEditLecture(false);
    }
  };

  // In-place Lecture Deletion
  const handleDeleteLecture = async (lectureId, lectureTitle) => {
    if (!window.confirm(`Delete lecture "${lectureTitle}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/course/removelecture/${lectureId}`);
      toast.success("Lecture deleted");
      setLectures((prev) => prev.filter((l) => l._id !== lectureId));
    } catch (err) {
      toast.error("Failed to delete lecture");
    }
  };

  // AI Curriculum Generator Handler
  const handleGenerateAICurriculum = async () => {
    if (!aiTopic.trim()) {
      toast.error("Please enter a subject or topic for the course");
      return;
    }

    setAiGenerating(true);
    try {
      const res = await api.post("/api/ai/plan", {
        topic: aiTopic.trim(),
        level,
        lectureCount: 5,
      });

      if (res.data?.success && res.data?.plan) {
        const plan = res.data.plan;
        setTitle(plan.title);
        setCategory(plan.category);
        setSubTitle(plan.subTitle);
        setDescription(plan.description);

        setShowAIPlanModal(false);
        setSaveStatus("Unsaved changes");
        toast.success(`Generated curriculum plan for "${plan.title}"! Click 'Save Draft' to persist.`);
      }
    } catch (err) {
      toast.error("Failed to generate plan");
    } finally {
      setAiGenerating(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <Loader2 size={32} className="animate-spin text-[#1e3a8a]" />
          <p className="text-xs font-semibold text-[#78716c] uppercase tracking-wider">
            Loading Course Builder Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 flex-1 pb-28 md:pb-12">
        {/* Workspace Sticky Top Bar */}
        <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-20 z-30 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/courses")}
              className="p-2 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer shrink-0"
              title="Back to courses"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-[#1c1917] truncate max-w-sm sm:max-w-md">
                  {title || "Untitled Course Builder"}
                </h1>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${isPublished
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                >
                  {isPublished ? "Published (Live)" : "Draft"}
                </span>
              </div>
              <p className="text-[11px] text-[#78716c] flex items-center gap-1.5 mt-0.5">
                <Check size={12} className="text-emerald-600" />
                <span>{saveStatus}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAiFieldTarget("all");
                setShowWriteAIModal(true);
              }}
              className="inline-flex items-center gap-1.5 bg-[#eff6ff] hover:bg-blue-100 text-[#1e3a8a] text-xs font-semibold px-3 py-2 rounded-xl border border-[#bfdbfe] transition cursor-pointer"
            >
              <Sparkles size={14} className="text-[#1e3a8a]" />
              <span>Write with AI</span>
            </button>

            {activeCourseId && (
              <button
                type="button"
                onClick={() => navigate(`/viewcourse/${activeCourseId}`)}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-[#f1ede4] text-[#44403c] text-xs font-semibold px-3 py-2 rounded-xl border border-[#d6d3d1] transition cursor-pointer"
                title="Preview student view"
              >
                <Eye size={14} />
                <span className="hidden sm:inline">Preview</span>
              </button>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSaveCourse(false)}
              className="bg-white hover:bg-[#f1ede4] text-[#1c1917] border border-[#d6d3d1] text-xs font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              Save Draft
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSaveCourse(!isPublished)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 ${isPublished
                ? "bg-amber-700 hover:bg-amber-800 text-white"
                : "bg-[#1e3a8a] hover:bg-[#172554] text-white"
                }`}
            >
              {isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{isPublished ? "Unpublish to Draft" : "Publish Course"}</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: COURSE BASICS */}
        <section className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="pb-3 border-b border-[#e8e5dc]">
            <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center text-xs font-bold">
                1
              </span>
              Course Essentials
            </h2>
            <p className="text-xs text-[#78716c] mt-0.5">
              Set the course title, topic, subtitle, and visual cover
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                Course Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSaveStatus("Unsaved changes");
                }}
                placeholder="e.g. Practical Spoken English for Everyday Life"
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 sm:py-3 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                  Subject or Topic
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSaveStatus("Unsaved changes");
                  }}
                  placeholder="e.g. Spoken English, Mechanics, React..."
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] min-h-[44px]"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {SUGGESTED_TOPICS.slice(0, 5).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setCategory(t);
                        setSaveStatus("Unsaved changes");
                      }}
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
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setSaveStatus("Unsaved changes");
                  }}
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] min-h-[44px]"
                >
                  <option value="Beginner">Beginner (Foundation)</option>
                  <option value="Intermediate">Intermediate (Practicing)</option>
                  <option value="Advanced">Advanced (Expert)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c]">
                  Brief Headline (Subtitle)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAiFieldTarget("subTitle");
                    setShowWriteAIModal(true);
                  }}
                  className="text-[11px] font-semibold text-[#1e3a8a] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={11} /> Suggest
                </button>
              </div>
              <input
                type="text"
                value={subTitle}
                onChange={(e) => {
                  setSubTitle(e.target.value);
                  setSaveStatus("Unsaved changes");
                }}
                placeholder="e.g. Build confidence in daily conversations, correct grammar, and vocabulary drills"
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] min-h-[44px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c]">
                  Course Description
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAiFieldTarget("description");
                    setShowWriteAIModal(true);
                  }}
                  className="text-[11px] font-semibold text-[#1e3a8a] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={11} /> Write with AI
                </button>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSaveStatus("Unsaved changes");
                }}
                placeholder="Describe what your students will learn, who this is for, and key outcomes..."
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl p-3 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                Cover Thumbnail Image
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-full sm:w-56 aspect-video rounded-xl bg-[#f8f7f4] border border-[#d6d3d1] overflow-hidden flex items-center justify-center">
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-[#a8a29e]">No cover image chosen</span>
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <label
                    htmlFor="course-thumbnail-file"
                    className="inline-flex items-center gap-2 bg-[#faf8f5] hover:bg-[#f1ede4] text-[#1c1917] text-xs font-semibold px-4 py-2 rounded-xl border border-[#d6d3d1] transition cursor-pointer"
                  >
                    <UploadCloud size={15} /> Choose Photo
                  </label>
                  <input
                    id="course-thumbnail-file"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="sr-only"
                  />
                  <p className="text-[11px] text-[#78716c]">
                    Recommended 16:9 ratio (e.g. 1280x720) in JPG, PNG, or WebP.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: CURRICULUM & LECTURES (INLINE CREATION & EDITING) */}
        <section className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e8e5dc]">
            <div>
              <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center text-xs font-bold">
                  2
                </span>
                Course Curriculum ({lectures.length} {lectures.length === 1 ? "Lecture" : "Lectures"})
              </h2>
              <p className="text-xs text-[#78716c] mt-0.5">
                Add video lessons and lecture notes directly inside this workspace
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddLecture(!showAddLecture)}
              className="inline-flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus size={15} />
              <span>{showAddLecture ? "Close Lecture Form" : "Add New Lecture"}</span>
            </button>
          </div>

          {/* INLINE ADD LECTURE CARD */}
          {showAddLecture && (
            <form
              onSubmit={handleAddLecture}
              className="p-5 rounded-2xl bg-[#eff6ff]/40 border border-[#bfdbfe] space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1e3a8a] flex items-center gap-1.5">
                  <Video size={16} />
                  New Lecture Details
                </h3>
                <span className="text-[11px] text-[#78716c]">Step 1: Save lecture & attach video</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403c] mb-1">
                  Lecture Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newLectureTitle}
                  onChange={(e) => setNewLectureTitle(e.target.value)}
                  placeholder="e.g. 1. Introduction & Pronunciation Basics"
                  className="w-full bg-white border border-[#d6d3d1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#1e3a8a] min-h-[42px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Video Picker */}
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
                    Lesson Video File (MP4, WebM)
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setNewLectureVideo(e.target.files[0])}
                    className="w-full bg-white border border-[#d6d3d1] rounded-xl p-2 text-xs text-[#1c1917] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1e3a8a] file:text-white cursor-pointer"
                  />
                  <p className="text-[10px] text-[#78716c] mt-0.5">
                    Optional: You can also upload or replace the video file later.
                  </p>
                </div>

                {/* Optional Note / PDF Picker */}
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
                    Attached Study Notes / PDF (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setNewLectureNote(file);
                      if (file && !newLectureNoteTitle) {
                        setNewLectureNoteTitle(`${newLectureTitle || "Lecture"} Notes`);
                      }
                    }}
                    className="w-full bg-white border border-[#d6d3d1] rounded-xl p-2 text-xs text-[#1c1917] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-700 file:text-white cursor-pointer"
                  />
                  {newLectureNote && (
                    <input
                      type="text"
                      value={newLectureNoteTitle}
                      onChange={(e) => setNewLectureNoteTitle(e.target.value)}
                      placeholder="Resource title (e.g. Vocabulary Checklist.pdf)"
                      className="w-full mt-1.5 bg-white border border-[#d6d3d1] rounded-lg px-2.5 py-1 text-xs text-[#1c1917]"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#bfdbfe]/60">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#44403c] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newLecturePreview}
                    onChange={(e) => setNewLecturePreview(e.target.checked)}
                    className="rounded border-[#d6d3d1] text-[#1e3a8a] focus:ring-[#1e3a8a] h-4 w-4"
                  />
                  <span>Free Preview Lesson (Unenrolled students can watch)</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLecture(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#d6d3d1] text-xs font-medium text-[#78716c] hover:bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={addingLecture}
                    className="!bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold px-4 py-1.5 rounded-lg"
                  >
                    Save Lecture
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* LECTURE LIST IN-PLACE */}
          {lectures.length === 0 ? (
            <div className="text-center py-10 px-6 bg-[#faf8f5] rounded-xl border border-[#e8e5dc] space-y-2">
              <Video size={32} className="mx-auto text-[#a8a29e]" />
              <h3 className="text-sm font-bold text-[#1c1917]">No lectures yet</h3>
              <p className="text-xs text-[#78716c] max-w-sm mx-auto">
                Click "+ Add New Lecture" above to create your first lesson. No separate page navigation needed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#f1ede4]">
              {lectures.map((lec, idx) => (
                <div
                  key={lec._id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-[#eff6ff] text-[#1e3a8a] text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs sm:text-sm font-semibold text-[#1c1917] truncate">
                        {lec.lectureTitle}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#78716c] pl-8">
                      {lec.videoUrl ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                          <CheckCircle2 size={11} /> Video Attached
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                          Pending Video Upload
                        </span>
                      )}

                      {lec.isPreviewFree ? (
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                          Free Preview
                        </span>
                      ) : (
                        <span>Locked (Enrolled Only)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto pl-8 sm:pl-0 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLecture(lec);
                        setEditLectureTitle(lec.lectureTitle);
                        setEditLecturePreview(Boolean(lec.isPreviewFree));
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#d6d3d1] hover:bg-[#f1ede4] text-xs font-semibold text-[#44403c] transition cursor-pointer"
                    >
                      Edit Lesson
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLecture(lec._id, lec.lectureTitle)}
                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs transition cursor-pointer"
                      title="Delete Lecture"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3: PRICING & VISIBILITY */}
        <section className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="pb-3 border-b border-[#e8e5dc]">
            <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center text-xs font-bold">
                3
              </span>
              Pricing & Catalog Visibility
            </h2>
            <p className="text-xs text-[#78716c] mt-0.5">
              Choose free open access or paid tuition, and manage draft vs published state
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Pricing Model */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c]">
                Enrollment Fee
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrice(0);
                    setSaveStatus("Unsaved changes");
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${!price || Number(price) === 0
                    ? "bg-[#eff6ff] border-[#1e3a8a] text-[#1e3a8a] font-bold"
                    : "bg-[#faf8f5] border-[#e8e5dc] text-[#57534e]"
                    }`}
                >
                  <p className="text-xs">Free Access</p>
                  <p className="text-[10px] font-normal opacity-80">Instant 1-click enroll</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!price || Number(price) === 0) setPrice(499);
                    setSaveStatus("Unsaved changes");
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${price && Number(price) > 0
                    ? "bg-[#eff6ff] border-[#1e3a8a] text-[#1e3a8a] font-bold"
                    : "bg-[#faf8f5] border-[#e8e5dc] text-[#57534e]"
                    }`}
                >
                  <p className="text-xs">Paid Tuition</p>
                  <p className="text-[10px] font-normal opacity-80">Enforces payment</p>
                </button>
              </div>

              {price && Number(price) > 0 ? (
                <div className="relative pt-1">
                  <span className="absolute left-3 top-3.5 text-xs font-bold text-[#78716c]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      setSaveStatus("Unsaved changes");
                    }}
                    className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-7 pr-3 py-2 text-xs sm:text-sm font-bold text-[#1c1917] focus:outline-none focus:border-[#1e3a8a]"
                    placeholder="Tuition in INR"
                  />
                </div>
              ) : null}
            </div>

            {/* Visibility Mode */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c]">
                Student Visibility
              </label>

              <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e8e5dc] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1c1917]">
                    {isPublished ? "Published (Live to Students)" : "Draft (Hidden from Catalog)"}
                  </p>
                  <p className="text-[11px] text-[#78716c]">
                    {isPublished
                      ? "Students can discover this course and enroll."
                      : "Only you can view and edit this draft course."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsPublished(!isPublished);
                    setSaveStatus("Unsaved changes");
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer shrink-0 ${isPublished
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-emerald-50 border-emerald-300 text-emerald-900"
                    }`}
                >
                  {isPublished ? "Switch to Draft" : "Make Live"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM SAVE FOOTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => navigate("/courses")}
            className="text-xs font-semibold text-[#78716c] hover:text-[#1c1917]"
          >
            ← Back to All Courses
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSaveCourse(false)}
              className="bg-white hover:bg-[#f1ede4] text-[#1c1917] border border-[#d6d3d1] text-xs font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              Save Draft
            </button>

            <Button
              type="button"
              variant="primary"
              size="md"
              loading={loading}
              onClick={() => handleSaveCourse(true)}
              className="!bg-[#1e3a8a] inline hover:!bg-[#172554] text-white font-semibold px-6 py-2.5 rounded-xl shadow-xs"
            >
              <Save size={15} className="inline-block" /> Save & Publish
            </Button>
          </div>
        </div>
      </main>

      {/* INLINE EDIT LECTURE MODAL */}
      {editingLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e5dc]">
              <h3 className="font-bold text-sm text-[#1c1917]">Edit Lecture Details</h3>
              <button
                onClick={() => setEditingLecture(null)}
                className="text-[#78716c] hover:text-[#1c1917]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#44403c] mb-1">
                  Lecture Title
                </label>
                <input
                  type="text"
                  value={editLectureTitle}
                  onChange={(e) => setEditLectureTitle(e.target.value)}
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3 py-2 text-xs text-[#1c1917] focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403c] mb-1">
                  Upload / Replace Video File
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setEditLectureVideo(e.target.files[0])}
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl p-2 text-xs text-[#1c1917] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-[#1e3a8a] file:text-white cursor-pointer"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#44403c] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editLecturePreview}
                  onChange={(e) => setEditLecturePreview(e.target.checked)}
                  className="rounded border-[#d6d3d1] text-[#1e3a8a] h-4 w-4"
                />
                <span>Free Preview Available</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#e8e5dc]">
              <button
                type="button"
                onClick={() => setEditingLecture(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#d6d3d1] text-xs font-medium text-[#78716c]"
              >
                Cancel
              </button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={savingEditLecture}
                onClick={handleSaveEditLecture}
                className="!bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold"
              >
                Update Lecture
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI CURRICULUM GENERATOR MODAL */}
      {showAIPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e5dc]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#1e3a8a]" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  Generate Course with AI
                </h3>
              </div>
              <button
                onClick={() => setShowAIPlanModal(false)}
                className="text-[#78716c] hover:text-[#1c1917]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#78716c]">
                Tell AI the subject you want to teach (e.g. "Spoken English for Beginners", "JEE Mechanics", "React Web Development"). AI will generate a structured draft title, description, and curriculum outline.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#44403c] mb-1">
                  Subject or Topic
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Spoken English for Daily Conversations"
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#e8e5dc]">
              <button
                type="button"
                onClick={() => setShowAIPlanModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-[#d6d3d1] text-xs font-medium text-[#78716c]"
              >
                Cancel
              </button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={aiGenerating}
                onClick={handleGenerateAICurriculum}
                className="!bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold"
              >
                Generate Curriculum Draft
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Write With AI Modal */}
      <WriteWithAIModal
        isOpen={showWriteAIModal}
        onClose={() => setShowWriteAIModal(false)}
        onApply={handleApplyAIGenerated}
        currentFields={{ title, subTitle, description, category, level, price }}
        initialField={aiFieldTarget}
      />

      <Footer />
    </div>
  );
}

