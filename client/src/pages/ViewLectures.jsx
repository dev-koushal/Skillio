import React, { useEffect, useState } from "react";
import { ArrowLeft, Play, Pause, Video, CheckCircle, Lock } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

function ViewLectures() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courseData } = useSelector((state) => state.course);

  const [course, setCourse] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [creatorData, setCreatorData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch course lectures directly
  useEffect(() => {
    const fetchLectures = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/course/courselecture/${courseId}`);
        if (res.data) {
          setCourse(res.data);
          if (res.data.lectures && res.data.lectures.length > 0) {
            setSelectedLecture(res.data.lectures[0]);
          }
        }
      } catch (err) {
        console.warn("[ViewLectures] Direct fetch error:", err.message);
        // Fallback from redux store
        const found = (courseData || []).find((c) => c._id === courseId);
        if (found) {
          setCourse(found);
          if (found.lectures?.length > 0) {
            setSelectedLecture(found.lectures[0]);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLectures();
  }, [courseId]);

  // Fetch creator info
  useEffect(() => {
    const fetchCreator = async () => {
      const creatorId = course?.creator;
      if (creatorId && typeof creatorId === "string") {
        try {
          const res = await api.post("/api/course/creator", { userId: creatorId });
          setCreatorData(res.data);
        } catch (e) {
          console.warn("[ViewLectures] Creator error:", e.message);
        }
      } else if (course?.creator && typeof course.creator === "object") {
        setCreatorData(course.creator);
      }
    };

    if (course) fetchCreator();
  }, [course]);

  if (loading && !course) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-800 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading course classroom...</p>
        </div>
      </div>
    );
  }

  const lectures = course?.lectures || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/viewcourse/${courseId}`)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Course Overview
          </button>
          <span className="text-xs font-mono uppercase text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800">
            {course?.category || "Classroom"}
          </span>
        </div>

        {/* Video Player + Playlist Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Video Player */}
          <div className="lg:col-span-8 bg-gray-900/70 border border-gray-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-gray-800 shadow-xl">
              {selectedLecture?.videoUrl ? (
                <video
                  key={selectedLecture._id}
                  src={selectedLecture.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 text-gray-400 text-sm">
                  <Video size={36} className="mx-auto text-gray-600 mb-2" />
                  <p>No video available for this lecture.</p>
                </div>
              )}
            </div>

            {/* Lecture Details */}
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-bold text-white">
                {selectedLecture?.lectureTitle || course?.title}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Course: <span className="text-gray-200">{course?.title}</span> • Level: {course?.level}
              </p>
            </div>

            {/* Creator Card */}
            {creatorData && (
              <div className="pt-4 border-t border-gray-800 flex items-center gap-3">
                <img
                  src={creatorData.profilePicture || blank_profile}
                  alt={creatorData.name}
                  className="w-10 h-10 rounded-full object-cover border border-cyan-800"
                />
                <div>
                  <p className="text-sm font-semibold text-white">{creatorData.name}</p>
                  <p className="text-xs text-gray-400">{creatorData.description || "Course Instructor"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Lecture Playlist Sidebar */}
          <div className="lg:col-span-4 bg-gray-900/70 border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h2 className="text-sm font-bold text-white">All Lectures</h2>
              <span className="text-xs text-gray-400 font-mono">
                {lectures.length} Total
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {lectures.length > 0 ? (
                lectures.map((lec, index) => {
                  const isActive = selectedLecture?._id === lec._id;
                  return (
                    <button
                      key={lec._id || index}
                      onClick={() => setSelectedLecture(lec)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm transition cursor-pointer ${
                        isActive
                          ? "bg-cyan-950/90 border-cyan-700 text-cyan-200 font-medium"
                          : "bg-gray-900/80 border-gray-800 hover:bg-gray-850 text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-xs font-mono text-gray-500 w-5 shrink-0">
                          {index + 1}.
                        </span>
                        <span className="truncate">{lec.lectureTitle}</span>
                      </div>
                      {isActive ? (
                        <Pause size={15} className="text-cyan-400 shrink-0" />
                      ) : (
                        <Play size={15} className="text-gray-400 shrink-0" />
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-gray-500 py-6 text-center">
                  No lectures found in this course.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewLectures;
