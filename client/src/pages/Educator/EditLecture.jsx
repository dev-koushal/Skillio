import React, { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Video, UploadCloud, CheckCircle } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import { setLectureData } from "../../redux/lectureSlice";
import Button from "../../components/common/Button";
import Navbar from "../../components/Navbar";

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

  // Find or fetch lecture
  useEffect(() => {
    const fetchCurrentLecture = async () => {
      // Check redux first
      const found = (lectureData || []).find((l) => l._id === lectureId);
      if (found) {
        setLectureTitle(found.lectureTitle || "");
        setIsPreviewFree(Boolean(found.isPreviewFree));
        setExistingVideoUrl(found.videoUrl || "");
        setFetching(false);
        return;
      }

      // Fetch course lectures from server if not found in redux
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

      toast.success("Lecture updated successfully!");
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/createlecture/${courseId}`)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-900 transition cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Edit Lecture
              </h1>
              <p className="text-xs text-gray-400">
                Update lesson title, video media, and preview settings
              </p>
            </div>
          </div>

          <button
            onClick={handleRemoveLecture}
            disabled={deleteLoading}
            className="inline-flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-900/60 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg transition"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleEditLecture} className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Lecture Title
            </label>
            <input
              type="text"
              required
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              placeholder="e.g. Setting up Vite, React, and Tailwind CSS"
              className="w-full bg-gray-950 border border-gray-700/80 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 min-h-[44px]"
            />
          </div>

          {/* Video Preview / Upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
              Video File (MP4, WebM, MOV)
            </label>

            {existingVideoUrl && (
              <div className="mb-4 aspect-video rounded-xl bg-black border border-gray-800 overflow-hidden">
                <video src={existingVideoUrl} controls className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center gap-3">
              <label
                htmlFor="video-upload"
                className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-lg border border-gray-700 transition cursor-pointer"
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
              <p className="text-xs text-cyan-400 mt-1.5">
                Ready to upload: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
          </div>

          {/* Free Preview Toggle */}
          <div className="pt-2 border-t border-gray-800">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPreviewFree}
                onChange={(e) => setIsPreviewFree(e.target.checked)}
                className="h-4 w-4 rounded border-gray-700 text-cyan-600 focus:ring-cyan-500 bg-gray-800"
              />
              <div>
                <p className="text-sm font-medium text-white">Enable Free Preview</p>
                <p className="text-xs text-gray-400">
                  Allow non-enrolled students to watch this lecture for free
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => navigate(`/createlecture/${courseId}`)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs sm:text-sm font-medium px-4 py-2 rounded-lg transition"
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
              Save Lecture
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditLecture;
