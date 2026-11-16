import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Video,
  Lock,
  FileText,
  Download,
  LockOpen,
  CheckCircle2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SecureVideoPlayer from "../components/video/SecureVideoPlayer";
import SecureDocumentViewer from "../components/resources/SecureDocumentViewer";
import { useTenant } from "../context/TenantContext";
import {
  handleFullscreenOrientationChange,
  unlockScreenOrientation,
} from "../utils/videoOrientation";
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

  // Lecture-specific resources
  const [lectureResources, setLectureResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);

  // Automatically lock mobile screen orientation to landscape when video is enlarged / fullscreen
  useEffect(() => {
    const onFsChange = () => {
      handleFullscreenOrientationChange();
    };

    const fsEvents = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ];

    fsEvents.forEach((evt) => document.addEventListener(evt, onFsChange));

    return () => {
      fsEvents.forEach((evt) => document.removeEventListener(evt, onFsChange));
      unlockScreenOrientation();
    };
  }, []);

  // Fetch course lectures directly
  useEffect(() => {
    const fetchLectures = async () => {
      try {
        setAccessDenied(false);
        const res = await api.get(`/api/course/courselecture/${courseId}`);
        if (res.data) {
          setCourse(res.data);
          if (res.data.lectures && res.data.lectures.length > 0) {
            setSelectedLecture(res.data.lectures[0]);
          }
          if (res.data.creator && typeof res.data.creator === "object") {
            setCreatorData(res.data.creator);
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

  // Fetch creator info if not already populated
  useEffect(() => {
    const fetchCreator = async () => {
      if (creatorData) return;
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

    if (course && !creatorData) fetchCreator();
  }, [course, creatorData]);

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
      {activeDocument && (
        <SecureDocumentViewer
          resource={activeDocument}
          user={userData}
          tenantName={tenant?.name}
          onClose={() => setActiveDocument(null)}
        />
      )}

      {/* Centered layout container - balanced desktop max-width (max-w-4xl) */}
      <main className="max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 flex-1 pb-28 md:pb-12">

        {/* 1. Course Context & Progress Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#e8e5dc]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate(`/viewcourse/${courseId}`)}
              className="inline-flex items-center gap-1.5 text-xs text-[#57534e] hover:text-[#1c1917] transition cursor-pointer font-semibold py-1 px-1.5 rounded-lg hover:bg-[#f1ede4] shrink-0"
            >
              <ArrowLeft size={15} />
              <span>Course Overview</span>
            </button>
            <span className="text-[#d6d3c9]">·</span>
            <span className="text-xs font-semibold text-[#78716c] truncate">
              {course?.title}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs text-[#78716c]">Progress</span>
            <div className="w-24 sm:w-28 h-1.5 bg-[#e8e5dc] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono text-xs font-semibold text-[#1c1917]">{progressPercent}%</span>
          </div>
        </div>

        {/* 2. Video Player - Clean 16:9 Aspect Ratio (NO black header bar, NO theater button) */}
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-xs border border-[#e8e5dc]">
          {selectedLecture?._id ? (
            <SecureVideoPlayer
              key={selectedLecture._id}
              lectureId={selectedLecture._id}
              lectureTitle={selectedLecture.lectureTitle}
              initialPlayback={selectedLecture._id === course?.lectures?.[0]?._id ? course?.initialPlayback : null}
              onEnded={handleNextLecture}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2 bg-[#111018]">
              {loading ? (
                <>
                  <div className="w-8 h-8 border-3 border-[#60a5fa] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Preparing Classroom Stream...
                  </p>
                </>
              ) : (
                <>
                  <Video size={32} className="text-slate-600" />
                  <p className="text-xs">Select a lecture from the playlist to begin learning.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* 3. Compact Previous / Lesson X of Y / Next Controls */}
        <div className="flex items-center justify-between gap-2 py-1">
          <button
            type="button"
            disabled={currentIdx <= 0}
            onClick={handlePrevLecture}
            className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 sm:px-4 rounded-xl border border-[#d6d3c9] bg-white text-xs font-medium text-[#1c1917] hover:bg-[#f8f7f4] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition select-none"
          >
            <span className="text-sm">←</span>
            <span>Previous</span>
          </button>

          <span className="text-xs text-[#78716c] font-medium whitespace-nowrap px-1 text-center">
            Lesson {currentIdx + 1} of {lectures.length}
          </span>

          <button
            type="button"
            disabled={currentIdx >= lectures.length - 1}
            onClick={handleNextLecture}
            className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 sm:px-4 rounded-xl bg-[#1e3a8a] text-white text-xs font-medium hover:bg-[#172554] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs select-none"
          >
            <span>Next</span>
            <span className="text-sm">→</span>
          </button>
        </div>

        {/* 4. Lecture Details & Instructor (Clear, restrained typography) */}
        <div className="space-y-1.5 py-2 border-b border-[#e8e5dc]">
          <h1 className="text-base sm:text-xl font-bold text-[#1c1917] tracking-tight">
            {selectedLecture?.lectureTitle || course?.title}
          </h1>
          <p className="text-xs text-[#78716c]">
            Course: <span className="text-[#44403c] font-medium">{course?.title}</span>
          </p>

          {creatorData?.name && (
            <div className="flex items-center gap-2 pt-1 text-xs text-[#78716c]">
              {creatorData.profilePicture ? (
                <img
                  src={creatorData.profilePicture}
                  alt={creatorData.name}
                  className="w-5 h-5 rounded-full object-cover border border-[#e8e5dc]"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-[10px] font-bold">
                  {creatorData.name.charAt(0)}
                </div>
              )}
              <span>{creatorData.name}</span>
            </div>
          )}
        </div>

        {/* 5. Notes & Study Resources Section */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-[#1c1917] flex items-center gap-1.5">
              <FileText size={15} className="text-[#1e3a8a]" />
              <span>Notes & Study Resources</span>
            </h2>
            <span className="text-[11px] text-[#78716c]">
              {lectureResources.length} {lectureResources.length === 1 ? "file" : "files"}
            </span>
          </div>

          {resourcesLoading ? (
            <p className="text-xs text-[#78716c] py-2">Loading notes...</p>
          ) : lectureResources.length > 0 ? (
            <div className="divide-y divide-[#f2efe9] rounded-xl border border-[#e8e5dc] bg-white overflow-hidden shadow-2xs">
              {lectureResources.map((res) => (
                <div
                  key={res._id}
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-[#faf9f6] transition"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-semibold text-[#1c1917] truncate">{res.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[#78716c]">
                      <span className="uppercase font-mono bg-[#f4f2ec] px-1.5 py-0.5 rounded text-[9px] font-bold text-[#57534e]">
                        {res.type || "PDF"}
                      </span>
                      {res.storageProvider === "cloudinary_authenticated" ? (
                        <span>{res.pageCount} pages · {res.accessType === "paid" ? `₹${(res.pricePaise / 100).toLocaleString("en-IN")}` : "secure notes"}</span>
                      ) : res.fileSize ? (
                        <span>{res.fileSize}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {res.storageProvider === "cloudinary_authenticated" && res.processingStatus !== "ready" ? (
                      <span className="text-[11px] text-[#78716c]">{res.processingStatus === "processing" ? "Preparing…" : "Unavailable"}</span>
                    ) : res.storageProvider === "cloudinary_authenticated" ? (
                      res.isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => setActiveDocument(res)}
                          className="px-3 py-1.5 rounded-lg bg-[#183c32] hover:bg-[#122e26] text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Read
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/viewcourse/${courseId}`)}
                          className="px-3 py-1.5 rounded-lg border border-[#d6d3c9] bg-white text-[#1e3a8a] text-xs font-semibold hover:bg-blue-50 transition cursor-pointer"
                        >
                          Unlock
                        </button>
                      )
                    ) : (
                      <a
                        href={res.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="p-2 rounded-lg border border-[#d6d3c9] bg-white text-[#1e3a8a] hover:bg-blue-50 transition inline-flex items-center justify-center cursor-pointer"
                        title="Download Note"
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#e8e5dc] bg-[#faf9f6] p-3 text-center text-xs text-[#78716c]">
              No notes attached to this lecture. Check course overview for all materials.
            </div>
          )}
        </div>

        {/* 6. Course Playlist Section */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-[#1c1917] flex items-center gap-1.5">
              <Video size={15} className="text-[#1e3a8a]" />
              <span>Course Playlist</span>
            </h2>
            <span className="text-[11px] text-[#78716c]">
              {lectures.length} {lectures.length === 1 ? "lesson" : "lessons"}
            </span>
          </div>

          <div className="divide-y divide-[#f2efe9] rounded-xl border border-[#e8e5dc] bg-white overflow-hidden shadow-2xs">
            {lectures.map((lec, idx) => {
              const isCurrent = selectedLecture?._id === lec._id;
              const isPreview = Boolean(lec.isPreviewFree || lec.accessState === "preview");
              const isLocked = Boolean(lec.isLocked || lec.canPlay === false);
              const numStr = String(idx + 1).padStart(2, "0");

              return (
                <button
                  key={lec._id || idx}
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      toast.info("Please enroll in this course to watch locked lectures.");
                      return;
                    }
                    setSelectedLecture(lec);
                  }}
                  className={`w-full text-left p-3 sm:p-3.5 flex items-center justify-between gap-3 transition cursor-pointer select-none ${isCurrent
                      ? "bg-blue-50/70 text-[#1e3a8a]"
                      : isLocked
                        ? "hover:bg-[#faf9f6] opacity-75"
                        : "hover:bg-[#faf9f6]"
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`font-mono text-xs font-semibold shrink-0 ${isCurrent ? "text-[#1e3a8a] font-bold" : "text-[#78716c]"
                      }`}>
                      {numStr}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className={`text-xs sm:text-sm font-semibold truncate ${isCurrent ? "text-[#1e3a8a]" : isLocked ? "text-[#78716c]" : "text-[#1c1917]"
                        }`}>
                        {lec.lectureTitle}
                      </p>
                      <p className="text-[10px] text-[#78716c]">
                        {lec.duration ? `${Math.round(lec.duration / 60)} min · ` : ""}
                        {lec.videoProvider === "youtube"
                          ? "YouTube"
                          : lec.videoProvider === "bunny"
                            ? "Native video"
                            : "Classroom video"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 ml-2">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1e3a8a] bg-blue-100/70 px-2 py-0.5 rounded-full">
                        Playing
                      </span>
                    ) : isLocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#78716c] bg-[#f4f2ec] px-2 py-0.5 rounded-full border border-[#e8e5dc]">
                        <Lock size={10} />
                        <span>Locked</span>
                      </span>
                    ) : isPreview ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <LockOpen size={10} />
                        <span>Free Preview</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} />
                        <span>Available</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ViewLectures;