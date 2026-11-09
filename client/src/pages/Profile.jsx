import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  BookOpen,
  Calendar,
  BadgeCheck,
  Edit,
  ArrowLeft,
  GraduationCap,
  Building2,
  CheckCircle2,
  Search,
  ArrowRightLeft,
  X,
  School,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import { useTenant } from "../context/TenantContext";
import api from "../services/api";

function Profile() {
  const { userData } = useSelector((store) => store.user);
  const navigate = useNavigate();
  const { tenant, switchTenant } = useTenant();

  // Switch Academy Modal State
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isStudent = userData?.role === "student";

  // Load institutions when modal opens
  useEffect(() => {
    if (switchModalOpen) {
      setLoadingInstitutions(true);
      api
        .get("/api/tenant/directory")
        .then(({ data }) => {
          if (data.success && Array.isArray(data.institutions)) {
            setInstitutions(data.institutions);
          }
        })
        .catch((err) => {
          console.warn("[Profile] Could not load institutions:", err.message);
        })
        .finally(() => setLoadingInstitutions(false));
    }
  }, [switchModalOpen]);

  if (!userData) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
        <Navbar />
        <div className="p-8 text-center text-[#78716c]">Loading user profile...</div>
      </div>
    );
  }

  const enrolledCount = userData.enrolledCourses?.length || 0;
  const joinedDate = userData.createdAt
    ? new Date(userData.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : "Recently";

  // Determine current active academy info
  const activeAcademyName = tenant && !tenant.isPlatform ? tenant.name : "Skillio Platform";
  const activeAcademySlug = tenant && !tenant.isPlatform ? tenant.slug : null;
  const activeAcademyLogo = tenant?.logo || "/skillio.png";
  const activeAcademyType = tenant?.institutionType || (tenant?.isPlatform ? "Platform" : "Academy");

  const handleSwitchAcademy = (targetSlug, targetName) => {
    try {
      localStorage.setItem("skillio_active_tenant", targetSlug);
      toast.success(`Switched to ${targetName}!`);
      setSwitchModalOpen(false);
      switchTenant(targetSlug);
    } catch (err) {
      console.error("[Profile Switch Academy Error]", err);
      toast.error("Failed to switch academy");
    }
  };

  const filteredInstitutions = institutions.filter((inst) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      inst.name?.toLowerCase().includes(q) ||
      inst.title?.toLowerCase().includes(q) ||
      inst.institutionType?.toLowerCase().includes(q) ||
      inst.slug?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Back Link */}
        <button
          onClick={() => {
            if (activeAcademySlug) {
              navigate(`/institution/${activeAcademySlug}`);
            } else {
              navigate("/");
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer pressable"
        >
          <ArrowLeft size={16} /> Back to Learning Space
        </button>

        {/* Profile Info Card */}
        <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Avatar and Info Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-[#e8e5dc] text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[#eff6ff] border-2 border-[#1e3a8a]/30 flex items-center justify-center text-3xl font-bold text-[#1e3a8a] shadow-xs shrink-0">
                {userData.profilePicture ? (
                  <img
                    src={userData.profilePicture}
                    alt={userData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userData.name?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1917] tracking-tight">
                  {userData.name}
                </h1>
                <p className="text-xs sm:text-sm text-[#78716c] max-w-md">
                  {userData.description || (isStudent ? "Student & Lifelong Learner" : "Educator & Instructor")}
                </p>
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]">
                    <BadgeCheck size={13} /> {userData.role}
                  </span>
                  {activeAcademySlug && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-[#faf8f5] text-[#57534e] border border-[#e8e5dc]">
                      <Building2 size={12} /> {activeAcademyName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/editprofile")}
              className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer min-h-[40px] pressable"
            >
              <Edit size={16} /> Edit Profile
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e8e5dc] flex items-center gap-3">
              <Mail className="text-[#1e3a8a] shrink-0" size={20} />
              <div className="min-w-0">
                <span className="text-[11px] text-[#78716c] uppercase font-semibold block">Email</span>
                <span className="text-sm font-medium text-[#1c1917] truncate block">
                  {userData.email}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e8e5dc] flex items-center gap-3">
              <BookOpen className="text-[#1e3a8a] shrink-0" size={20} />
              <div>
                <span className="text-[11px] text-[#78716c] uppercase font-semibold block">
                  Enrolled Courses
                </span>
                <span className="text-sm font-bold text-[#1c1917]">
                  {enrolledCount} {enrolledCount === 1 ? "Course" : "Courses"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e8e5dc] flex items-center gap-3">
              <Calendar className="text-[#1e3a8a] shrink-0" size={20} />
              <div>
                <span className="text-[11px] text-[#78716c] uppercase font-semibold block">Joined On</span>
                <span className="text-sm font-medium text-[#1c1917]">{joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/mycourses")}
              className="px-4 py-2.5 rounded-xl bg-[#faf8f5] hover:bg-[#f1ede4] border border-[#e8e5dc] text-xs font-semibold text-[#1c1917] transition cursor-pointer pressable min-h-[40px]"
            >
              View Enrolled Courses →
            </button>
            {userData.role === "educator" && (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2.5 rounded-xl bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] text-xs font-semibold text-[#1e3a8a] transition cursor-pointer pressable min-h-[40px]"
              >
                Educator Dashboard →
              </button>
            )}
          </div>
        </div>

        {/* ================= STUDENT ACADEMY & INSTITUTIONS SECTION ================= */}
        {isStudent && (
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e8e5dc]">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-[#1e3a8a]" />
                  <h2 className="text-lg sm:text-xl font-bold text-[#1c1917] tracking-tight">
                    My Academy & Learning Space
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
                  Your active academy environment. You can switch to another institution anytime.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSwitchModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d6d3c9] hover:border-[#1e3a8a] bg-[#faf8f5] hover:bg-[#eff6ff] text-xs sm:text-sm font-semibold text-[#1e3a8a] transition cursor-pointer pressable min-h-[42px] self-start sm:self-auto"
              >
                <ArrowRightLeft size={15} />
                Switch Academy
              </button>
            </div>

            {/* Current Active Academy Card */}
            <div className="overflow-auto p-4 sm:p-5 rounded-2xl bg-[#faf8f5] border border-[#e8e5dc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white border border-[#e8e5dc] flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                  <img
                    src={activeAcademyLogo}
                    alt={activeAcademyName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.src = "/skillio.png";
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-[#1c1917] truncate">
                      {activeAcademyName}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Active Academy
                    </span>
                  </div>
                  <p className="text-xs text-[#78716c] truncate mt-0.5">
                    {activeAcademyType} • {tenant?.title || "Curriculum & courses scoped to this institution"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {activeAcademySlug ? (
                  <button
                    onClick={() => navigate(`/institution/${activeAcademySlug}`)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold transition cursor-pointer pressable min-h-[40px] shadow-xs"
                  >
                    <span>Enter Academy</span>
                    <ExternalLink size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => setSwitchModalOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold transition cursor-pointer pressable min-h-[40px]"
                  >
                    Select an Academy
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= SWITCH ACADEMY MODAL / BOTTOM SHEET ================= */}
      {switchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSwitchModalOpen(false)}
          />

          {/* Sheet / Dialog Surface */}
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-[#e8e5dc] shadow-2xl p-6 sm:p-7 space-y-4 max-h-[85vh] flex flex-col z-10 animate-in slide-in-from-bottom-4 duration-200">
            {/* Sheet Handle for Mobile */}
            <div className="w-12 h-1.5 bg-[#d6d3d1] rounded-full mx-auto sm:hidden mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e8e5dc]">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#1c1917] tracking-tight">
                  Switch Academy
                </h3>
                <p className="text-xs text-[#78716c]">
                  Select an institution to switch your active courses and learning space
                </p>
              </div>
              <button
                onClick={() => setSwitchModalOpen(false)}
                className="p-2 rounded-xl text-[#78716c] hover:bg-[#f2efe9] hover:text-[#1c1917] transition cursor-pointer touch-target pressable"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search academy by name, subject..."
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all min-h-[42px]"
              />
            </div>

            {/* Institution List */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-[220px]">
              {loadingInstitutions ? (
                <div className="py-12 text-center text-xs text-[#78716c]">
                  Loading academies...
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#78716c]">
                  No academies found matching "{searchQuery}"
                </div>
              ) : (
                filteredInstitutions.map((inst) => {
                  const isActive = activeAcademySlug === inst.slug;
                  return (
                    <div
                      key={inst._id || inst.slug}
                      className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${isActive
                        ? "bg-[#eff6ff] border-[#1e3a8a]"
                        : "bg-white border-[#e8e5dc] hover:border-[#bfdbfe] hover:bg-[#faf8f5]"
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#f8f7f4] border border-[#e8e5dc] flex items-center justify-center shrink-0 overflow-hidden p-1">
                          {inst.logo ? (
                            <img
                              src={inst.logo}
                              alt={inst.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.src = "/skillio.png";
                              }}
                            />
                          ) : (
                            <Building2 size={18} className="text-[#1e3a8a]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-[#1c1917] truncate">
                            {inst.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#78716c]">
                            <span className="truncate max-w-[130px]">
                              {inst.institutionType || "Academy"}
                            </span>
                            {inst.courseCount !== undefined && (
                              <>
                                <span>•</span>
                                <span>{inst.courseCount} Courses</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1e3a8a] bg-blue-100/60 border border-[#bfdbfe] px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={12} />
                            Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSwitchAcademy(inst.slug, inst.name)}
                            className="px-3 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-semibold transition cursor-pointer pressable min-h-[38px] shadow-xs"
                          >
                            Switch
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-[#e8e5dc] flex items-center justify-between">
              <span className="text-[11px] text-[#78716c]">
                Enrolled progress stays saved
              </span>
              <button
                type="button"
                onClick={() => setSwitchModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#57534e] hover:bg-[#f2efe9] cursor-pointer min-h-[36px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
