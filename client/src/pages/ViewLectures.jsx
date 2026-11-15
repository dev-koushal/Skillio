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
  LockOpen,
  CheckCircle2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SecureVideoPlayer from "../components/video/SecureVideoPlayer";
import SecureDocumentViewer from "../components/resources/SecureDocumentViewer";
import { useTenant } from "../context/TenantContext";
import "./InstitutionStudentPages.css";

function ViewLectures() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const userData = useSelector((state) => state.user.userData);
  const accent = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(tenant?.primaryColor || "")
    ? tenant.primaryColor
    : "#5b3cc4";
  const tenantStyle = { "--institution-accent": accent };

  const [course, setCourse] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [creatorData, setCreatorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Lecture-specific resources
  const [lectureResources, setLectureResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);

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
      <div className="institution-student-page min-h-screen text-[#1c1917] flex flex-col" style={tenantStyle}>
        <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
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
      <div className="institution-student-page min-h-screen text-[#1c1917] flex flex-col" style={tenantStyle}>
        <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
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
  const currentIdx = lectures.findIndex((l) => l._id === selectedLecture?._id);
  const progressPercent = lectures.length > 0 ? Math.round(((currentIdx + 1) / lectures.length) * 100) : 0;

  const handleNextLecture = () => {
    if (currentIdx < lectures.length - 1) {
      setSelectedLecture(lectures[currentIdx + 1]);
    }
  };

  const handlePrevLecture = () => {
    if (currentIdx > 0) {
      setSelectedLecture(lectures[currentIdx - 1]);
    }
  };

  return (
    <div className="institution-student-page min-h-screen text-[#1c1917] flex flex-col font-sans" style={tenantStyle}>
      <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
      {activeDocument && <SecureDocumentViewer resource={activeDocument} user={userData} tenantName={tenant?.name} onClose={() => setActiveDocument(null)} />}

      <main className="lecture-player-page max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 flex-1 pb-28 md:pb-12">
        {/* Navigation & Progress Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e8e5dc]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/viewcourse/${courseId}`)}
              className="inline-flex items-center gap-1.5 text-xs text-[#57534e] hover:text-[#1c1917] transition cursor-pointer font-semibold p-1.5 rounded-lg hover:bg-[#f1ede4] pressable"
            >
              <ArrowLeft size={16} /> Course Overview
            </button>
            <span className="text-[#d6d3c9]">•</span>
            <span className="text-xs font-bold text-[#1e3a8a] truncate max-w-[200px] sm:max-w-md">
              {course?.title}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#57534e]">
              <span>Progress:</span>
              <div className="w-24 sm:w-32 h-2 bg-[#e8e5dc] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-[11px] font-bold text-[#1c1917]">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Video Player + Playlist Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Video Player & Controls */}
          <div className={`lecture-player-content space-y-5 ${isTheaterMode ? "lg:col-span-12" : "lg:col-span-8"}`}>
            <div className="lecture-video-panel bg-white border border-[#e8e5dc] rounded-3xl p-4 sm:p-6 space-y-4 shadow-xs">
              {/* Dominant Video Container with Secure Authorized Player */}
              <div className="w-full">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-[#78716c] uppercase tracking-wider">
                    {selectedLecture?.isPreviewFree ? "Free Preview" : "Authorized Classroom Stream"}
                  </span>
                  <button
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#57534e] hover:text-[#1c1917] bg-[#f2efe9] hover:bg-[#e8e5dc] px-2.5 py-1 rounded-lg transition cursor-pointer"
                    title={isTheaterMode ? "Standard View" : "Theater Mode (Expanded Screen)"}
                  >
                    {isTheaterMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    <span>{isTheaterMode ? "Standard" : "Theater"}</span>
                  </button>
                </div>
                {selectedLecture?._id ? (
                  <SecureVideoPlayer
                    key={selectedLecture._id}
                    lectureId={selectedLecture._id}
                    lectureTitle={selectedLecture.lectureTitle}
                    onEnded={handleNextLecture}
                  />
                ) : (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-[#e8e5dc] text-center p-6 text-gray-400 text-xs sm:text-sm space-y-2">
                    <Video size={36} className="mx-auto text-gray-600" />
                    <p>Select a lecture from the curriculum to begin learning.</p>
                  </div>
                )}
              </div>

              {/* Prev / Next Lecture Tactical Controls */}
              <div className="flex items-center justify-between pt-1 gap-2">
                <button
                  disabled={currentIdx <= 0}
                  onClick={handlePrevLecture}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#d6d3c9] text-xs font-bold text-[#1c1917] hover:bg-[#f8f7f4] disabled:opacity-40 disabled:cursor-not-allowed pressable cursor-pointer touch-target"
                >
                  ← Previous Lecture
                </button>

                <span className="text-xs text-[#78716c] font-semibold">
                  Lesson {currentIdx + 1} of {lectures.length}
                </span>

                <button
                  disabled={currentIdx >= lectures.length - 1}
                  onClick={handleNextLecture}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#172554] disabled:opacity-40 disabled:cursor-not-allowed pressable cursor-pointer shadow-xs touch-target"
                >
                  Next Lecture →
                </button>
              </div>

              {/* Lecture Details */}
              <div className="space-y-1 pt-2 border-t border-[#f2efe9]">
                <h1 className="text-lg sm:text-xl font-extrabold text-[#1c1917] tracking-tight">
                  {selectedLecture?.lectureTitle || course?.title}
                </h1>
                <p className="text-xs text-[#78716c]">
                  Course: <span className="text-[#1c1917] font-semibold">{course?.title}</span> • Level: {course?.level}
                </p>
              </div>

              {/* Creator Card */}
              {creatorData && (
                <div className="pt-3 border-t border-[#f2efe9] flex items-center gap-3">
                  {creatorData.profilePicture ? (
                    <img
                      src={creatorData.profilePicture}
                      alt={creatorData.name}
                      className="w-9 h-9 rounded-full object-cover border border-[#d6d3c9]"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs">
                      {creatorData.name?.charAt(0) || "I"}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] text-[#78716c]">Instructor</p>
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
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
                    <FileText size={17} />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-[#1c1917]">
                    Lecture Notes & Study Resources
                  </h2>
                </div>
                <span className="text-xs text-[#78716c] font-semibold">
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
                      className="p-3.5 rounded-xl bg-[#faf9f6] border border-[#e8e5dc] flex items-center justify-between gap-3 hover:border-[#1e3a8a]/40 transition card-lift"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <p className="text-xs font-bold text-[#1c1917] truncate">{res.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-[#78716c]">
                          <span className="uppercase font-mono bg-white px-1.5 py-0.5 rounded border border-[#e8e5dc]">
                            {res.type || "PDF"}
                          </span>
                          {res.storageProvider === "cloudinary_authenticated" ? <span>{res.pageCount} pages · {res.accessType === "paid" ? `₹${(res.pricePaise / 100).toLocaleString("en-IN")}` : "secure notes"}</span> : res.fileSize && <span>{res.fileSize}</span>}
                        </div>
                      </div>

                      {res.storageProvider === "cloudinary_authenticated" && res.processingStatus !== "ready" ? <span className="shrink-0 text-[10px] font-semibold text-[#78716c]">{res.processingStatus === "processing" ? "Preparing…" : "Unavailable"}</span> : res.storageProvider === "cloudinary_authenticated" ? (
                        res.isUnlocked ? <button type="button" onClick={() => setActiveDocument(res)} className="shrink-0 rounded-xl bg-[#183c32] px-3 py-2.5 text-xs font-semibold text-white">Read notes</button> : <button type="button" onClick={() => navigate(`/viewcourse/${courseId}`)} className="shrink-0 rounded-xl border border-[#d6d3c9] bg-white px-3 py-2.5 text-xs font-semibold text-[#1e3a8a]">Unlock</button>
                      ) : <a
                        href={res.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="p-2.5 rounded-xl bg-white border border-[#d6d3c9] text-[#1e3a8a] hover:bg-blue-50 transition shrink-0 cursor-pointer touch-target pressable"
                        title="Download Note"
                      >
                        <Download size={15} />
                      </a>}
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
          <div className={`lecture-playlist ${isTheaterMode ? "lg:col-span-12" : "lg:col-span-4"} bg-white border border-[#e8e5dc] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs sticky top-24`}>
            <div className="flex items-center justify-between pb-3 border-b border-[#f2efe9]">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#1c1917]">Course Playlist</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f4f2ec] text-[#57534e]">
                  {lectures.length} Lectures
                </span>
              </div>
              <span className="text-xs font-semibold text-[#78716c]">
                {lectures.filter((l) => l.isPreviewFree).length} Previews
              </span>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {lectures.map((lec, idx) => {
                const isCurrent = selectedLecture?._id === lec._id;
                const isPreview = Boolean(lec.isPreviewFree);

                return (
                  <button
                    key={lec._id || idx}
                    onClick={() => setSelectedLecture(lec)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer touch-target pressable ${
                      isCurrent
                        ? "bg-blue-50/80 border-[#1e3a8a] text-[#1e3a8a] font-bold shadow-xs"
                        : "bg-[#faf9f6] border-[#e8e5dc] text-[#44403c] hover:bg-white hover:border-[#1e3a8a]/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCurrent
                            ? "bg-[#1e3a8a] text-white"
                            : "bg-[#f2efe9] text-[#78716c]"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{lec.lectureTitle}</p>
                        <span className="rounded-full border border-[#e8e5dc] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#57534e]">
                          {lec.videoProvider === "youtube"
                            ? "YouTube"
                            : lec.videoProvider === "bunny"
                            ? "Native video"
                            : "Video"}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 ml-2">
                      {isCurrent ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e3a8a] bg-blue-100/60 px-2 py-0.5 rounded-full shrink-0">
                          Playing
                        </span>
                      ) : isPreview ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                          <LockOpen size={10} />
                          Free
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#78716c] bg-[#f0ede6] px-2 py-0.5 rounded-full shrink-0">
                          <CheckCircle2 size={10} className="text-emerald-600" />
                          Class
                        </span>
                      )}
                    </div>
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
