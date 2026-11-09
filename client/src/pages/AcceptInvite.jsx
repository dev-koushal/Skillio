import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Building2,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  Lock,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/common/Button";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { userData } = useSelector((store) => store.user);

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token found in the link.");
      setLoading(false);
      return;
    }

    api
      .get(`/api/invitations/verify/${token}`)
      .then(({ data }) => {
        if (data.success && data.valid) {
          setInvitationData(data);
        } else {
          setError(data.message || "Invalid or expired invitation");
        }
      })
      .catch((err) => {
        console.error("[Verify Invite Error]", err);
        setError(
          err.response?.data?.message ||
            "This invitation link is invalid, expired, or has already been used."
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!userData) {
      toast.info("Please log in or create an account to activate your course access.");
      navigate(`/login?returnUrl=/accept-invite?token=${token}`);
      return;
    }

    try {
      setAccepting(true);
      const { data } = await api.post("/api/invitations/accept", { token });

      toast.success(data.message || "Course access activated!");

      if (data.institutionSlug) {
        localStorage.setItem("skillio_active_tenant", data.institutionSlug);
      }

      navigate(`/viewcourse/${data.courseId}`);
    } catch (err) {
      console.error("[Accept Invite Error]", err);
      toast.error(err.response?.data?.message || "Failed to activate course access");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-lg bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#1e3a8a] animate-spin mx-auto" />
              <p className="text-xs text-[#78716c] font-semibold uppercase tracking-wider">
                Verifying your invitation...
              </p>
            </div>
          ) : error ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#1c1917]">Invitation Unavailable</h2>
                <p className="text-xs sm:text-sm text-[#78716c] max-w-sm mx-auto">{error}</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => navigate("/allcourses")}
                  className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-xs sm:text-sm font-semibold hover:bg-[#172554] transition cursor-pointer"
                >
                  Explore Course Catalog
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Institution & Header */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] p-1.5 flex items-center justify-center mx-auto shadow-xs">
                  {invitationData?.institution?.logo ? (
                    <img
                      src={invitationData.institution.logo}
                      alt={invitationData.institution.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.src = "/skillio.png";
                      }}
                    />
                  ) : (
                    <Building2 size={24} className="text-[#1e3a8a]" />
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 size={13} />
                  <span>Official Course Invitation</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917]">
                  You're Invited by {invitationData?.institution?.name}
                </h1>
                <p className="text-xs sm:text-sm text-[#78716c]">
                  Your instructor has granted you complimentary access to the curriculum below.
                </p>
              </div>

              {/* Course Card Preview */}
              <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e8e5dc] flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-[#e8e5dc] overflow-hidden shrink-0 shadow-2xs">
                  {invitationData?.course?.thumbnail ? (
                    <img
                      src={invitationData.course.thumbnail}
                      alt={invitationData.course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-[#1e3a8a]">
                      <BookOpen size={20} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-[#1e3a8a] tracking-wider block">
                    {invitationData?.course?.category || "Curriculum"}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-[#1c1917] truncate">
                    {invitationData?.course?.title}
                  </h3>
                  <p className="text-xs text-[#78716c] truncate">
                    {invitationData?.course?.subTitle || "Full lifetime access granted"}
                  </p>
                </div>
              </div>

              {/* Accept CTA */}
              <div className="space-y-3 pt-2">
                {userData ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    loading={accepting}
                    onClick={handleAccept}
                    className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold py-3 rounded-xl transition shadow-xs min-h-[46px] flex items-center justify-center gap-2"
                  >
                    <span>Accept Invitation & Enter Course</span>
                    <ArrowRight size={16} />
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        navigate(`/login?returnUrl=${encodeURIComponent(`/accept-invite?token=${token}`)}`)
                      }
                      className="w-full py-3 px-4 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold transition cursor-pointer min-h-[44px] shadow-xs"
                    >
                      Sign In to Accept Invitation
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/signup?returnUrl=${encodeURIComponent(`/accept-invite?token=${token}`)}`)
                      }
                      className="w-full py-2.5 px-4 rounded-xl border border-[#d6d3c9] hover:bg-[#faf8f5] text-xs sm:text-sm font-semibold text-[#1c1917] transition cursor-pointer min-h-[42px]"
                    >
                      Create Account
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-center text-[#78716c]">
                  Access will be linked directly to your learner account.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

