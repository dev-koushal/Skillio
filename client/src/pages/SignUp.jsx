import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Building2,
  Search,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  School,
  ArrowRight,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import Button from "../components/common/Button";
import { setAuthSession } from "../services/authStorage";
import { clearStoredTenantSlug, setStoredTenantSlug } from "../services/tenantStorage";
import { getSafeInternalReturnUrl } from "../services/safeReturnUrl";
import "./AuthPages.css";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student"); // 'student' | 'educator'
  const [loading, setLoading] = useState(false);

  // Step state: 1 = Credentials, 2 = Institution Selection (Student only)
  const [step, setStep] = useState(1);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutionLoadError, setInstitutionLoadError] = useState("");
  const [directoryReloadKey, setDirectoryReloadKey] = useState(0);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenant } = useTenant();
  const returnUrl = getSafeInternalReturnUrl(
    searchParams.get("returnUrl"),
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  const invitationTenantSlug = searchParams.get("tenant") || searchParams.get("institutionSlug");

  const isDirectInstitution = Boolean(
    tenant && !tenant.isPlatform && tenant.slug !== "platform" && tenant.slug !== "default"
  );
  const tenantName = tenant?.name || "Skillio Platform";
  const tenantLogo = tenant?.logo || "/skillio.png";

  // Pre-select direct institution if user arrived via institution route
  useEffect(() => {
    if (isDirectInstitution && tenant) {
      setSelectedInstitution(tenant);
    }
  }, [isDirectInstitution, tenant]);

  // Load institutions list for student step 2
  useEffect(() => {
    if (step !== 2) return undefined;

    let mounted = true;
    setLoadingInstitutions(true);
    setInstitutionLoadError("");
    api
      .get("/api/tenant/directory")
      .then(({ data }) => {
        if (!data?.success || !Array.isArray(data.institutions)) {
          throw new Error("The institution list could not be loaded.");
        }
        if (mounted) setInstitutions(data.institutions);
      })
      .catch((error) => {
        if (mounted) {
          setInstitutions([]);
          setInstitutionLoadError(error.response?.data?.message || "We couldn't load institutions. Check your connection and try again.");
        }
      })
      .finally(() => {
        if (mounted) setLoadingInstitutions(false);
      });

    return () => { mounted = false; };
  }, [step, directoryReloadKey]);

  // Google Sign-up handler
  const handleGoogleSignup = () => {
    toast.info("Google authentication is connecting. Please use your email and password in the meantime.");
  };

  // Step 1: Validate email credentials and determine whether to proceed to Step 2
  const handleProceedFromStep1Email = (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please fill in all required fields!");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long!");
      return;
    }

    // If educator, directly register without institution step
    if (role === "educator") {
      executeEmailSignup({ chosenSlug: null });
      return;
    }

    // If student is already visiting a direct institution, register directly under it
    if (isDirectInstitution && tenant?.slug) {
      executeEmailSignup({ chosenSlug: tenant.slug });
      return;
    }

    // Invitation links select their institution without exposing unrelated catalog options.
    if (invitationTenantSlug) {
      executeEmailSignup({ chosenSlug: invitationTenantSlug });
      return;
    }

    // Otherwise, transition student to Step 2 for institution choice
    setStep(2);
  };

  // Perform actual email signup submission
  const executeEmailSignup = async ({ chosenSlug }) => {
    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      };

      if (chosenSlug && chosenSlug !== "platform" && chosenSlug !== "default") {
        payload.institutionSlug = chosenSlug;
      }

      const { data } = await api.post("/api/auth/signup", payload);

      setAuthSession(data.token, data.user);
      dispatch(setUserData(data.user));
      toast.success("Account created successfully!");

      if (role === "student" && returnUrl) {
        if (chosenSlug && chosenSlug !== "platform" && chosenSlug !== "default") setStoredTenantSlug(chosenSlug);
        navigate(returnUrl);
        return;
      }

      if (role === "educator") {
        navigate("/educator/home");
      } else if (chosenSlug && chosenSlug !== "platform" && chosenSlug !== "default") {
        setStoredTenantSlug(chosenSlug);
        navigate(`/institution/${chosenSlug}`);
      } else {
        clearStoredTenantSlug();
        navigate("/allcourses");
      }
    } catch (error) {
      console.error("[SignUp Error]", error);
      const message =
        error?.response?.data?.message || error?.message || "Registration failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Student selects an academy at Step 2
  const handleConfirmAcademyChoice = (chosenSlug) => {
    executeEmailSignup({ chosenSlug });
  };

  // Filter institutions based on search query
  const filteredInstitutions = institutions.filter((inst) => {
    if (!institutionSearch.trim()) return true;
    const q = institutionSearch.toLowerCase();
    return (
      inst.name?.toLowerCase().includes(q) ||
      inst.institutionType?.toLowerCase().includes(q) ||
      inst.title?.toLowerCase().includes(q) ||
      inst.slug?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="auth-page bg-[#f8f7f4] text-[#1c1917] font-sans">
      <div className="auth-card auth-card-signup bg-white border border-[#e8e5dc]">
        {/* Navigation & Header */}
        <div className="auth-topbar flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 2) {
                setStep(1);
              } else {
                navigate("/");
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer font-medium"
          >
            <ArrowLeft size={14} />
            {step === 2 ? "Back to Account Details" : "Back to Home"}
          </button>

          {isDirectInstitution ? (
            <div className="auth-tenant-pill flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-[#f1edff] text-[#5b3cc4] border border-[#d8cdf7]">
              <Building2 size={12} />
              <span className="truncate max-w-[130px]">{tenantName}</span>
            </div>
          ) : (
            <span className="text-[11px] font-mono text-[#78716c] uppercase tracking-wider">
              Step {step} of {role === "student" && !isDirectInstitution ? "2" : "1"}
            </span>
          )}
        </div>

        {/* ================= STEP 1: CREDENTIALS & ROLE ================= */}
        {step === 1 && (
          <>
        <div className="auth-heading text-center">
              <img
                src={tenantLogo}
                alt={tenantName}
                className="auth-brand-logo w-auto mx-auto object-contain"
                onError={(e) => {
                  e.target.src = "/skillio.png";
                }}
              />
              <h1 className="auth-title font-extrabold tracking-tight text-[#1c1917]">
                {isDirectInstitution ? `Join ${tenantName}` : "Create Your Account"}
              </h1>
              <p className="auth-subtitle text-[#78716c]">
                {isDirectInstitution
                  ? `Sign up to enroll in ${tenantName} courses and curriculum`
                  : "Create an account to learn or manage your academy"}
              </p>
            </div>

            <div className="auth-role-row">
              <div className="auth-toggle-group auth-role-switcher grid grid-cols-2 gap-1 bg-[#f8f7f4] p-1 border border-[#e8e5dc]">
                <button type="button" onClick={() => setRole("student")} className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${role === "student" ? "bg-white text-[#5b3cc4] shadow-xs border border-[#d6d3c9]" : "text-[#78716c] hover:text-[#1c1917]"}`}><User size={14} />Student</button>
                <button type="button" onClick={() => setRole("educator")} className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${role === "educator" ? "bg-white text-[#5b3cc4] shadow-xs border border-[#d6d3c9]" : "text-[#78716c] hover:text-[#1c1917]"}`}><School size={14} />Educator</button>
              </div>
            </div>
            {/* Email account details */}
            <form onSubmit={handleProceedFromStep1Email} className="auth-form auth-form-signup-email space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#5b3cc4] focus:ring-1 focus:ring-[#5b3cc4] transition-all min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#5b3cc4] focus:ring-1 focus:ring-[#5b3cc4] transition-all min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                    Password (min. 8 characters)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#5b3cc4] focus:ring-1 focus:ring-[#5b3cc4] transition-all min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#1c1917] cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full !bg-[#5b3cc4] hover:!bg-[#38256f] text-white font-semibold py-3 rounded-xl transition shadow-xs min-h-[46px] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {role === "educator" ? (
                      "Create Educator Account"
                    ) : isDirectInstitution ? (
                      `Complete Sign Up for ${tenantName}`
                    ) : (
                      <>
                        <span>Next: Choose Your Academy</span>
                        <ArrowRight className="inline-block ml-1" size={16} />
                      </>
                    )}
                  </Button>
                </div>
              </form>
          </>
        )}
        {/* ================= STEP 2: STUDENT INSTITUTION SELECTION ================= */}
        {step === 2 && role === "student" && (
          <div className="auth-institution-step">
            <div className="auth-institution-heading text-center">
              <div className="auth-institution-icon bg-[#f1edff] text-[#5b3cc4] border border-[#d8cdf7] flex items-center justify-center mx-auto">
                <Building2 size={24} />
              </div>
              <h2 className="auth-institution-title font-bold tracking-tight text-[#1c1917]">
                Select Your Academy
              </h2>
              <p className="auth-institution-description text-[#78716c]">
                Choose the institution connected to your studies. Your account will open directly to its courses.
              </p>
            </div>

            {/* Institution Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
              <input
                type="text"
                value={institutionSearch}
                onChange={(e) => setInstitutionSearch(e.target.value)}
                placeholder="Search academy by name or domain..."
                className="auth-search w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-9 pr-4 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#5b3cc4] focus:ring-1 focus:ring-[#5b3cc4]"
              />
            </div>

            {/* Institution Directory List */}
            <div className="auth-institution-list overflow-y-auto pr-1 divide-y divide-[#f5f2ea]">
              {loadingInstitutions ? (
                <div className="auth-list-empty py-8 text-center text-xs text-[#78716c]">
                  Loading academies...
                </div>
              ) : institutionLoadError ? (
                <div className="auth-list-empty auth-directory-error py-6 text-center text-xs text-[#78716c]" role="alert">
                  <p>{institutionLoadError}</p>
                  <button type="button" onClick={() => setDirectoryReloadKey((key) => key + 1)}>
                    Try again
                  </button>
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="auth-list-empty py-8 text-center text-xs text-[#78716c]">
                  {institutions.length
                    ? `No academies found matching "${institutionSearch}"`
                    : "No active academies are available right now."}
                </div>
              ) : (
                filteredInstitutions.map((inst) => {
                  const isSelected = selectedInstitution?.slug === inst.slug;
                  return (
                    <button
                      type="button"
                      key={inst._id || inst.slug}
                      onClick={() => setSelectedInstitution(inst)}
                      aria-pressed={isSelected}
                      className={`pt-2 first:pt-0 pb-2 px-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${isSelected
                          ? "bg-[#f1edff] border-[#5b3cc4] shadow-xs"
                          : "bg-white border-transparent hover:border-[#e8e5dc] hover:bg-[#faf8f5]"
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#f8f7f4] border border-[#e8e5dc] flex items-center justify-center shrink-0 overflow-hidden">
                          {inst.logo ? (
                            <img
                              src={inst.logo}
                              alt={inst.name}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                e.target.src = "/skillio.png";
                              }}
                            />
                          ) : (
                            <Building2 size={16} className="text-[#5b3cc4]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-[#1c1917] truncate">
                            {inst.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#78716c]">
                            <span className="truncate max-w-[140px]">
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
                        {isSelected ? (
                          <CheckCircle2 size={18} className="text-[#5b3cc4]" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#d6d3d1]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Step 2 Actions */}
            <div className="auth-institution-actions border-t border-[#e8e5dc]">
              <Button
                type="button"
                onClick={() =>
                  handleConfirmAcademyChoice(selectedInstitution?.slug || null)
                }
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!selectedInstitution}
                className="w-full !bg-[#5b3cc4] hover:!bg-[#38256f] text-white font-semibold py-3 rounded-xl transition shadow-xs min-h-[46px] disabled:opacity-50 cursor-pointer"
              >
                {selectedInstitution
                  ? `Join ${selectedInstitution.name} & Complete Sign Up`
                  : "Select an Academy"}
              </Button>

            </div>
          </div>
        )}

        {/* Footer Link */}
        <div className="auth-footer text-center border-t border-[#e8e5dc] text-[#78716c]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#5b3cc4] hover:text-[#38256f] font-semibold hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
