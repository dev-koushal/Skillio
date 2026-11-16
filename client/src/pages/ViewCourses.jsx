import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  Star,
  CheckCircle,
  Video,
  BookOpen,
  Clock,
  FileText,
  Search,
  CheckCircle2,
  SquarePen,
  LockOpen,
  Play,
  X,
  Maximize2,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedCourse } from "../redux/courseSlice";
import { setUserData } from "../redux/userSlice";
import api from "../services/api";
import { toast } from "react-toastify";
import { useTenant } from "../context/TenantContext";
import { canManageCourse } from "../auth/permissions";
import Button from "../components/common/Button";
import { getStoredTenantSlug } from "../services/tenantStorage";
import { mergeEnrollmentUser } from "../services/enrollmentUser";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { optimizeImage } from "../utils/imageOptimizer";
import SecureVideoPlayer from "../components/video/SecureVideoPlayer";
import SecureDocumentViewer from "../components/resources/SecureDocumentViewer";
import "./InstitutionStudentPages.css";

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
  const { courseId, slug } = useParams();
  const dispatch = useDispatch();

  const { courseData } = useSelector((state) => state.course);
  const { userData } = useSelector((state) => state.user);
  const { tenant } = useTenant();

  const targetSlug = slug || (tenant && !tenant.isPlatform ? tenant.slug : getStoredTenantSlug());
  const accent = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(tenant?.primaryColor || "")
    ? tenant.primaryColor
    : "#5b3cc4";
  const tenantStyle = { "--institution-accent": accent };

  const [course, setCourse] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [creatorData, setCreatorData] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Tab State: "overview" | "curriculum" | "resources" | "reviews"
  const [activeTab, setActiveTab] = useState("overview");

  // Notes & Resources State
  const [resources, setResources] = useState([]);
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);
  const [buyingResourceId, setBuyingResourceId] = useState(null);

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
            res.data.lectures.find((l) => l.isPreviewFree || l.accessState === "preview") || res.data.lectures[0];
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

  // Check if the current educator created this course
  const hasManagementAccess = canManageCourse(userData, course);
  const hasFullAccess = Boolean(isEnrolled || hasManagementAccess);

  // Check enrollment & ownership from user data
  useEffect(() => {
    if (userData && courseId) {
      const canManageThisCourse = canManageCourse(userData, course);
      const enrolled = userData.enrolledCourses?.some(
        (c) => (typeof c === "string" ? c : c._id)?.toString() === courseId.toString()
      );
      if (canManageThisCourse || enrolled) {
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

  const applyVerifiedEnrollment = (updatedUser) => {
    if (updatedUser) {
      dispatch(setUserData(mergeEnrollmentUser(userData, updatedUser)));
    }
    setIsEnrolled(true);
  };

  // Handle Enrollment
  const handleEnroll = async () => {
    if (!userData) {
      toast.info("Please sign in to enroll in this course");
      navigate("/login");
      return;
    }

    if (hasManagementAccess) {
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
        applyVerifiedEnrollment(verifyRes.data.user);
        toast.success(verifyRes.data.message || "Enrolled successfully in free course!");
        await loadCourse();
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
        applyVerifiedEnrollment(verifyRes.data.user);
        toast.success(verifyRes.data.message || "Enrolled successfully!");
        await loadCourse();
        return;
      }

      // 4. Ensure Razorpay Checkout SDK is loaded
      if (!orderData.key) {
        toast.error("Payments are not configured for this institution. Please contact support.");
        return;
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        toast.error("Razorpay SDK could not be loaded. Please check your internet connection.");
        return;
      }

      // 5. Open Razorpay Checkout modal
      const options = {
        key: orderData.key,
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
            applyVerifiedEnrollment(verifyRes.data.user);
            toast.success(verifyRes.data.message || "Payment verified and enrolled!");
            await loadCourse();
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

  const handleBuyResource = async (resource) => {
    if (!userData?._id) {
      toast.info("Sign in to unlock these notes.");
      navigate("/login");
      return;
    }
    setBuyingResourceId(resource._id);
    try {
      const { data: order } = await api.post(`/api/resource/${resource._id}/order`);
      if (!order.key) throw new Error("Notes payments are not configured yet.");
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) throw new Error("Razorpay checkout could not be loaded.");
      const checkout = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: tenant?.name || "Skillio Academy",
        description: `Unlock ${resource.title}`,
        order_id: order.id,
        prefill: { name: userData?.name || "", email: userData?.email || "" },
        theme: { color: tenant?.primaryColor || "#1e3a8a" },
        handler: async (payment) => {
          try {
            await api.post(`/api/resource/${resource._id}/verify`, payment);
            toast.success("Notes unlocked. Your access is ready.");
            await loadResources();
          } catch (error) {
            toast.error(error.response?.data?.message || "Payment verification failed.");
          } finally {
            setBuyingResourceId(null);
          }
        },
        modal: { ondismiss: () => setBuyingResourceId(null) },
      });
      checkout.on("payment.failed", (event) => toast.error(event?.error?.description || "Payment failed."));
      checkout.open();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not start the purchase.");
      setBuyingResourceId(null);
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
    if (!reviews || reviews.length === 0) return null;
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

  useEffect(() => {
    if (activeTab !== "resources" || !resources.some((resource) => resource.processingStatus === "processing")) return;
    const timer = setTimeout(loadResources, 5000);
    return () => clearTimeout(timer);
  }, [resources, activeTab, courseId]);

  const firstPreviewLecture = useMemo(() => {
    return (course?.lectures || []).find((l) => l.isPreviewFree || l.accessState === "preview") || null;
  }, [course]);

  if (fetching && !course) {
    return (
      <div className="institution-student-page min-h-screen text-[#1c1917]" style={tenantStyle}>
        <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
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

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 pb-28 md:pb-12">
        {/* Compact Back Header */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(targetSlug ? `/institution/${targetSlug}/courses` : "/courses")}
            className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer font-medium p-1 rounded-lg hover:bg-[#f1ede4] pressable"
          >
            <ArrowLeft size={16} />
            <span>Back to Courses</span>
          </button>
          <span className="text-[11px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
            {tenant?.name || "Skillio"}
          </span>
        </div>

        {/* Main Course Grid: 8 cols content, 4 cols sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Main Content Column (Mobile: 100%, Desktop: 8 cols) */}
          <div className="lg:col-span-8 space-y-5">

            {/* Mobile-Only Hero Thumbnail (16:9 Aspect Ratio) */}
            <div className="lg:hidden">
              <div
                onClick={() => {
                  if (hasFullAccess) {
                    navigate(`/viewlecture/${courseId}`);
                  } else if (firstPreviewLecture) {
                    setSelectedLecture(firstPreviewLecture);
                    setIsPreviewModalOpen(true);
                  } else if (course?.lectures?.[0]?.canPlay) {
                    setSelectedLecture(course.lectures[0]);
                    setIsPreviewModalOpen(true);
                  } else {
                    toast.info("Please enroll in this course to access the classroom lectures.");
                  }
                }}
                className="group relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-[#e8e5dc] shadow-sm cursor-pointer select-none"
              >
                {course?.thumbnail ? (
                  <img
                    src={optimizeImage(course.thumbnail, 800)}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 group-hover:from-black/70 transition-colors" />

                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-10">
                  <div className="w-12 h-12 rounded-full bg-white/95 text-[#1e3a8a] shadow-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-[#1e3a8a] group-hover:text-white transition-all">
                    <Play size={20} className="fill-current ml-0.5" />
                  </div>
                  <span className="text-[11px] font-bold text-white tracking-wide drop-shadow-md">
                    {hasFullAccess ? "Resume Watching" : firstPreviewLecture ? "Watch Free Preview" : "Preview Course"}
                  </span>
                </div>

                <div className="absolute top-2.5 left-2.5 z-10">
                  {hasFullAccess ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle size={10} /> Enrolled
                    </span>
                  ) : firstPreviewLecture ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      <LockOpen size={10} /> Free Preview Available
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Course Title and Metadata */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[#57534e] bg-[#f8f7f4] px-2.5 py-0.5 rounded-md border border-[#e8e5dc]">
                  {course?.category || "Course"}
                </span>
                <span className="text-[11px] font-semibold text-[#57534e] bg-[#f8f7f4] px-2.5 py-0.5 rounded-md border border-[#e8e5dc]">
                  {course?.level || "All Levels"}
                </span>
                {isFree && (
                  <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    Free
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1c1917] tracking-tight leading-snug">
                {course?.title}
              </h1>

              <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
                {course?.subTitle || course?.description}
              </p>

              {/* Compact Meta Row */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[#57534e] pt-1">
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="text-[#1c1917]">{avgRating}</span>
                    <span className="text-[#78716c] font-normal">({reviewCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Video size={14} className="text-[#1e3a8a]" />
                  <span>{course?.lectures?.length || 0} Lectures</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[#1e3a8a]" />
                  <span>Lifetime Access</span>
                </div>
                {creatorData?.name && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#78716c]">By</span>
                    <span className="font-semibold text-[#1c1917]">{creatorData.name}</span>
                  </div>
                )}
              </div>

              {/* Mobile-Only Prominent Action Bar */}
              <div className="lg:hidden pt-2">
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#e8e5dc] shadow-2xs">
                  <div>
                    <p className="text-[10px] text-[#78716c] font-bold uppercase tracking-wider">Tuition</p>
                    <p className="text-lg font-extrabold text-[#1c1917]">
                      {isFree ? "Free" : `₹${(course?.price || 0).toLocaleString("en-IN")}`}
                    </p>
                  </div>
                  {hasManagementAccess ? (
                    <Button
                      onClick={() => navigate(`/builder/${courseId}`)}
                      variant="primary"
                      size="sm"
                      className="font-bold bg-[#1e3a8a] text-white px-4 py-2"
                    >
                      Edit Course
                    </Button>
                  ) : hasFullAccess ? (
                    <Button
                      onClick={() => navigate(`/viewlecture/${courseId}`)}
                      variant="primary"
                      size="sm"
                      className="font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2"
                    >
                      Go to Classroom
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEnroll}
                      loading={enrollLoading}
                      variant="primary"
                      size="sm"
                      className="font-bold bg-[#1e3a8a] hover:bg-[#172554] text-white px-5 py-2"
                    >
                      {isFree ? "Enroll for Free" : "Enroll Now"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Navigation (Overview | Curriculum | Resources | Reviews) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-1 sm:gap-2 border-b border-[#e8e5dc] overflow-x-auto no-scrollbar">
                {[
                  { id: "overview", label: "Overview", icon: BookOpen },
                  { id: "curriculum", label: `Curriculum (${course?.lectures?.length || 0})`, icon: Video },
                  { id: "resources", label: `Resources (${resources.length})`, icon: FileText },
                  { id: "reviews", label: `Reviews${reviewCount ? ` (${reviewCount})` : ""}`, icon: Star },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${isActive
                        ? "border-[#1e3a8a] text-[#1e3a8a]"
                        : "border-transparent text-[#78716c] hover:text-[#1c1917]"
                        }`}
                    >
                      <Icon size={15} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xs">
                    <h2 className="text-base font-bold text-[#1c1917]">About This Course</h2>
                    <p className="text-xs sm:text-sm text-[#44403c] leading-relaxed whitespace-pre-line">
                      {course?.description || "No description provided."}
                    </p>
                  </div>

                  {/* Highlights / Features */}
                  <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xs">
                    <h3 className="text-sm font-bold text-[#1c1917] flex items-center gap-2">
                      <CheckCircle size={16} className="text-[#1e3a8a]" />
                      <span>What You Will Learn</span>
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#57534e]">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                        <span>Comprehensive video lectures with real-world case studies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                        <span>Downloadable revision notes, summaries, and formula sheets</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                        <span>Flexible self-paced learning across phone and laptop</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                        <span>Direct classroom study resources and interactive Q&A</span>
                      </li>
                    </ul>
                  </div>

                  {/* Instructor Bio Card */}
                  {creatorData && (
                    <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xs">
                      <h3 className="text-sm font-bold text-[#1c1917]">Instructor</h3>
                      <div className="flex items-center gap-3">
                        {creatorData.profilePicture ? (
                          <img
                            src={creatorData.profilePicture}
                            alt={creatorData.name}
                            className="w-12 h-12 rounded-full object-cover border border-[#d6d3c9]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-base">
                            {creatorData.name?.charAt(0) || "I"}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-[#1c1917]">
                            {creatorData.name || "Course Instructor"}
                          </p>
                          <p className="text-xs text-[#78716c]">
                            {creatorData.description || "Educator at " + (tenant?.name || "Skillio")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CURRICULUM (Canonical Learning Interface) */}
              {activeTab === "curriculum" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-[#1c1917]">
                      {course?.lectures?.length || 0} Lectures
                    </span>
                    <span className="text-xs text-[#78716c]">
                      {(course?.lectures || []).filter((l) => l.isPreviewFree || l.accessState === "preview").length} Free Previews
                    </span>
                  </div>

                  <div className="space-y-2">
                    {course?.lectures?.length > 0 ? (
                      course.lectures.map((lec, idx) => {
                        const isPreview = Boolean(lec.isPreviewFree || lec.accessState === "preview");
                        const isEnrolledAccess = Boolean(hasFullAccess || lec.accessState === "enrolled");
                        const canPlay = Boolean(lec.canPlay ?? (isEnrolledAccess || isPreview));
                        const isCurrent = selectedLecture?._id === lec._id;

                        return (
                          <div
                            key={lec._id || idx}
                            onClick={() => {
                              if (canPlay) {
                                setSelectedLecture(lec);
                                setIsPreviewModalOpen(true);
                              } else {
                                toast.info("Please enroll in this course to watch locked lectures.");
                              }
                            }}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isCurrent
                              ? "bg-blue-50/80 border-[#1e3a8a] text-[#1e3a8a] shadow-2xs"
                              : canPlay
                                ? "bg-white border-[#e8e5dc] hover:border-[#1e3a8a]/40 hover:bg-[#faf9f6]"
                                : "bg-[#faf9f6] border-[#e8e5dc] opacity-80 hover:opacity-100"
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isCurrent
                                  ? "bg-[#1e3a8a] text-white"
                                  : canPlay
                                    ? "bg-blue-50 text-[#1e3a8a]"
                                    : "bg-[#e8e5dc] text-[#78716c]"
                                  }`}
                              >
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs sm:text-sm font-semibold truncate ${canPlay ? "text-[#1c1917] group-hover:text-[#1e3a8a]" : "text-[#57534e]"
                                  }`}>
                                  {lec.lectureTitle}
                                </p>
                                <span className="text-[10px] text-[#78716c]">
                                  {lec.duration ? `${Math.round(lec.duration / 60)} min • ` : ""}
                                  {lec.videoProvider === "youtube"
                                    ? "YouTube"
                                    : lec.videoProvider === "bunny"
                                      ? "Native Video"
                                      : "Classroom Video"}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5 ml-2">
                              {isEnrolledAccess ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  <CheckCircle size={10} /> Unlocked
                                </span>
                              ) : isPreview ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                                  <LockOpen size={10} /> Free Preview
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#78716c] bg-[#f4f2ec] px-2 py-0.5 rounded-full border border-[#e8e5dc]">
                                  <Lock size={10} /> Locked
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 text-center text-xs text-[#78716c]">
                        No lectures published in this course yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: RESOURCES */}
              {activeTab === "resources" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]" />
                      <input
                        type="text"
                        placeholder="Search course resources..."
                        value={resourceSearch}
                        onChange={(e) => setResourceSearch(e.target.value)}
                        className="w-full bg-white border border-[#d6d3c9] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                      />
                    </div>
                    <span className="text-xs text-[#78716c]">
                      {filteredResources.length} {filteredResources.length === 1 ? "resource" : "resources"}
                    </span>
                  </div>

                  {resourcesLoading ? (
                    <div className="bg-white border border-[#e8e5dc] rounded-2xl p-8 text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-[#78716c]">Loading study material...</p>
                    </div>
                  ) : filteredResources.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredResources.map((res) => {
                        const isNoteEnrolled = hasFullAccess || res.isEnrolled || res.accessType === "free";
                        return (
                          <div
                            key={res._id}
                            className="bg-white border border-[#e8e5dc] rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded-md">
                                  {res.type || "Document"}
                                </span>
                                {res.accessType === "free" ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    Free
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-[#1c1917]">
                                    ₹{res.price || 0}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs sm:text-sm font-bold text-[#1c1917] line-clamp-2">
                                {res.title}
                              </h4>
                              {res.description && (
                                <p className="text-[11px] text-[#57534e] line-clamp-2">
                                  {res.description}
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-[#f2efe9]">
                              {isNoteEnrolled ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setActiveDocument(res)}
                                  className="w-full text-xs font-semibold"
                                >
                                  View Resource
                                </Button>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  loading={buyingResourceId === res._id}
                                  onClick={() => handleBuyResource(res)}
                                  className="w-full text-xs font-semibold bg-[#1e3a8a] hover:bg-[#172554] text-white"
                                >
                                  Unlock for ₹{res.price}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 text-center text-xs text-[#78716c]">
                      No study resources found for this course.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: REVIEWS */}
              {activeTab === "reviews" && (
                <div className="space-y-5">
                  {/* Review Submission for Enrolled Users */}
                  {hasFullAccess && (
                    <form onSubmit={handleReview} className="bg-white border border-[#e8e5dc] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                      <h3 className="text-sm font-bold text-[#1c1917]">Leave a Review</h3>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRating(star)}
                            className="p-1 hover:scale-110 transition cursor-pointer"
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
                        className="w-full bg-[#faf9f6] border border-[#d6d3c9] rounded-xl p-3 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
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
                          className="p-4 rounded-2xl bg-white border border-[#e8e5dc] space-y-1.5 shadow-2xs"
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
                      <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 text-center text-xs text-[#78716c]">
                        No reviews yet. Be the first to review this course!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DESKTOP SIDEBAR (4 cols, Sticky, Hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
            <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 space-y-5 shadow-xs">
              {/* Desktop 16:9 Thumbnail Preview Trigger */}
              <div
                onClick={() => {
                  if (hasFullAccess) {
                    navigate(`/viewlecture/${courseId}`);
                  } else if (firstPreviewLecture) {
                    setSelectedLecture(firstPreviewLecture);
                    setIsPreviewModalOpen(true);
                  } else if (course?.lectures?.[0]?.canPlay) {
                    setSelectedLecture(course.lectures[0]);
                    setIsPreviewModalOpen(true);
                  } else {
                    toast.info("Please enroll in this course to access the classroom lectures.");
                  }
                }}
                className="group relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-[#e8e5dc] shadow-sm cursor-pointer select-none card-lift"
              >
                {course?.thumbnail ? (
                  <img
                    src={optimizeImage(course.thumbnail, 800)}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 group-hover:from-black/70 transition-colors" />

                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-full bg-white text-[#1e3a8a] shadow-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-[#1e3a8a] group-hover:text-white transition-all">
                    <Play size={20} className="fill-current ml-0.5" />
                  </div>
                  <span className="text-[11px] font-bold text-white tracking-wide drop-shadow-md">
                    {hasFullAccess ? "Resume Watching" : firstPreviewLecture ? "Watch Free Preview" : "Preview Course"}
                  </span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20">
                  <Maximize2 size={11} />
                  <span>Preview</span>
                </div>
              </div>

              {/* Price section */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <p className="text-[10px] text-[#78716c] font-bold uppercase tracking-wider">Tuition</p>
                  {isFree ? (
                    <span className="text-3xl font-extrabold text-emerald-700">Free</span>
                  ) : (
                    <span className="text-3xl font-extrabold text-[#1c1917]">
                      ₹{(course?.price || 0).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {hasManagementAccess ? (
                <div className="flex flex-col gap-2.5">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-semibold">Instructor Access</span>
                  </div>
                  <Button
                    onClick={() => navigate(`/builder/${courseId}`)}
                    variant="primary"
                    size="lg"
                    className="w-full bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold py-3.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <SquarePen className="inline mr-2" size={17} />
                    Edit Course
                  </Button>
                  <Button
                    onClick={() => navigate(`/viewlecture/${courseId}`)}
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center text-xs text-[#57534e]"
                  >
                    Watch Classroom Lectures
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
                  {isFree ? "Enroll for Free" : "Enroll Now"}
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

              {/* Course Includes List */}
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
                  <span>Classroom learning support & Q&A</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>Mobile & desktop responsive experience</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Video Preview Modal */}
        {isPreviewModalOpen && selectedLecture && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            onClick={() => setIsPreviewModalOpen(false)}
          >
            <div
              className="w-full max-w-4xl bg-[#0f172a] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#1e293b]/70">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
                    {selectedLecture.isPreviewFree ? <LockOpen size={10} /> : <CheckCircle size={10} />}
                    {selectedLecture.isPreviewFree ? "Free Preview" : "Classroom Stream"}
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                    {selectedLecture.lectureTitle}
                  </h3>
                </div>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                  aria-label="Close Preview"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Secure Video Player */}
              <div className="w-full bg-black aspect-video flex-1 min-h-[260px] flex items-center justify-center">
                <SecureVideoPlayer
                  key={selectedLecture._id}
                  lectureId={selectedLecture._id}
                  lectureTitle={selectedLecture.lectureTitle}
                />
              </div>

              {/* Lecture switcher */}
              {course?.lectures?.length > 1 && (
                <div className="px-4 py-3 bg-[#0f172a] border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">Switch:</span>
                  {course.lectures.map((lec, idx) => {
                    const isCurrent = selectedLecture._id === lec._id;
                    const canPlay = Boolean(lec.canPlay ?? (hasFullAccess || lec.isPreviewFree));
                    return (
                      <button
                        key={lec._id || idx}
                        disabled={!canPlay}
                        onClick={() => setSelectedLecture(lec)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${isCurrent
                          ? "bg-[#1e3a8a] text-white"
                          : canPlay
                            ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                            : "bg-slate-900/60 text-slate-600 cursor-not-allowed"
                          }`}
                      >
                        <span>{idx + 1}. {lec.lectureTitle}</span>
                        {lec.isPreviewFree ? (
                          <LockOpen size={10} className="text-emerald-400" />
                        ) : (
                          <Lock size={10} className="text-slate-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default ViewCourses;