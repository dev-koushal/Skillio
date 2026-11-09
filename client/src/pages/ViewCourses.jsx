import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  PlayCircle,
  Star,
  CheckCircle,
  Video,
  BookOpen,
  Clock,
  FileText,
  Download,
  ExternalLink,
  Search,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Award,
  SquarePen,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedCourse } from "../redux/courseSlice";
import { setUserData } from "../redux/userSlice";
import api from "../services/api";
import { toast } from "react-toastify";
import { useTenant } from "../context/TenantContext";
import Button from "../components/common/Button";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { optimizeImage } from "../utils/imageOptimizer";

// Helper to load Razorpay checkout script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

function ViewCourses() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const dispatch = useDispatch();

  const { courseData } = useSelector((state) => state.course);
  const { userData } = useSelector((state) => state.user);
  const { tenant } = useTenant();

  const [course, setCourse] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [creatorData, setCreatorData] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Tab State: "overview" | "curriculum" | "resources" | "reviews"
  const [activeTab, setActiveTab] = useState("overview");

  // Notes & Resources State
  const [resources, setResources] = useState([]);
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Fetch course details by ID
  const loadCourse = async () => {
    try {
      setFetching(true);
      const res = await api.get(`/api/course/getcourse/${courseId}`);
      if (res.data) {
        setCourse(res.data);
        dispatch(setSelectedCourse(res.data));

        if (res.data.isEnrolled || res.data.hasAccess) {
          setIsEnrolled(true);
        }

        // Default to first preview-free lecture if any
        if (res.data.lectures && res.data.lectures.length > 0) {
          const previewLec =
            res.data.lectures.find((l) => l.isPreviewFree) || res.data.lectures[0];
          setSelectedLecture(previewLec);
        }
      }
    } catch (error) {
      console.warn("[ViewCourse] Direct fetch error:", error);
      const found = (courseData || []).find((c) => c._id === courseId);
      if (found) setCourse(found);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  // Check if current user is creator or tenant admin
  const isCreator = Boolean(
    userData?._id &&
    course?.creator &&
    ((typeof course.creator === "string" ? course.creator : course.creator?._id)?.toString() === userData._id.toString())
  );
  const isTenantAdmin = Boolean(
    userData && (userData.role === "admin" || userData.role === "tenant_admin" || userData.role === "platform_admin")
  );
  const hasFullAccess = Boolean(isEnrolled || isCreator || isTenantAdmin);

  // Check enrollment & ownership from user data
  useEffect(() => {
    if (userData && courseId) {
      const isCreatorUser = Boolean(
        course?.creator &&
        ((typeof course.creator === "string" ? course.creator : course.creator?._id)?.toString() === userData._id?.toString())
      );
      const isAdminUser = userData.role === "admin" || userData.role === "tenant_admin" || userData.role === "platform_admin";
      const enrolled = userData.enrolledCourses?.some(
        (c) => (typeof c === "string" ? c : c._id)?.toString() === courseId.toString()
      );
      if (isCreatorUser || isAdminUser || enrolled) {
        setIsEnrolled(true);
      }
    }
  }, [userData, course, courseId]);

  // Fetch Creator Info
  useEffect(() => {
    const fetchCreator = async () => {
      const creatorId = course?.creator;
      if (creatorId && typeof creatorId === "string") {
        try {
          const res = await api.post("/api/course/creator", { userId: creatorId });
          setCreatorData(res.data);
        } catch (err) {
          console.warn("[ViewCourse] Creator fetch error:", err.message);
        }
      } else if (course?.creator && typeof course.creator === "object") {
        setCreatorData(course.creator);
      }
    };

    if (course) {
      fetchCreator();
    }
  }, [course]);

  // Fetch Course Resources
  const loadResources = async () => {
    if (!courseId) return;
    try {
      setResourcesLoading(true);
      const res = await api.get(`/api/resource/course/${courseId}`);
      if (res.data?.success) {
        setResources(res.data.resources || []);
      }
    } catch (err) {
      // 403 when not enrolled is expected for private course resources
      if (err.response?.status !== 403) {
        console.warn("[ViewCourse] Resource load error:", err.message);
      }
    } finally {
      setResourcesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "resources" || isEnrolled) {
      loadResources();
    }
  }, [activeTab, isEnrolled, courseId]);

  // Handle Enrollment
  const handleEnroll = async () => {
    if (!userData) {
      toast.info("Please sign in to enroll in this course");
      navigate("/login");
      return;
    }

    if (isCreator) {
      toast.info("You are the instructor of this course. Full access is granted.");
      setIsEnrolled(true);
      return;
    }

    setEnrollLoading(true);
    try {
      // 1. Free course check
      if (!course?.price || Number(course.price) === 0) {
        const verifyRes = await api.post("/api/order/verifypayment", {
          courseId,
          freeEnrollment: true,
        });
        setIsEnrolled(true);
        if (verifyRes.data.user) {
          dispatch(setUserData(verifyRes.data.user));
        }
        toast.success(verifyRes.data.message || "Enrolled successfully in free course!");
        loadCourse();
        return;
      }

      // 2. Create order from backend
      const { data: orderData } = await api.post("/api/order/razorpay-order", { courseId });

      // 3. Handle simulated mock order
      if (orderData.mock) {
        const verifyRes = await api.post("/api/order/verifypayment", {
          courseId,
          razorpay_order_id: orderData.id,
        });
        setIsEnrolled(true);
        if (verifyRes.data.user) {
          dispatch(setUserData(verifyRes.data.user));
        }
        toast.success(verifyRes.data.message || "Enrolled successfully!");
        loadCourse();
        return;
      }

      // 4. Ensure Razorpay Checkout SDK is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        toast.error("Razorpay SDK could not be loaded. Please check your internet connection.");
        return;
      }

      // 5. Open Razorpay Checkout modal
      const options = {
        key: orderData.key || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_STpcnn96tSDaDI",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: tenant?.name || "Skillio Academy",
        description: `Enrollment in ${course?.title}`,
        order_id: orderData.id,
        prefill: {
          name: userData?.name || "",
          email: userData?.email || "",
        },
        theme: {
          color: tenant?.branding?.primaryColor || "#1e3a8a",
        },
        handler: async function (res) {
          try {
            const verifyRes = await api.post("/api/order/verifypayment", {
              ...res,
              courseId,
            });
            setIsEnrolled(true);
            if (verifyRes.data.user) {
              dispatch(setUserData(verifyRes.data.user));
            }
            toast.success(verifyRes.data.message || "Payment verified and enrolled!");
            loadCourse();
          } catch (err) {
            toast.error(err?.response?.data?.message || "Payment verification failed");
          }
        },
        modal: {
          ondismiss: function () {
            toast.info("Payment cancelled");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        toast.error(response?.error?.description || "Payment failed");
      });
      rzp.open();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to initialize enrollment");
    } finally {
      setEnrollLoading(false);
    }
  };

  // Handle Review Submission
  const handleReview = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error("Please select a rating between 1 and 5 stars");
      return;
    }

    setReviewLoading(true);
    try {
      await api.post("/api/review/create-review", {
        rating,
        comment,
        courseId,
      });
      toast.success("Review submitted successfully!");
      setComment("");
      setRating(0);
      loadCourse();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit review");
    } finally {
      setReviewLoading(false);
    }
  };

  const calculateAvgReview = (reviews) => {
    if (!reviews || reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    return (total / reviews.length).toFixed(1);
  };

  const avgRating = calculateAvgReview(course?.reviews);
  const reviewCount = course?.reviews?.length || 0;
  const isFree = !course?.price || Number(course?.price) === 0;

  // Filter resources
  const filteredResources = (resources || []).filter((r) => {
    if (!resourceSearch.trim()) return true;
    const q = resourceSearch.toLowerCase();
    return (
      r.title?.toLowerCase().includes(q) ||
      r.topic?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q)
    );
  });

  if (fetching && !course) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917]">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#78716c] text-xs font-semibold uppercase tracking-wider">
            Loading Course Curriculum...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-36 md:pb-12">
        {/* Back Link */}
        <button
          onClick={() => navigate("/allcourses")}
          className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer font-medium touch-target pressable"
        >
          <ArrowLeft size={16} /> Back to Course Catalog
        </button>

        {/* Hero Course Header (Mobile First Order: Preview on top, then Details) */}
        <div className="bg-white border border-[#e8e5dc] rounded-3xl p-5 sm:p-8 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Video preview / Action Card (Right on desktop, First on mobile) */}
          <div className="order-1 lg:order-2 lg:col-span-5 bg-[#faf9f6] border border-[#e8e5dc] rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xs">
            {/* Video preview / Thumbnail */}
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative flex items-center justify-center border border-[#e8e5dc]">
              {selectedLecture?.videoUrl ? (
                <video
                  src={selectedLecture.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : course?.thumbnail ? (
                <img
                  src={optimizeImage(course.thumbnail, 800)}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 text-gray-400 text-xs space-y-1">
                  <PlayCircle size={32} className="mx-auto text-gray-500" />
                  <p>Course Preview</p>
                </div>
              )}
            </div>

            {/* Price section */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                {isFree ? (
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">Free</span>
                ) : (
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#1c1917]">
                    ₹{(course?.price || 0).toLocaleString("en-IN")}
                  </span>
                )}
                {!isFree && course?.price > 0 && (
                  <span className="line-through text-xs text-[#78716c] ml-2">
                    ₹{Math.round(course.price * 1.4).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                100% Guaranteed Access
              </span>
            </div>

            {/* Desktop / In-card Enrollment CTA */}
            {isCreator ? (
              <div className="flex flex-col gap-2.5">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold">Instructor Access: You own this course</span>
                </div>
                <Button
                  onClick={() => navigate(`/builder/${courseId}`)}
                  variant="primary"
                  size="lg"
                  className="w-full bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold py-3.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <SquarePen className="inline-block mr-2" size={17} />
                  Edit in Course Builder
                </Button>
                <Button
                  onClick={() => navigate(`/viewlecture/${courseId}`)}
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center text-xs text-[#57534e]"
                >
                  Watch Course Lectures
                </Button>
              </div>
            ) : !isEnrolled ? (
              <Button
                onClick={handleEnroll}
                loading={enrollLoading}
                variant="primary"
                size="lg"
                className="w-full bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold py-3.5 rounded-xl shadow-md cursor-pointer"
              >
                {isFree ? "Enroll Now (Free)" : "Enroll Now"}
              </Button>
            ) : (
              <Button
                onClick={() => navigate(`/viewlecture/${courseId}`)}
                variant="primary"
                size="lg"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 rounded-xl shadow-md cursor-pointer"
              >
                Watch Course Lectures
              </Button>
            )}

            <div className="space-y-2 pt-2 border-t border-[#e8e5dc] text-xs text-[#57534e]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Immediate access to all video lectures</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Verified study notes and cheat sheets</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Direct classroom AI study assistant</span>
              </div>
            </div>
          </div>

          {/* Main Details (Left on desktop, Second on mobile) */}
          <div className="order-2 lg:order-1 lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] bg-[#eff6ff] px-3 py-1 rounded-lg border border-[#bfdbfe]">
                {tenant?.name || "Academy"} • {course?.category || "General"}
              </span>
              <span className="text-xs font-semibold text-[#57534e] bg-[#f8f7f4] px-3 py-1 rounded-lg border border-[#e8e5dc]">
                Level: {course?.level || "All Levels"}
              </span>
              {isFree && (
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-300">
                  Free Enrollment
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1c1917] leading-tight tracking-tight">
              {course?.title}
            </h1>

            <p className="text-xs sm:text-base text-[#57534e] leading-relaxed">
              {course?.subTitle || course?.description}
            </p>

            {/* Stats Meta */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#57534e] pt-2">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span className="text-[#1c1917]">{avgRating}</span>
                <span className="text-[#78716c] font-normal">({reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#57534e]">
                <Video size={16} className="text-[#1e3a8a]" />
                <span>{course?.lectures?.length || 0} Lectures</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#57534e]">
                <Clock size={16} className="text-[#1e3a8a]" />
                <span>Lifetime Access</span>
              </div>
            </div>

            {/* Instructor Summary */}
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
                  <p className="text-xs text-[#78716c]">Created by</p>
                  <p className="text-xs sm:text-sm font-bold text-[#1c1917]">
                    {creatorData.name || "Course Instructor"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Udemy-Style 4 Tab Section */}
        <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#e8e5dc] overflow-x-auto pb-px">
            {[
              { id: "overview", label: "Overview", icon: BookOpen },
              { id: "curriculum", label: `Curriculum (${course?.lectures?.length || 0})`, icon: Video },
              { id: "resources", label: `Notes & Resources (${resources.length})`, icon: FileText },
              { id: "reviews", label: `Reviews (${reviewCount})`, icon: Star },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${isActive
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-[#78716c] hover:text-[#1c1917]"
                    }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 max-w-4xl">
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-[#1c1917]">About This Course</h2>
                <p className="text-xs sm:text-sm text-[#44403c] leading-relaxed whitespace-pre-line">
                  {course?.description || "No description provided."}
                </p>
              </div>

              {/* What you'll learn */}
              <div className="p-5 rounded-2xl bg-[#faf9f6] border border-[#e8e5dc] space-y-3">
                <h3 className="text-sm font-bold text-[#1c1917] flex items-center gap-2">
                  <CheckCircle size={16} className="text-[#1e3a8a]" />
                  What You Will Learn
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#57534e]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                    <span>In-depth conceptual lectures with clear real-world examples</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                    <span>Downloadable topic notes and formulas for rapid revision</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                    <span>Self-paced access across desktop and mobile devices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                    <span>Direct peer reviews and ratings from fellow students</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: CURRICULUM */}
          {activeTab === "curriculum" && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex items-center justify-between pb-2">
                <h2 className="text-base font-bold text-[#1c1917]">Course Lectures</h2>
                <span className="text-xs text-[#78716c]">
                  {course?.lectures?.length || 0} total lectures
                </span>
              </div>

              <div className="space-y-2">
                {course?.lectures?.length > 0 ? (
                  course.lectures.map((lec, idx) => {
                    const isPreview = Boolean(lec.isPreviewFree);
                    const canPlay = hasFullAccess || isPreview;

                    return (
                      <div
                        key={lec._id || idx}
                        onClick={() => {
                          if (canPlay) {
                            setSelectedLecture(lec);
                          } else {
                            toast.info("Please enroll in this course to watch locked lectures.");
                          }
                        }}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${selectedLecture?._id === lec._id
                          ? "bg-blue-50/70 border-[#1e3a8a]"
                          : "bg-[#faf9f6] border-[#e8e5dc] hover:bg-white"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${canPlay
                              ? "bg-blue-100 text-[#1e3a8a]"
                              : "bg-gray-100 text-gray-500"
                              }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-[#1c1917]">
                              {lec.lectureTitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPreview ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Free Preview
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold flex items-center gap-1 text-[#78716c] bg-white px-2 py-0.5 rounded border border-[#e8e5dc]">
                              <Lock size={11} />
                              Locked
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#78716c] py-6 text-center">
                    Lectures will be published shortly by the instructor.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NOTES & RESOURCES */}
          {activeTab === "resources" && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#f2efe9]">
                <div>
                  <h2 className="text-base font-bold text-[#1c1917]">
                    Course Notes & Supplementary Materials
                  </h2>
                  <p className="text-xs text-[#78716c]">
                    Download formula sheets, lecture notes, slide decks, and code files.
                  </p>
                </div>

                {/* Resource Search */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]" />
                  <input
                    type="text"
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    placeholder="Search resources..."
                    className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              {!hasFullAccess && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-amber-700 shrink-0" />
                    <span>Enroll in this course to download and view the full resource library.</span>
                  </div>
                  <button
                    onClick={handleEnroll}
                    className="px-3 py-1 bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Enroll Now
                  </button>
                </div>
              )}

              {resourcesLoading ? (
                <div className="py-8 text-center text-xs text-[#78716c]">Loading resources...</div>
              ) : filteredResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredResources.map((res) => (
                    <div
                      key={res._id}
                      className="p-4 rounded-2xl bg-[#faf9f6] border border-[#e8e5dc] flex items-start justify-between gap-3 hover:border-[#1e3a8a]/40 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center shrink-0 border border-blue-200">
                          <FileText size={18} />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-bold text-[#1c1917] leading-tight">
                            {res.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#78716c]">
                            <span className="uppercase font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#e8e5dc]">
                              {res.type || "PDF"}
                            </span>
                            {res.topic && <span>• Topic: {res.topic}</span>}
                            {res.fileSize && <span>• {res.fileSize}</span>}
                          </div>
                          {res.lectureId?.lectureTitle && (
                            <p className="text-[11px] text-[#1e3a8a] font-medium">
                              Linked to: {res.lectureId.lectureTitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {hasFullAccess ? (
                        <a
                          href={res.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="p-2 rounded-lg bg-white border border-[#d6d3c9] text-[#1e3a8a] hover:bg-blue-50 transition shrink-0 cursor-pointer"
                          title="Download Resource"
                        >
                          <Download size={15} />
                        </a>
                      ) : (
                        <span className="text-gray-400 p-2">
                          <Lock size={15} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4 bg-[#faf9f6] rounded-2xl border border-[#e8e5dc] space-y-2">
                  <FileText size={32} className="mx-auto text-[#a8a29e]" />
                  <p className="text-xs sm:text-sm font-bold text-[#1c1917]">No resources found</p>
                  <p className="text-xs text-[#78716c]">
                    {resourceSearch ? "Try clearing your search keyword." : "Notes and study sheets will appear here once uploaded by the instructor."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REVIEWS */}
          {activeTab === "reviews" && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between pb-2 border-b border-[#f2efe9]">
                <div>
                  <h2 className="text-base font-bold text-[#1c1917]">Student Reviews</h2>
                  <p className="text-xs text-[#78716c]">Feedback from enrolled students</p>
                </div>
                <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm">
                  <Star size={16} className="fill-amber-400" />
                  <span>{avgRating} / 5</span>
                </div>
              </div>

              {/* Review Submission Form (if enrolled) */}
              {isEnrolled && (
                <form
                  onSubmit={handleReview}
                  className="p-5 rounded-2xl bg-[#faf9f6] border border-[#e8e5dc] space-y-3"
                >
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    Leave Your Review
                  </label>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer text-gray-300 hover:text-amber-400"
                      >
                        <Star
                          size={20}
                          className={star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-[#78716c] ml-2">
                      {rating > 0 ? `${rating} Stars` : "Select rating"}
                    </span>
                  </div>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with this course curriculum..."
                    rows={3}
                    className="w-full bg-white border border-[#d6d3c9] rounded-xl p-3 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />

                  <Button type="submit" variant="primary" size="sm" loading={reviewLoading}>
                    Submit Review
                  </Button>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-3">
                {course?.reviews?.length > 0 ? (
                  course.reviews.map((rev, index) => (
                    <div
                      key={rev._id || index}
                      className="p-4 rounded-2xl bg-[#faf9f6] border border-[#e8e5dc] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1c1917]">
                          {rev.user?.name || "Verified Student"}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                          <Star size={13} className="fill-amber-400" />
                          <span>{rev.rating}</span>
                        </div>
                      </div>
                      {rev.comment && (
                        <p className="text-xs sm:text-sm text-[#44403c] leading-relaxed">
                          {rev.comment}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#78716c] text-center py-6">
                    No reviews yet. Be the first to review this course!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Mobile Enrollment Bar (Fixed Above Mobile Bottom Nav) */}
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e8e5dc] p-3 px-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] text-[#78716c] font-bold uppercase tracking-wider">Tuition</p>
            <p className="text-base font-extrabold text-[#1c1917]">
              {isFree ? "Free" : `₹${(course?.price || 0).toLocaleString("en-IN")}`}
            </p>
          </div>
          {hasFullAccess ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/viewlecture/${courseId}`)}
              className="shadow-md pressable font-bold"
            >
              Resume Watching
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              loading={enrollLoading}
              onClick={handleEnroll}
              className="shadow-md pressable font-bold"
            >
              {isFree ? "Enroll for Free" : "Enroll Now"}
            </Button>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ViewCourses;
