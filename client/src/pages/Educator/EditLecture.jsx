import React, { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Video, UploadCloud, CheckCircle, FileText, Download } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import { setLectureData } from "../../redux/lectureSlice";
import Button from "../../components/common/Button";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

function EditLecture() {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { lectureData } = useSelector((state) => state.lecture);

  const [lectureTitle, setLectureTitle] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState("");
  const [isPreviewFree, setIsPreviewFree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Optional lecture resource attachment
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceFile, setResourceFile] = useState(null);
  const [existingResources, setExistingResources] = useState([]);

  // Fetch lecture details
  useEffect(() => {
    const fetchCurrentLecture = async () => {
      const found = (lectureData || []).find((l) => l._id === lectureId);
      if (found) {
        setLectureTitle(found.lectureTitle || "");
        setIsPreviewFree(Boolean(found.isPreviewFree));
        setExistingVideoUrl(found.videoUrl || "");
        setFetching(false);
      } else {
        try {
          setFetching(true);
          const res = await api.get(`/api/course/courselecture/${courseId}`);
          const lecs = res.data.lectures || [];
          dispatch(setLectureData(lecs));
          const current = lecs.find((l) => l._id === lectureId);
          if (current) {
            setLectureTitle(current.lectureTitle || "");
            setIsPreviewFree(Boolean(current.isPreviewFree));
            setExistingVideoUrl(current.videoUrl || "");
          }
        } catch (err) {
          console.warn("[EditLecture Fetch Error]", err);
        } finally {
          setFetching(false);
        }
      }

      // Fetch existing lecture resources
      try {
        const resRes = await api.get(`/api/resource/lecture/${lectureId}`);
        if (resRes.data?.success) {
          setExistingResources(resRes.data.resources || []);
        }
      } catch (e) {
        // no resources
      }
    };

    fetchCurrentLecture();
  }, [courseId, lectureId]);

  const handleEditLecture = async (e) => {
    e?.preventDefault();
    if (!lectureTitle.trim()) {
      toast.error("Lecture title is required");
      return;
    }

    const formData = new FormData();
    formData.append("lectureTitle", lectureTitle.trim());
    formData.append("isPreviewFree", isPreviewFree);

    if (videoFile) {
      formData.append("videoUrl", videoFile);
    }

    setLoading(true);
    try {
      const res = await api.post(`/api/course/editlecture/${lectureId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data;
      if (Array.isArray(lectureData)) {
        dispatch(
          setLectureData(lectureData.map((l) => (l._id === lectureId ? updated : l)))
        );
      }

      // If user also attached a new study resource:
      if (resourceFile && (resourceTitle || lectureTitle)) {
        const resForm = new FormData();
        resForm.append("courseId", courseId);
        resForm.append("lectureId", lectureId);
        resForm.append("title", resourceTitle.trim() || `${lectureTitle.trim()} Notes`);
        resForm.append("type", "pdf");
        resForm.append("file", resourceFile);

        try {
          await api.post("/api/resource/upload", resForm, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          toast.success("Lecture updated and new notes attached!");
        } catch (err) {
          toast.info("Lecture updated (resource upload failed)");
        }
      } else {
        toast.success("Lecture updated successfully!");
      }

      navigate(`/createlecture/${courseId}`);
    } catch (error) {
      console.error("[EditLecture Error]", error);
      toast.error(error.response?.data?.message || "Failed to update lecture");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLecture = async () => {
    if (!window.confirm("Are you sure you want to delete this lecture?")) return;

    setDeleteLoading(true);
    try {
      await api.delete(`/api/course/removelecture/${lectureId}`);
      if (Array.isArray(lectureData)) {
        dispatch(setLectureData(lectureData.filter((l) => l._id !== lectureId)));
      }
      toast.success("Lecture deleted successfully!");
      navigate(`/createlecture/${courseId}`);
    } catch (error) {
      console.error("[RemoveLecture Error]", error);
      toast.error(error.response?.data?.message || "Failed to delete lecture");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col">
      <Navbar />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e8e5dc]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/createlecture/${courseId}`)}
              className="p-1.5 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] transition cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1c1917] tracking-tight">
                Configure Lecture Media & Notes
              </h1>
              <p className="text-xs text-[#78716c]">
                Update title, video file, free preview, and attached study resources
              </p>
            </div>
          </div>

          <button
            onClick={handleRemoveLecture}
            disabled={deleteLoading}
            className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <Trash2 size={15} /> Delete Lecture
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleEditLecture} className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
          {/* Title */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
              Lecture Title *
            </label>
            <input
              type="text"
              required
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              placeholder="e.g. Chapter 1: Newton's Laws of Motion"
              className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white min-h-[44px]"
            />
          </div>

          {/* Video Preview / Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
              Video Stream File (MP4, WebM, MOV)
            </label>

            {existingVideoUrl && (
              <div className="mb-4 aspect-video rounded-2xl bg-black border border-[#e8e5dc] overflow-hidden max-w-lg">
                <video src={existingVideoUrl} controls className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center gap-3">
              <label
                htmlFor="video-upload"
                className="inline-flex items-center gap-2 bg-[#f2efe9] hover:bg-[#ebe7df] text-[#1c1917] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border border-[#d6d3c9] transition cursor-pointer"
              >
                <UploadCloud size={16} />
                <span>{videoFile ? videoFile.name : "Select New Video File"}</span>
              </label>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files[0])}
                className="sr-only"
              />
            </div>
            {videoFile && (
              <p className="text-xs text-[#1e3a8a] font-medium mt-1.5">
                Ready to upload: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
          </div>

          {/* Free Preview Toggle */}
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#e8e5dc] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#1c1917]">Free Preview Lecture</p>
              <p className="text-[11px] text-[#78716c]">
                Allow prospective students to preview this lecture video before purchasing the course.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isPreviewFree}
              onChange={(e) => setIsPreviewFree(e.target.checked)}
              className="h-5 w-5 rounded border-[#d6d3c9] text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
            />
          </div>

          {/* Optional Attach Notes */}
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#e8e5dc] space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#1e3a8a]" />
              <span className="text-xs font-bold text-[#1c1917]">
                Attach Notes / PDF to this Lecture (Optional)
              </span>
            </div>

            {existingResources.length > 0 && (
              <div className="space-y-1.5 py-1">
                <p className="text-[11px] text-[#78716c] font-bold uppercase tracking-wider">
                  Attached Notes:
                </p>
                {existingResources.map((r) => (
                  <div key={r._id} className="text-xs text-[#1e3a8a] font-semibold flex items-center gap-1.5">
                    <FileText size={13} />
                    <span>{r.title} ({r.fileSize || "File"})</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <input
                  type="text"
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  placeholder="Note title (e.g. Lecture Notes PDF)"
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

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/createlecture/${courseId}`)}
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
              Update Lecture
            </Button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

export default EditLecture;
