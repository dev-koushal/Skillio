import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Video,
  CheckCircle,
  Lock,
  FileText,
  Download,
  AlertCircle,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function ViewLectures() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [creatorData, setCreatorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  // Lecture-specific resources
  const [lectureResources, setLectureResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Fetch course lectures directly
  useEffect(() => {
    const fetchLectures = async () => {
      try {
        setLoading(true);
        setAccessDenied(false);
        const res = await api.get(`/api/course/courselecture/${courseId}`);
        if (res.data) {
          setCourse(res.data);
          if (res.data.lectures && res.data.lectures.length > 0) {
            setSelectedLecture(res.data.lectures[0]);
          }
        }
      } catch (err) {
        if (err.response?.status === 403) {
          setAccessDenied(true);
          setAccessMessage(
            err.response.data?.message ||
              "Payment required: You must be enrolled in this course to access the classroom lectures."
          );
        } else {
          console.warn("[ViewLectures] Direct fetch error:", err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLectures();
  }, [courseId]);

  // Fetch lecture resources whenever selectedLecture changes
  useEffect(() => {
    const fetchLectureResources = async () => {
      if (!selectedLecture?._id) return;
      try {
        setResourcesLoading(true);
        const res = await api.get(`/api/resource/lecture/${selectedLecture._id}`);
        if (res.data?.success) {
          setLectureResources(res.data.resources || []);
        }
      } catch (err) {
        console.warn("[ViewLectures] Lecture resource error:", err.message);
      } finally {
        setResourcesLoading(false);
      }
    };

    fetchLectureResources();
  }, [selectedLecture]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
            Loading Course Classroom...
          </p>
        </div>
      </div>
    );
  }

  // Access Denied State (Locked Course)
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shadow-xs">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-[#1c1917]">
              Course Classroom Locked
            </h1>
            <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed max-w-md">
              {accessMessage ||
                "This course requires active enrollment or payment verification before video lectures and study resources can be unlocked."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate(`/viewcourse/${courseId}`)}
              className="px-6 py-3 rounded-xl bg-[#1e3a8a] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#172554] cursor-pointer"
            >
              Go to Course Page & Enroll
            </button>
            <button
              onClick={() => navigate("/allcourses")}
              className="px-6 py-3 rounded-xl bg-white border border-[#d6d3c9] text-[#1c1917] text-xs sm:text-sm font-bold hover:bg-[#f2efe9] cursor-pointer"
            >
              Explore Other Courses
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const lectures = course?.lectures || [];

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/viewcourse/${courseId}`)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#57534e] hover:text-[#1c1917] transition cursor-pointer font-medium"
          >
            <ArrowLeft size={16} /> Back to Course Overview
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] px-3 py-1 rounded-md bg-blue-50 border border-blue-200">
            {course?.category || "Classroom"}
          </span>
        </div>

        {/* Video Player + Playlist Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Video Player & Lecture Resources */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-[#e8e5dc] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-[#e8e5dc] shadow-md">
                {selectedLecture?.videoUrl ? (
                  <video
                    key={selectedLecture._id}
                    src={selectedLecture.videoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 text-gray-400 text-xs sm:text-sm space-y-2">
                    <Video size={36} className="mx-auto text-gray-600" />
                    <p>No video stream available for this lecture.</p>
                  </div>
                )}
              </div>

              {/* Lecture Details */}
              <div className="space-y-1 pt-1">
                <h1 className="text-lg sm:text-xl font-extrabold text-[#1c1917]">
                  {selectedLecture?.lectureTitle || course?.title}
                </h1>
                <p className="text-xs text-[#78716c]">
                  Course: <span className="text-[#1c1917] font-semibold">{course?.title}</span> • Level: {course?.level}
                </p>
              </div>

              {/* Creator Card */}
              {creatorData && (
                <div className="pt-4 border-t border-[#f2efe9] flex items-center gap-3">
                  {creatorData.profilePicture ? (
                    <img
                      src={creatorData.profilePicture}
                      alt={creatorData.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#d6d3c9]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-sm">
                      {creatorData.name?.charAt(0) || "I"}
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-[#78716c]">Instructor</p>
                    <p className="text-xs sm:text-sm font-bold text-[#1c1917]">
                      {creatorData.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dedicated Lecture Notes & Resources Card */}
            <div className="bg-white border border-[#e8e5dc] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#f2efe9]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-[#1c1917]">
                    Lecture Notes & Study Resources
                  </h2>
                </div>
                <span className="text-xs text-[#78716c]">
                  {lectureResources.length} {lectureResources.length === 1 ? "file" : "files"}
                </span>
              </div>

              {resourcesLoading ? (
                <p className="text-xs text-[#78716c] py-4 text-center">Loading lecture notes...</p>
              ) : lectureResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lectureResources.map((res) => (
                    <div
                      key={res._id}
                      className="p-3.5 rounded-xl bg-[#faf9f6] border border-[#e8e5dc] flex items-center justify-between gap-3 hover:border-[#1e3a8a]/40 transition"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <p className="text-xs font-bold text-[#1c1917] truncate">{res.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-[#78716c]">
                          <span className="uppercase font-mono bg-white px-1.5 py-0.5 rounded border border-[#e8e5dc]">
                            {res.type || "PDF"}
                          </span>
                          {res.fileSize && <span>{res.fileSize}</span>}
                        </div>
                      </div>

                      <a
                        href={res.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="p-2 rounded-lg bg-white border border-[#d6d3c9] text-[#1e3a8a] hover:bg-blue-50 transition shrink-0 cursor-pointer"
                        title="Download Note"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#78716c] py-3 text-center">
                  No individual notes attached to this lecture. Check the course overview for all materials.
                </p>
              )}
            </div>
          </div>

          {/* Playlist Sidebar */}
          <div className="lg:col-span-4 bg-white border border-[#e8e5dc] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2efe9]">
              <h2 className="text-sm font-bold text-[#1c1917]">Course Playlist</h2>
              <span className="text-xs text-[#78716c]">{lectures.length} Lectures</span>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {lectures.map((lec, idx) => {
                const isCurrent = selectedLecture?._id === lec._id;
                return (
                  <button
                    key={lec._id || idx}
                    onClick={() => setSelectedLecture(lec)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                      isCurrent
                        ? "bg-blue-50/80 border-[#1e3a8a] text-[#1e3a8a] font-bold"
                        : "bg-[#faf9f6] border-[#e8e5dc] text-[#44403c] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCurrent
                            ? "bg-[#1e3a8a] text-white"
                            : "bg-[#f2efe9] text-[#78716c]"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-xs truncate">{lec.lectureTitle}</span>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e3a8a] shrink-0">
                        Playing
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ViewLectures;
