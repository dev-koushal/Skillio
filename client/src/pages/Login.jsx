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
    } catch (error) {
      console.error("[Login Error]", error);
      const message =
        error?.response?.data?.message || error?.message || "Invalid credentials";
      toast.error(message);
    } finally {
      setLoading(false);
    }
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
                Sign In to Skillio
              </h1>
              <p className="text-xs sm:text-sm text-[#78716c]">
                Enter your credentials to access your courses and curriculum
              </p>
            </div>

            {/* Role Switcher Tabs */}
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

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
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
                  {role === "educator" ? "Sign In to Studio" : "Continue as Student"}
                </Button>
              </div>
            </form>

            <div className="text-center pt-2 border-t border-[#e8e5dc] text-xs sm:text-sm text-[#78716c]">
              Don't have an account yet?{" "}
              <Link
                to="/signup"
                className="text-[#1e3a8a] hover:text-[#172554] font-bold hover:underline"
              >
                Create an Account
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
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e]"
              />
              <input
                type="text"
                value={institutionSearch}
                onChange={(e) => setInstitutionSearch(e.target.value)}
                placeholder="Search institution by name..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
              />
            </div>

            {/* Institution List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {loadingInstitutions ? (
                <div className="py-8 text-center text-xs text-[#78716c] space-y-2">
                  <div className="w-6 h-6 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Loading academies...</p>
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#78716c] bg-[#f8f7f4] rounded-xl border border-dashed border-[#d6d3c9]">
                  No matching academies found.
                </div>
              ) : (
                filteredInstitutions.map((inst) => (
                  <button
                    key={inst.id || inst.slug}
                    onClick={() => handleSelectInstitution(inst.slug)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#e8e5dc] hover:border-[#1e3a8a] hover:bg-[#eff6ff]/40 transition text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={inst.logo || "/skillio.png"}
                        alt={inst.name}
                        className="w-9 h-9 rounded-xl object-contain bg-[#f8f7f4] border border-[#e8e5dc] p-1"
                        onError={(e) => {
                          e.target.src = "/skillio.png";
                        }}
                      />
                      <div>
                        <p className="font-bold text-sm text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors">
                          {inst.name}
                        </p>
                        <p className="text-[11px] text-[#78716c]">
                          {inst.courseCount || 0} Courses • {inst.institutionType || "Academy"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#a8a29e] group-hover:text-[#1e3a8a]" />
                  </button>
                ))
              )}
            </div>

            {/* Select Later Button (Mandatory) */}
            <div className="pt-2 border-t border-[#f2efe9] space-y-2">
              <Button
                variant="outline"
                size="md"
                onClick={handleSelectLater}
                className="w-full font-bold text-xs sm:text-sm pressable justify-center"
              >
                Select Later (Explore All)
              </Button>
              <p className="text-[11px] text-center text-[#a8a29e]">
                You can select or switch your institution anytime from the top bar.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
