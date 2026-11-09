import React, { useState, useEffect, useRef } from "react";
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
  Phone,
  KeyRound,
  RotateCcw,
  Edit3,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import Button from "../components/common/Button";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student"); // 'student' | 'educator'
  const [loading, setLoading] = useState(false);

  // Authentication Method: 'email' | 'phone'
  const [authMethod, setAuthMethod] = useState("email");

  // Phone OTP Login States
  const [phoneStep, setPhoneStep] = useState("input"); // 'input' | 'otp'
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const otpInputRef = useRef(null);

  // Step 2 for students: Institution Selector
  const [step, setStep] = useState(1); // 1 = credentials, 2 = select institution (students only)
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const tenantName = tenant?.name || "Skillio Platform";
  const tenantLogo = tenant?.logo || "/skillio.png";
  const isDirectInstitution = Boolean(
    tenant && !tenant.isPlatform && tenant.slug !== "platform" && tenant.slug !== "default"
  );

  // Resend OTP cooldown timer
  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus OTP input when transitioning to OTP step
  useEffect(() => {
    if (phoneStep === "otp" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [phoneStep]);

  // Load institutions for Step 2 if student needs selection
  useEffect(() => {
    if (step === 2) {
      setLoadingInstitutions(true);
      api
        .get("/api/tenant/directory")
        .then(({ data }) => {
          if (data.success && Array.isArray(data.institutions)) {
            setInstitutions(data.institutions);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingInstitutions(false));
    }
  }, [step]);

  // Reusable Unified Authentication Success Handler
  const handleAuthSuccess = (data) => {
    dispatch(setUserData(data.user));
    setLoggedInUser(data.user);

    const userRole = data.user.role;
    const tenantSlug =
      data.user.tenant?.slug ||
      (typeof data.user.tenantId === "object" ? data.user.tenantId?.slug : null);

    if (tenantSlug) {
      localStorage.setItem("skillio_active_tenant", tenantSlug);
    }

    // 1. Educator / Teacher Flow: DIRECT to Educator Home, never show institution selector
    if (
      userRole === "educator" ||
      userRole === "tenant_admin" ||
      userRole === "platform_admin"
    ) {
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate("/educator/home");
      return;
    }

    // 2. Student Flow:
    // If student is browsing a specific institution via URL, enter directly
    if (isDirectInstitution && tenant?.slug) {
      localStorage.setItem("skillio_active_tenant", tenant.slug);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(`/institution/${tenant.slug}`);
      return;
    }

    // Check if student has an existing valid server-side institution membership or previous active tenant
    const memberships = Array.isArray(data.user.memberships) ? data.user.memberships : [];
    const primaryTenantSlug =
      data.user.tenant?.slug ||
      (typeof data.user.tenantId === "object" ? data.user.tenantId?.slug : null);

    const storedSlug = localStorage.getItem("skillio_active_tenant");
    const validStoredSlug = memberships.find((m) => m.slug === storedSlug)?.slug;

    const directSlug =
      validStoredSlug ||
      (storedSlug && !["platform", "default"].includes(storedSlug) ? storedSlug : null) ||
      (memberships.length > 0 ? memberships[0].slug : null) ||
      (primaryTenantSlug && !["platform", "default"].includes(primaryTenantSlug) ? primaryTenantSlug : null);

    // If returning student has a recognized institution, return directly without showing selector
    if (directSlug) {
      localStorage.setItem("skillio_active_tenant", directSlug);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(`/institution/${directSlug}`);
      return;
    }

    // First-time student without active institution -> show selection step
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

  // 2. Phone OTP: Step 1 - Send OTP
  const handleSendPhoneOtp = async (e) => {
    e?.preventDefault();
    const cleanDigits = phoneNumber.replace(/\D/g, "");

    if (!cleanDigits || cleanDigits.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setPhoneLoading(true);
      const { data } = await api.post("/api/auth/phone/send-otp", {
        phoneNumber: phoneNumber.trim(),
        role,
      });

      setPhoneStep("otp");
      setCooldown(data.cooldown || 45);
      toast.success(data.message || "OTP sent to your mobile number");

      if (data.devOtp) {
        console.log("[Dev Mode] Phone OTP:", data.devOtp);
      }
    } catch (error) {
      console.error("[Send Phone OTP Error]", error);
      toast.error(error?.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setPhoneLoading(false);
    }
  };

  // 2. Phone OTP: Step 2 - Verify OTP & Sign In
  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = phoneOtp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    try {
      setPhoneLoading(true);
      const { data } = await api.post("/api/auth/phone/verify-otp", {
        phoneNumber: phoneNumber.trim(),
        otp: cleanOtp,
        role,
      });

      handleAuthSuccess(data);
    } catch (error) {
      console.error("[Verify Phone OTP Error]", error);
      toast.error(error?.response?.data?.message || "Invalid or expired code");
    } finally {
      setPhoneLoading(false);
    }
  };

  // 3. Continue with Google Handler
  const handleGoogleLogin = () => {
    toast.info("Google authentication is connecting. Please use Email or Phone OTP in the meantime.");
  };

  // Student selects an institution
  const handleSelectInstitution = (selectedSlug) => {
    localStorage.setItem("skillio_active_tenant", selectedSlug);
    navigate(`/institution/${selectedSlug}`);
  };

  // Student selects "Select later" -> neutral student home without catalog
  const handleSelectLater = () => {
    localStorage.removeItem("skillio_active_tenant");
    navigate("/");
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
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col justify-center items-center px-4 py-8 sm:px-6 font-sans">
      <div className="w-full max-w-md sm:max-w-lg bg-white border border-[#e8e5dc] rounded-3xl shadow-sm p-6 sm:p-10 space-y-6">
        {/* Step 1: Credential Authentication */}
        {step === 1 ? (
          <>
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer font-medium"
              >
                <ArrowLeft size={14} /> Back to Home
              </button>

              <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]">
                <Building2 size={12} />
                <span className="truncate max-w-[140px]">{tenantName}</span>
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
              <img
                src={tenantLogo}
                alt={tenantName}
                className="h-11 sm:h-12 w-auto mx-auto object-contain"
                onError={(e) => {
                  e.target.src = "/skillio.png";
                }}
              />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1c1917]">
                Welcome back
              </h1>
              <p className="text-xs sm:text-sm text-[#78716c]">
                Choose your preferred sign-in method to access your courses
              </p>
            </div>

            {/* Role Switcher Tabs (Student vs Educator) */}
            <div className="grid grid-cols-2 p-1 bg-[#f8f7f4] border border-[#e8e5dc] rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
                  role === "student"
                    ? "bg-white text-[#1e3a8a] shadow-xs border border-[#d6d3c9]"
                    : "text-[#78716c] hover:text-[#1c1917]"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole("educator")}
                className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
                  role === "educator"
                    ? "bg-white text-[#1e3a8a] shadow-xs border border-[#d6d3c9]"
                    : "text-[#78716c] hover:text-[#1c1917]"
                }`}
              >
                Educator / Studio
              </button>
            </div>

            {/* 1. Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-[#d6d3c9] bg-white hover:bg-[#fcfbf9] text-xs sm:text-sm font-bold text-[#1c1917] transition shadow-2xs min-h-[44px] cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Separator */}
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-[#e8e5dc] w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-[#a8a29e] uppercase tracking-wider absolute">
                or
              </span>
            </div>

            {/* Segmented Auth Method Selector: [ Email ] [ Phone ] */}
            <div className="grid grid-cols-2 p-1 bg-[#f8f7f4] border border-[#e8e5dc] rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setAuthMethod("email")}
                className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMethod === "email"
                    ? "bg-white text-[#1e3a8a] shadow-xs border border-[#d6d3c9]"
                    : "text-[#78716c] hover:text-[#1c1917]"
                }`}
              >
                <Mail size={15} />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod("phone")}
                className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMethod === "phone"
                    ? "bg-white text-[#1e3a8a] shadow-xs border border-[#d6d3c9]"
                    : "text-[#78716c] hover:text-[#1c1917]"
                }`}
              >
                <Phone size={15} />
                <span>Phone</span>
              </button>
            </div>

            {/* ============================================================== */}
            {/* METHOD A: EMAIL + PASSWORD LOGIN                               */}
            {/* ============================================================== */}
            {authMethod === "email" && (
              <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-150">
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
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all min-h-[44px]"
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
                      className="text-xs text-[#1e3a8a] hover:text-[#172554] hover:underline transition font-semibold"
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
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all min-h-[44px]"
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
                    {role === "educator" ? "Sign In to Studio" : "Login"}
                  </Button>
                </div>
              </form>
            )}

            {/* ============================================================== */}
            {/* METHOD B: PHONE OTP LOGIN                                      */}
            {/* ============================================================== */}
            {authMethod === "phone" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {phoneStep === "input" ? (
                  <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                        Phone Number
                      </label>
                      <div className="relative flex rounded-xl border border-[#d6d3d1] bg-[#fcfbf9] overflow-hidden focus-within:border-[#1e3a8a] focus-within:ring-1 focus-within:ring-[#1e3a8a] transition-all min-h-[44px]">
                        <div className="px-3 py-2.5 sm:py-3 bg-[#f2efe9] text-xs sm:text-sm font-bold text-[#44403c] border-r border-[#d6d3d1] flex items-center justify-center select-none">
                          +91
                        </div>
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="98765 43210"
                          className="flex-1 bg-transparent px-3.5 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-[#78716c] mt-1.5">
                        We will send a 6-digit verification code via SMS.
                      </p>
                    </div>

                    <div className="pt-1">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={phoneLoading}
                        className="w-full font-bold shadow-xs pressable min-h-[46px]"
                      >
                        Send OTP
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs sm:text-sm font-semibold text-[#44403c]">
                          Enter 6-Digit OTP
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneStep("input");
                            setPhoneOtp("");
                          }}
                          className="text-xs text-[#1e3a8a] hover:underline inline-flex items-center gap-1 cursor-pointer font-semibold"
                        >
                          <Edit3 size={12} />
                          <span>Change Number</span>
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          ref={otpInputRef}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          required
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
                          placeholder="••••••"
                          className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl py-3 text-center text-lg sm:text-xl font-mono font-bold tracking-[0.4em] text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[48px]"
                        />
                      </div>

                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-[#78716c]">Sent to {phoneNumber}</span>
                        {cooldown > 0 ? (
                          <span className="text-[#a8a29e] font-medium font-mono">
                            Resend in {cooldown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendPhoneOtp}
                            disabled={phoneLoading}
                            className="text-[#1e3a8a] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw size={12} />
                            <span>Resend OTP</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={phoneLoading}
                        disabled={phoneOtp.length !== 6}
                        className="w-full font-bold shadow-xs pressable min-h-[46px]"
                      >
                        Verify & Login
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div className="text-center pt-2 border-t border-[#e8e5dc] text-xs sm:text-sm text-[#78716c]">
              Don't have an account yet?{" "}
              <Link
                to="/signup"
                className="text-[#1e3a8a] hover:text-[#172554] font-bold hover:underline"
              >
                Sign up
              </Link>
            </div>
          </>
        ) : (
          /* Step 2: Student Institution Selector */
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center mx-auto">
                <Building2 size={24} />
              </div>
              <h2 className="text-2xl font-black text-[#1c1917] tracking-tight">
                Which institution are you learning with?
              </h2>
              <p className="text-xs sm:text-sm text-[#78716c]">
                Select an academy to enter its custom courses and study portal.
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
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[42px]"
                autoFocus
              />
            </div>

            {/* Institution Cards List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {loadingInstitutions ? (
                <div className="py-8 text-center text-xs text-[#78716c]">
                  Loading institutions...
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#78716c]">
                  No institutions found.
                </div>
              ) : (
                filteredInstitutions.map((inst) => (
                  <button
                    key={inst._id || inst.slug}
                    type="button"
                    onClick={() => handleSelectInstitution(inst.slug)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#e8e5dc] hover:border-[#1e3a8a] hover:bg-[#eff6ff]/60 transition text-left cursor-pointer group"
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
                        <p className="text-sm font-bold text-[#1c1917] group-hover:text-[#1e3a8a] transition truncate">
                          {inst.name}
                        </p>
                        <p className="text-xs text-[#78716c] truncate">
                          {inst.institutionType || "Academy"} • {inst.domainTags?.slice(0, 2).join(", ") || "Curriculum"}
                        </p>
                      </div>
                    </div>

                    <ChevronRight size={18} className="text-[#a8a29e] group-hover:text-[#1e3a8a] group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                ))
              )}
            </div>

            {/* Select Later Action */}
            <div className="pt-2 border-t border-[#f2efe9] text-center">
              <button
                type="button"
                onClick={handleSelectLater}
                className="text-xs font-semibold text-[#78716c] hover:text-[#1c1917] hover:underline cursor-pointer py-1"
              >
                Select Later & Explore
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
