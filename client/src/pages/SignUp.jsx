import React, { useState, useEffect, useRef } from "react";
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
import { setAuthSession } from "../services/authStorage";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student"); // 'student' | 'educator'
  const [loading, setLoading] = useState(false);

  // Authentication Method: 'email' | 'phone'
  const [authMethod, setAuthMethod] = useState("email");

  // Phone OTP Sign-up States
  const [phoneStep, setPhoneStep] = useState("input"); // 'input' | 'otp'
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const otpInputRef = useRef(null);

  // Step state: 1 = Credentials, 2 = Institution Selection (Student only)
  const [step, setStep] = useState(1);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tenant } = useTenant();

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

  // Auto-focus OTP input when entering OTP step
  useEffect(() => {
    if (phoneStep === "otp" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [phoneStep]);

  // Load institutions list for student step 2
  useEffect(() => {
    if (step === 2) {
      setLoadingInstitutions(true);
      api
        .get("/api/tenant/directory")
        .then(({ data }) => {
          if (data.success && Array.isArray(data.institutions)) {
            setInstitutions(data.institutions);
            // Default select the first or matching tenant if not already chosen
            if (!selectedInstitution && data.institutions.length > 0) {
              if (isDirectInstitution && tenant?.slug) {
                const match = data.institutions.find((i) => i.slug === tenant.slug);
                if (match) setSelectedInstitution(match);
              }
            }
          }
        })
        .catch((err) => {
          console.warn("[SignUp] Could not load institutions directory:", err.message);
        })
        .finally(() => setLoadingInstitutions(false));
    }
  }, [step]);

  // Google Sign-up handler
  const handleGoogleSignup = () => {
    toast.info("Google authentication is connecting. Please use Email or Phone OTP in the meantime.");
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

      if (role === "educator") {
        navigate("/educator/home");
      } else if (chosenSlug && chosenSlug !== "platform" && chosenSlug !== "default") {
        localStorage.setItem("skillio_active_tenant", chosenSlug);
        navigate(`/institution/${chosenSlug}`);
      } else {
        localStorage.removeItem("skillio_active_tenant");
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

  // Phone OTP: Step 1 - Send OTP
  const handleSendPhoneOtp = async (e) => {
    e?.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your full name first");
      return;
    }

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
      console.error("[SignUp Phone OTP Error]", error);
      toast.error(error?.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Phone OTP: Step 2 - Verify OTP & Register
  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();

    const cleanOtp = phoneOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    try {
      setPhoneLoading(true);

      const payload = {
        phoneNumber: phoneNumber.trim(),
        otp: cleanOtp,
        name: name.trim(),
        role,
      };

      if (isDirectInstitution && tenant?.slug) {
        payload.institutionSlug = tenant.slug;
      }

      const { data } = await api.post("/api/auth/phone/verify-otp", payload);

      setAuthSession(data.token, data.user);
      dispatch(setUserData(data.user));

      if (role === "educator") {
        toast.success(`Welcome to Skillio, ${data.user.name}!`);
        navigate("/educator/home");
      } else if (isDirectInstitution && tenant?.slug) {
        localStorage.setItem("skillio_active_tenant", tenant.slug);
        toast.success(`Welcome to ${tenantName}, ${data.user.name}!`);
        navigate(`/institution/${tenant.slug}`);
      } else {
        toast.success("Mobile number verified successfully!");
        // Transition student to Step 2 for institution choice
        setStep(2);
      }
    } catch (error) {
      console.error("[Verify Phone OTP Error]", error);
      toast.error(error?.response?.data?.message || "Invalid or expired verification code");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Student selects an academy at Step 2
  const handleConfirmAcademyChoice = (chosenSlug) => {
    if (authMethod === "email") {
      executeEmailSignup({ chosenSlug });
    } else {
      // User is already authenticated via Phone OTP
      if (chosenSlug && chosenSlug !== "platform" && chosenSlug !== "default") {
        localStorage.setItem("skillio_active_tenant", chosenSlug);
        navigate(`/institution/${chosenSlug}`);
      } else {
        localStorage.removeItem("skillio_active_tenant");
        navigate("/allcourses");
      }
    }
  };

  // Student selects "Select Later"
  const handleSelectLater = () => {
    handleConfirmAcademyChoice(null);
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
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col justify-center items-center px-4 py-8 sm:px-6 font-sans">
      <div className="w-full max-w-md sm:max-w-lg bg-white border border-[#e8e5dc] rounded-3xl shadow-sm p-6 sm:p-10 space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]">
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
                {isDirectInstitution ? `Join ${tenantName}` : "Create Your Account"}
              </h1>
              <p className="text-xs sm:text-sm text-[#78716c]">
                {isDirectInstitution
                  ? `Sign up to enroll in ${tenantName} courses and curriculum`
                  : "Start learning from accredited institutions or manage your academy"}
              </p>
            </div>

            {/* Role Switcher */}
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-[#44403c]">
                Registering As:
              </span>
              <div className="grid grid-cols-2 gap-2 bg-[#f8f7f4] p-1 rounded-2xl border border-[#e8e5dc]">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    role === "student"
                      ? "bg-white text-[#1e3a8a] shadow-xs border border-[#d6d3c9]"
                      : "text-[#78716c] hover:text-[#1c1917]"
                  }`}
                >
                  <User size={14} />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("educator")}
                  className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    role === "educator"
                      ? "bg-white text-[#1e3a8a] shadow-xs border border-[#d6d3c9]"
                      : "text-[#78716c] hover:text-[#1c1917]"
                  }`}
                >
                  <School size={14} />
                  Educator
                </button>
              </div>
            </div>

            {/* Direct Institution Notice if visiting specific Academy */}
            {isDirectInstitution && role === "student" && (
              <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl flex items-center gap-2.5 text-xs text-[#1e3a8a]">
                <Building2 size={16} className="shrink-0 text-[#1e3a8a]" />
                <div className="min-w-0">
                  <span className="font-semibold block">Joining Academy:</span>
                  <span className="truncate block font-medium">{tenantName}</span>
                </div>
              </div>
            )}

            {/* 1. Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignup}
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
                <Mail size={14} />
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
                <Phone size={14} />
                <span>Phone</span>
              </button>
            </div>

            {/* ================= EMAIL METHOD FORM ================= */}
            {authMethod === "email" && (
              <form onSubmit={handleProceedFromStep1Email} className="space-y-4">
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
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all min-h-[44px]"
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
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all min-h-[44px]"
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

                {/* Action Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold py-3 rounded-xl transition shadow-xs min-h-[46px] flex items-center justify-center gap-2 cursor-pointer"
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
            )}

            {/* ================= PHONE OTP METHOD FORM ================= */}
            {authMethod === "phone" && (
              <div className="space-y-4">
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
                      disabled={phoneStep === "otp"}
                      className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all min-h-[44px] disabled:opacity-60"
                    />
                  </div>
                </div>

                {phoneStep === "input" ? (
                  <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                        Mobile Phone Number
                      </label>
                      <div className="flex items-center rounded-xl border border-[#d6d3d1] bg-[#fcfbf9] focus-within:border-[#1e3a8a] focus-within:ring-1 focus-within:ring-[#1e3a8a] transition overflow-hidden">
                        <span className="px-3.5 py-2.5 sm:py-3 bg-[#f5f2ea] text-xs sm:text-sm font-bold text-[#44403c] border-r border-[#d6d3d1] shrink-0 select-none">
                          🇮🇳 +91
                        </span>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="98765 43210"
                          maxLength={15}
                          className="w-full bg-transparent px-3 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none min-h-[44px]"
                        />
                      </div>
                      <p className="text-[11px] text-[#78716c] mt-1">
                        We'll send a 6-digit verification code via SMS
                      </p>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={phoneLoading}
                      className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold py-3 rounded-xl transition shadow-xs min-h-[46px] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Phone size={16} />
                      <span>Send OTP</span>
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                    {/* Number confirmation banner */}
                    <div className="flex items-center justify-between p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-xs text-[#1e3a8a]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone size={14} className="shrink-0" />
                        <span className="font-semibold truncate">
                          Code sent to: {phoneNumber.startsWith("+") ? phoneNumber : `+91 ${phoneNumber}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneStep("input");
                          setPhoneOtp("");
                        }}
                        className="inline-flex items-center gap-1 font-bold text-[#1e3a8a] hover:underline shrink-0 ml-2 cursor-pointer"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                    </div>

                    {/* OTP 6-digit input */}
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                        Enter 6-Digit OTP Code
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
                        <input
                          ref={otpInputRef}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          required
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
                          placeholder="• • • • • •"
                          className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-lg font-mono tracking-widest text-center focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all min-h-[44px]"
                        />
                      </div>
                    </div>

                    {/* Resend Cooldown Countdown */}
                    <div className="flex items-center justify-between text-xs text-[#78716c]">
                      <span>Didn't receive code?</span>
                      {cooldown > 0 ? (
                        <span className="font-semibold text-[#a8a29e]">
                          Resend in {cooldown}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={phoneLoading}
                          className="inline-flex items-center gap-1 font-bold text-[#1e3a8a] hover:underline cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw size={12} />
                          <span>Resend OTP</span>
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={phoneLoading}
                      className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold py-3 rounded-xl transition shadow-xs min-h-[46px] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {role === "educator" ? (
                        "Verify & Create Educator Account"
                      ) : isDirectInstitution ? (
                        `Verify & Join ${tenantName}`
                      ) : (
                        <>
                          <span>Verify & Continue</span>
                          <ArrowRight className="inline-block ml-1" size={16} />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </>
        )}

        {/* ================= STEP 2: STUDENT INSTITUTION SELECTION ================= */}
        {step === 2 && role === "student" && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe] flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Building2 size={24} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917]">
                Select Your Academy
              </h2>
              <p className="text-xs sm:text-sm text-[#78716c]">
                Choose the institution you are studying with to access their courses. You can also explore or switch academies later from your Profile.
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
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all min-h-[42px]"
              />
            </div>

            {/* Institution Directory List */}
            <div className="max-h-64 sm:max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-[#f5f2ea]">
              {loadingInstitutions ? (
                <div className="py-8 text-center text-xs text-[#78716c]">
                  Loading academies...
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#78716c]">
                  No academies found matching "{institutionSearch}"
                </div>
              ) : (
                filteredInstitutions.map((inst) => {
                  const isSelected = selectedInstitution?.slug === inst.slug;
                  return (
                    <div
                      key={inst._id || inst.slug}
                      onClick={() => setSelectedInstitution(inst)}
                      className={`pt-2 first:pt-0 pb-2 px-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-[#eff6ff] border-[#1e3a8a] shadow-xs"
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
                            <Building2 size={16} className="text-[#1e3a8a]" />
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
                          <CheckCircle2 size={18} className="text-[#1e3a8a]" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#d6d3d1]" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Step 2 Actions */}
            <div className="space-y-2 pt-2 border-t border-[#e8e5dc]">
              <Button
                type="button"
                onClick={() =>
                  handleConfirmAcademyChoice(selectedInstitution?.slug || null)
                }
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!selectedInstitution}
                className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold py-3 rounded-xl transition shadow-xs min-h-[46px] disabled:opacity-50 cursor-pointer"
              >
                {selectedInstitution
                  ? `Join ${selectedInstitution.name} & Complete Sign Up`
                  : "Select an Academy"}
              </Button>

              <button
                type="button"
                onClick={handleSelectLater}
                disabled={loading}
                className="w-full py-2.5 px-3 rounded-xl border border-[#d6d3c9] text-xs font-semibold text-[#57534e] hover:bg-[#faf8f5] hover:text-[#1c1917] transition text-center cursor-pointer min-h-[42px]"
              >
                Skip for now (Select later from Profile)
              </button>
            </div>
          </div>
        )}

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-[#e8e5dc] text-xs sm:text-sm text-[#78716c]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#1e3a8a] hover:text-[#172554] font-semibold hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
