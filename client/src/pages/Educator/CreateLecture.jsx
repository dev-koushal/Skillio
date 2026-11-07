import React, { useEffect, useState } from "react";
import { ArrowLeft, Edit, Plus, Video, Trash2, FileText, UploadCloud, Sparkles } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../../services/api";
import { toast } from "react-toastify";
import { setLectureData } from "../../redux/lectureSlice";
import Button from "../../components/common/Button";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

function CreateLecture() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [lectureTitle, setLectureTitle] = useState("");
  const [isPreviewFree, setIsPreviewFree] = useState(false);

  // Optional attached resource
  const [resourceTitle, setResourceTitle] = useState(`${lectureTitle} Notes`);
  const [resourceFile, setResourceFile] = useState(null);

  const { lectureData } = useSelector((state) => state.lecture);
  const lectures = Array.isArray(lectureData) ? lectureData : [];

  const handleCreateLecture = async (e) => {
    e?.preventDefault();
    if (!lectureTitle.trim()) {
      toast.error("Please enter a lecture title");
      return;
    }

    setLoading(true);
    try {
      // 1. Create lecture
      const result = await api.post(`/api/course/createlecture/${courseId}`, {
        lectureTitle: lectureTitle.trim(),
      });

      const newLecture = result.data.lecture;

      // 2. If optional resource file provided, upload it linked to this lecture
      if (resourceFile && (resourceTitle || lectureTitle)) {
        const formData = new FormData();
        formData.append("courseId", courseId);
        formData.append("lectureId", newLecture._id);
        formData.append("title", resourceTitle.trim() || `${lectureTitle.trim()} Notes`);
        formData.append("type", "pdf");
        formData.append("file", resourceFile);

        try {
          await api.post("/api/resource/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          toast.success("Lecture created with attached study notes!");
        } catch (resErr) {
          console.warn("[Attach Resource Error]", resErr);
          toast.info("Lecture created (note upload failed, you can re-attach in Course Studio)");
        }
      } else {
        toast.success("Lecture added! Click Configure to upload video content.");
      }

      dispatch(setLectureData([...lectures, newLecture]));
      setLectureTitle("");
      setResourceTitle("");
      setResourceFile(null);
    } catch (error) {
      console.error("[CreateLecture Error]", error);
      toast.error(error.response?.data?.message || "Failed to add lecture");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCourseLectures = async () => {
      try {
        const result = await api.get(`/api/course/courselecture/${courseId}`);
        dispatch(setLectureData(result.data.lectures || []));
      } catch (error) {
        console.warn("[GetLectures Error]", error);
      }
    };

    fetchCourseLectures();
  }, [courseId, dispatch]);

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col">
      <Navbar />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e8e5dc]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/builder/${courseId}`)}
              className="p-1.5 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] transition cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1c1917] tracking-tight">
                Curriculum Lecture Studio
              </h1>
              <p className="text-xs text-[#78716c]">
                Add lectures, arrange sequencing, and attach lecture notes
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#1e3a8a] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            {lectures.length} Total Lectures
          </span>
        </div>

        {/* Add Lecture Card */}
        <form onSubmit={handleCreateLecture} className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#1e3a8a]">
            Add New Lecture
          </h2>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
              Lecture Title *
            </label>
            <input
              type="text"
              required
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              placeholder="e.g. Lecture 1: Core Principles and Foundations"
              className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white min-h-[44px]"
            />
          </div>

          {/* Optional Notes Section */}
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#e8e5dc] space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#1e3a8a]" />
              <span className="text-xs font-bold text-[#1c1917]">
                Attach Lecture Notes / PDF (Optional)
              </span>
            </div>
            <p className="text-[11px] text-[#78716c]">
              Students can view and download these notes directly while watching this lecture.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={resourceTitle}

                  onChange={(e) => setResourceTitle(e.target.value)}
                  placeholder="Notes title (e.g. Chapter 1 Summary PDF)"
                  className="w-full bg-white border border-[#d6d3c9] rounded-xl px-3 py-2 text-xs text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>
              <div>
                <input
                  type="file"
                  onChange={(e) => setResourceFile(e.target.files[0])}
                  className="w-full bg-white border border-[#d6d3c9] rounded-xl p-1.5 text-xs text-[#1c1917] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1e3a8a] file:text-white cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              icon={Plus}
              className="bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold"
            >
              Add Lecture to Course
            </Button>
          </div>
        </form>

        {/* Existing Lectures List */}
        <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-[#1c1917]">Curriculum Sequence</h2>

          {lectures.length === 0 ? (
            <div className="text-center py-8 text-[#78716c] text-xs">
              No lectures added yet. Enter a title above to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {lectures.map((lec, index) => (
                <div
                  key={lec._id || index}
                  className="bg-[#faf9f6] border border-[#e8e5dc] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#1e3a8a]/40 transition"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="w-7 h-7 rounded-lg bg-white border border-[#d6d3c9] flex items-center justify-center text-xs font-bold text-[#1e3a8a] shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#1c1917] truncate">
                      {lec.lectureTitle}
                    </span>
                    {lec.isPreviewFree && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
                        Preview
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => navigate(`/editlecture/${courseId}/${lec._id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] bg-white hover:bg-blue-50 border border-[#d6d3c9] px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <Edit size={13} />
                      <span>Upload Video / Edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CreateLecture;
