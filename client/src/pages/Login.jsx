import React, { useState, useEffect } from "react";
import {
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
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import Button from "../components/common/Button";
import { setAuthSession } from "../services/authStorage";
import { canUseEducatorWorkspace } from "../auth/permissions";
import { setStoredTenantSlug } from "../services/tenantStorage";
import { getSafeInternalReturnUrl } from "../services/safeReturnUrl";
import "./AuthPages.css";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student"); // 'student' | 'educator'
  const [loading, setLoading] = useState(false);

  // Step 2 for students: Institution Selector
  const [step, setStep] = useState(1); // 1 = credentials, 2 = select institution (students only)
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutionLoadError, setInstitutionLoadError] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRevoked = searchParams.get("revoked") === "true";
  const returnUrl = getSafeInternalReturnUrl(
    searchParams.get("returnUrl"),
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  const { tenant } = useTenant();

  const tenantName = tenant?.name || "Skillio Platform";
  const tenantLogo = tenant?.logo || "/skillio.png";
  const isDirectInstitution = Boolean(
    tenant && !tenant.isPlatform && tenant.slug !== "platform" && tenant.slug !== "default"
  );

  // Logged-in students choose only from institutions already attached to their account.
  useEffect(() => {
    if (step !== 2) return undefined;

    let mounted = true;
    const existingMemberships = Array.isArray(loggedInUser?.memberships) ? loggedInUser.memberships : [];
    const selectedMembership = isDirectInstitution && tenant?.slug
      ? existingMemberships.some((membership) => membership.slug === tenant.slug)
      : true;
    setInstitutions(existingMemberships);
    setLoadingInstitutions(false);
    setInstitutionLoadError(
      !selectedMembership && existingMemberships.length === 0
        ? "This student account has no active institution. Sign up through an institution or ask an educator for an invitation."
        : ""
    );
    return () => { mounted = false; };
  }, [step, loggedInUser, isDirectInstitution, tenant?.slug]);

  // Reusable Unified Authentication Success Handler
  const handleAuthSuccess = (data) => {
    // 1. Persist session token and user payload for MNC-grade session resilience
    setAuthSession(data.token, data.user);
    setLoggedInUser(data.user);

    // 1. Educator / Teacher Flow: DIRECT to Educator Home, never show institution selector
    if (canUseEducatorWorkspace(data.user)) {
      dispatch(setUserData(data.user));
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate("/educator/home");
      return;
    }

    if (returnUrl) {
      dispatch(setUserData(data.user));
      toast.success(`Signed in as ${data.user.name}`);
      navigate(returnUrl);
      return;
    }

    const memberships = Array.isArray(data.user.memberships) ? data.user.memberships : [];
    const selected = isDirectInstitution
      ? memberships.find((membership) => membership.slug === tenant?.slug)
      : memberships.length === 1 ? memberships[0] : null;
    if (selected?.slug && (!isDirectInstitution || selected.slug === tenant?.slug)) {
      handleSelectInstitution(selected.slug);
      return;
    }

    if (isDirectInstitution && tenant?.slug && !memberships.some((membership) => membership.slug === tenant.slug)) {
      toast.info(`This account is not connected to ${tenantName}. Choose an institution already linked to your account.`);
      setStep(2);
      setInstitutionLoadError(`Your account is not connected to ${tenantName}. Choose one of your institutions below or ask an educator for an invitation.`);
      return;
    }

    // Institution choice is part of the signed-in flow, never a public course directory.
    setStep(2);
    toast.success(`Signed in as ${data.user.name}`);
  };

  // 1. Email + Password Submit
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.post("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      handleAuthSuccess(data);
    } catch (error) {
      console.error("[Login Error]", error);
      const message =
        error?.response?.data?.message || error?.message || "Invalid credentials";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Continue with Google Handler
  const handleGoogleLogin = () => {
    toast.info("Google authentication is connecting. Please use your email and password in the meantime.");
  };

  // Student selects an institution
  const handleSelectInstitution = async (selectedSlug) => {
    try {
      setLoadingInstitutions(true);
      const { data } = await api.post("/api/auth/select-institution", { institutionSlug: selectedSlug });
      const membershipIsActive = Array.isArray(data?.user?.memberships)
        && data.user.memberships.some((membership) => membership.slug === selectedSlug);
      if (!data?.success || !data.token || !data.user || !membershipIsActive) {
        throw new Error(data?.message || "We couldn't confirm your institution access. Please try again.");
      }
      setAuthSession(data.token, data.user);
      dispatch(setUserData(data.user));
      setStoredTenantSlug(selectedSlug);
      toast.success("Institution selected.");
      navigate(returnUrl || `/institution/${selectedSlug}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save your institution selection.");
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const filteredInstitutions = institutions.filter((inst) => {
    if (!institutionSearch.trim()) return true;
    const q = institutionSearch.toLowerCase();
    return (
      inst.name?.toLowerCase().includes(q) ||
      inst.description?.toLowerCase().includes(q) ||
      inst.institutionType?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="auth-page bg-[#f8f7f4] text-[#1c1917] font-sans">
      <div className="auth-card auth-card-login bg-white border border-[#e8e5dc]">
        {/* Step 1: Credential Authentication */}
        {step === 1 ? (
          <>
            {/* Top Bar */}
            <div className="auth-topbar flex items-center justify-between">
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer font-medium"
              >
                <ArrowLeft size={14} /> Back to Home
              </button>

              <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f1edff] text-[#5b3cc4] border border-[#d8cdf7]">
                <Building2 size={12} />
                <span className="truncate max-w-[140px]">{tenantName}</span>
              </div>
            </div>

            {/* Header */}
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
                Welcome back
              </h1>
              <p className="auth-subtitle text-[#78716c]">
                Sign in with your email and password to continue
              </p>
            </div>

            {/* Session Revoked Notice */}
            {isRevoked && (
              <div className="auth-alert p-3 bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <span className="text-sm shrink-0">⚠️</span>
                <div>
                  <p className="font-bold">Signed out from another device</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Your account reached the maximum active devices and was signed in elsewhere. Please log in again to continue on this device.
                  </p>
                </div>
              </div>
            )}

            <div className="auth-role-row">
              <div className="auth-toggle-group auth-role-switcher grid grid-cols-2 p-1 bg-[#f8f7f4] border border-[#e8e5dc] gap-1">
                <button type="button" onClick={() => setRole("student")} className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${role === "student" ? "bg-white text-[#5b3cc4] shadow-xs border border-[#d6d3c9]" : "text-[#78716c] hover:text-[#1c1917]"}`}>Student</button>
                <button type="button" onClick={() => setRole("educator")} className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${role === "educator" ? "bg-white text-[#5b3cc4] shadow-xs border border-[#d6d3c9]" : "text-[#78716c] hover:text-[#1c1917]"}`}>Educator</button>
              </div>
            </div>
            {/* Email and password sign in */}
            <form onSubmit={handleLogin} className="auth-form space-y-4 animate-in fade-in duration-150">
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

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-[#44403c]">
                      Password
                    </label>
                    <Link
                      to="/forget"
                      className="text-xs text-[#5b3cc4] hover:text-[#38256f] hover:underline transition font-semibold"
                    >
                      Forgot password?
                    </Link>
                  </div>
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

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full font-bold shadow-xs pressable min-h-[46px]"
                  >
                    {role === "educator" ? "Sign in to studio" : "Sign in"}
                  </Button>
                </div>
              </form>

            <div className="auth-footer text-center border-t border-[#e8e5dc] text-[#78716c]">
              Don't have an account yet?{" "}
              <Link
                to="/signup"
                className="text-[#5b3cc4] hover:text-[#38256f] font-bold hover:underline"
              >
                Sign up
              </Link>
            </div>
          </>
        ) : (
          /* Step 2: Student Institution Selector */
          <div className="auth-institution-step animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <div className="auth-institution-icon bg-[#f1edff] text-[#5b3cc4] flex items-center justify-center mx-auto">
                <Building2 size={24} />
              </div>
              <h2 className="auth-institution-title font-black text-[#1c1917] tracking-tight">
                Which institution are you learning with?
              </h2>
              <p className="auth-institution-description text-[#78716c]">
                Choose an institution already connected to your account. To join a new institution, create an account from its signup page.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
              <input
                type="text"
                value={institutionSearch}
                onChange={(e) => setInstitutionSearch(e.target.value)}
                placeholder="Search academy by name or subject..."
                className="auth-search w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#5b3cc4] focus:ring-1 focus:ring-[#5b3cc4]"
                autoFocus
              />
            </div>

            {/* Institution Cards List */}
            <div className="auth-institution-list overflow-y-auto pr-1">
              {loadingInstitutions ? (
                <div className="auth-list-empty py-8 text-center text-xs text-[#78716c]">
                  Loading institutions...
                </div>
            ) : institutionLoadError ? (
                <div className="auth-list-empty auth-directory-error py-6 text-center text-xs text-[#78716c]" role="alert">
                  <p>{institutionLoadError}</p>
                  {!Array.isArray(loggedInUser?.memberships) && (
                    <button type="button" onClick={() => setStep(1)}>Back to sign in</button>
                  )}
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="auth-list-empty py-8 text-center text-xs text-[#78716c]">
                  {institutions.length ? "No institutions match that search." : "No active institutions are available right now."}
                </div>
              ) : (
                filteredInstitutions.map((inst) => (
                  <button
                    key={inst._id || inst.slug}
                    type="button"
                    onClick={() => handleSelectInstitution(inst.slug)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#e8e5dc] hover:border-[#5b3cc4] hover:bg-[#f1edff]/60 transition text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#e8e5dc] flex items-center justify-center p-1.5 shrink-0 shadow-2xs">
                        <img
                          src={inst.logo || "/skillio.png"}
                          alt={inst.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.src = "/skillio.png";
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1c1917] group-hover:text-[#5b3cc4] transition truncate">
                          {inst.name}
                        </p>
                        <p className="text-xs text-[#78716c] truncate">
                          {inst.institutionType || "Academy"} • {inst.domainTags?.slice(0, 2).join(", ") || "Curriculum"}
                        </p>
                      </div>
                    </div>

                    <ChevronRight size={18} className="text-[#a8a29e] group-hover:text-[#5b3cc4] group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                ))
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
