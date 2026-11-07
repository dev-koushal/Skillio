import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, PlayCircle, Star, CheckCircle, Video, BookOpen, Clock } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedCourse } from "../redux/courseSlice";
import { setUserData } from "../redux/userSlice";
import api from "../services/api";
import blank_profile from "/blank_Profile.avif";
import CourseCard from "../components/CourseCard";
import { toast } from "react-toastify";
import { useTenant } from "../context/TenantContext";
import Button from "../components/common/Button";
import Navbar from "../components/Navbar";

// Helper to load Razorpay checkout script dynamically if not yet available
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

  const { courseData, selectedCourse } = useSelector((state) => state.course);
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

  // Fetch course details by ID directly (handles page refresh or direct links)
  const loadCourse = async () => {
    try {
      setFetching(true);
      const res = await api.get(`/api/course/getcourse/${courseId}`);
      if (res.data) {
        setCourse(res.data);
        dispatch(setSelectedCourse(res.data));

        // Default to first preview-free lecture if any
        if (res.data.lectures && res.data.lectures.length > 0) {
          const previewLec = res.data.lectures.find((l) => l.isPreviewFree) || res.data.lectures[0];
          setSelectedLecture(previewLec);
        }
      }
    } catch (error) {
      console.warn("[ViewCourse] Direct fetch error:", error);
      // Fallback from redux store
      const found = (courseData || []).find((c) => c._id === courseId);
      if (found) setCourse(found);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  // Check enrollment
  useEffect(() => {
    if (userData?.enrolledCourses && courseId) {
      const enrolled = userData.enrolledCourses.some(
        (c) => (typeof c === "string" ? c : c._id)?.toString() === courseId.toString()
      );
      setIsEnrolled(enrolled);
    }
  }, [userData, courseId]);

  // Fetch creator data
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

  // Handle Enrollment
  const handleEnroll = async () => {
    if (!userData) {
      toast.info("Please sign in to enroll in this course");
      navigate("/login");
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
        return;
      }

      // 2. Create order from backend
      const { data: orderData } = await api.post("/api/order/razorpay-order", { courseId });

      // 3. Handle simulated mock order (dev mode when Razorpay keys are omitted)
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
          color: tenant?.branding?.primaryColor || "#0891b2",
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

  // Handle Review
  const handleReview = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error("Please select a rating between 1 and 5 stars");
      return;
    }

    setReviewLoading(true);
    try {
      const res = await api.post("/api/review/create-review", {
        rating,
        comment,
        courseId,
      });
      toast.success("Review submitted successfully!");
      setComment("");
      setRating(0);
      loadCourse(); // Reload course to show new review
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

  if (fetching && !course) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-cyan-800 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading course details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Back Link */}
        <button
          onClick={() => navigate("/allcourses")}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Courses
        </button>

        {/* Hero Course Header */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 sm:p-8 grid md:grid-cols-12 gap-8 items-center">
          {/* Thumbnail */}
          <div className="md:col-span-5">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-gray-800 shadow-lg">
              <img
                src={
                  course?.thumbnail ||
                  "https://thumbs.dreamstime.com/b/no-thumbnail-image-placeholder-forums-blogs-websites-148010362.jpg"
                }
                alt={course?.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-cyan-300 text-xs font-semibold px-2.5 py-1 rounded-md border border-cyan-900/60">
                {course?.category || "Course"}
              </span>
            </div>
          </div>

          {/* Info & Enrollment */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <span className="text-xs uppercase font-mono text-cyan-400 tracking-wider">
                Level: {course?.level || "All Levels"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1 leading-tight">
                {course?.title}
              </h1>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                {course?.subTitle || course?.description}
              </p>
            </div>

            {/* Rating & Stats */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-300 pt-1">
              <div className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star size={16} className="fill-amber-400" />
                <span>{avgRating}</span>
                <span className="text-gray-400 font-normal">({reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <Video size={16} />
                <span>{course?.lectures?.length || 0} Lectures</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <Clock size={16} />
                <span>Lifetime Access</span>
              </div>
            </div>

            {/* Price & Action */}
            <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  ₹{(course?.price || 0).toLocaleString("en-IN")}
                </span>
                {course?.price > 0 && (
                  <span className="line-through text-xs text-gray-500 ml-2">
                    ₹{Math.round((course.price || 0) * 1.4).toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              {!isEnrolled ? (
                <Button
                  onClick={handleEnroll}
                  loading={enrollLoading}
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto shadow-lg"
                >
                  Enroll Now
                </Button>
              ) : (
                <Button
                  onClick={() => navigate(`/viewlecture/${courseId}`)}
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-700"
                >
                  Watch Course Lectures
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Curriculum & Video Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Curriculum Accordion */}
          <div className="lg:col-span-5 bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h2 className="text-base font-semibold text-white">Course Curriculum</h2>
              <span className="text-xs text-gray-400">
                {course?.lectures?.length || 0} Lectures
              </span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {course?.lectures?.length > 0 ? (
                course.lectures.map((lec, index) => {
                  const isSelected = selectedLecture?._id === lec._id;
                  const canPreview = lec.isPreviewFree || isEnrolled;
                  return (
                    <button
                      key={lec._id || index}
                      onClick={() => {
                        if (canPreview) setSelectedLecture(lec);
                      }}
                      disabled={!canPreview}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm transition cursor-pointer ${
                        isSelected
                          ? "bg-cyan-950/80 border-cyan-800 text-cyan-200"
                          : canPreview
                          ? "bg-gray-900 border-gray-800 hover:bg-gray-850 text-gray-300"
                          : "bg-gray-950/40 border-gray-900 opacity-60 cursor-not-allowed text-gray-500"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {canPreview ? (
                          <PlayCircle size={18} className="text-cyan-400 shrink-0" />
                        ) : (
                          <Lock size={16} className="text-gray-500 shrink-0" />
                        )}
                        <span className="truncate">{lec.lectureTitle}</span>
                      </div>
                      {lec.isPreviewFree && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                          Free Preview
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-gray-500 py-4 text-center">
                  Lectures will be added shortly.
                </p>
              )}
            </div>
          </div>

          {/* Video Preview Player */}
          <div className="lg:col-span-7 bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-white">
              {selectedLecture ? selectedLecture.lectureTitle : "Video Preview"}
            </h2>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-gray-800">
              {selectedLecture?.videoUrl ? (
                <video
                  src={selectedLecture.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 text-gray-400 text-xs sm:text-sm space-y-2">
                  <Lock size={28} className="mx-auto text-gray-600" />
                  <p>Enroll in this course to access the complete video curriculum.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Student Reviews</h2>
            <div className="flex items-center gap-1 text-amber-400 text-sm font-semibold">
              <Star size={16} className="fill-amber-400" />
              <span>{avgRating} / 5</span>
            </div>
          </div>

          {/* Write a Review (if enrolled) */}
          {isEnrolled && (
            <form onSubmit={handleReview} className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                Write Your Review
              </label>

              {/* Star selector */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer text-gray-600 hover:text-amber-400"
                  >
                    <Star
                      size={20}
                      className={star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-600"}
                    />
                  </button>
                ))}
                <span className="text-xs text-gray-400 ml-2">{rating > 0 ? `${rating} Stars` : "Select rating"}</span>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this course..."
                rows={3}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />

              <Button type="submit" variant="primary" size="sm" loading={reviewLoading}>
                Submit Review
              </Button>
            </form>
          )}

          {/* Existing Reviews List */}
          <div className="space-y-4">
            {course?.reviews?.length > 0 ? (
              course.reviews.map((rev, index) => (
                <div key={rev._id || index} className="p-4 rounded-xl bg-gray-900/80 border border-gray-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      {rev.user?.name || "Student"}
                    </span>
                    <div className="flex items-center gap-1 text-amber-400 text-xs">
                      <Star size={13} className="fill-amber-400" />
                      <span>{rev.rating}</span>
                    </div>
                  </div>
                  {rev.comment && <p className="text-xs sm:text-sm text-gray-300">{rev.comment}</p>}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">No reviews yet for this course.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewCourses;
