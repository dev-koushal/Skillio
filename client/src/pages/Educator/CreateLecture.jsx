import React, { useEffect, useState } from "react";
import { ArrowLeft, Edit, Plus, Video, Trash2, PlayCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../../services/api";
import { toast } from "react-toastify";
import { setLectureData } from "../../redux/lectureSlice";
import Button from "../../components/common/Button";
import Navbar from "../../components/Navbar";

function CreateLecture() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [lectureTitle, setLectureTitle] = useState("");
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
      const result = await api.post(`/api/course/createlecture/${courseId}`, {
        lectureTitle: lectureTitle.trim(),
      });

      const newLecture = result.data.lecture;
      dispatch(setLectureData([...lectures, newLecture]));
      toast.success("Lecture added! Click Edit to upload video content.");
      setLectureTitle("");
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/editcourse/${courseId}`)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-900 transition cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Course Curriculum Studio
              </h1>
              <p className="text-xs text-gray-400">
                Add lectures, arrange lessons, and upload streaming videos
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 px-2.5 py-1 rounded bg-cyan-950 border border-cyan-800">
            {lectures.length} Lectures
          </span>
        </div>

        {/* Add Lecture Card */}
        <form onSubmit={handleCreateLecture} className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Add New Lecture</h2>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Lecture Title
            </label>
            <input
              type="text"
              required
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              placeholder="e.g. Lesson 1: Introduction and Environment Setup"
              className="w-full bg-gray-950 border border-gray-700/80 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 min-h-[44px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              icon={Plus}
            >
              Add Lecture
            </Button>
          </div>
        </form>

        {/* Existing Lectures List */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Curriculum Sequence</h2>

          {lectures.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">
              No lectures added yet. Enter a title above to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {lectures.map((lec, index) => (
                <div
                  key={lec._id || index}
                  className="bg-gray-950 border border-gray-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-gray-700 transition"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-xs font-mono text-gray-500 w-6 shrink-0">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-medium text-white truncate">
                      {lec.lectureTitle}
                    </span>
                    {lec.isPreviewFree && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                        Preview
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/editlecture/${courseId}/${lec._id}`)}
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/80 px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      <Edit size={13} />
                      <span>Configure / Upload Video</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateLecture;
