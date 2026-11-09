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
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import Button from "../components/common/Button";

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

  // Step 1: Validate credentials and determine whether to proceed to Step 2
  const handleProceedFromStep1 = (e) => {
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
      executeSignup({ chosenSlug: null });
      return;
    }

    // If student is already visiting a direct institution, register directly under it
    if (isDirectInstitution && tenant?.slug) {
      executeSignup({ chosenSlug: tenant.slug });
      return;
    }

    // Otherwise, transition student to Step 2 for institution choice
    setStep(2);
  };

  // Perform actual signup submission
  const executeSignup = async ({ chosenSlug }) => {
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

  // Student selects "Select Later"
  const handleSelectLater = () => {
    executeSignup({ chosenSlug: null });
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
      <div className="w-full max-w-md sm:max-w-lg bg-white border border-[#e8e5dc] rounded-2xl shadow-sm p-6 sm:p-10 space-y-6">
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
            className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer pressable"
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1917]">
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
              <div className="grid grid-cols-2 gap-2 bg-[#f8f7f4] p-1 rounded-xl border border-[#e8e5dc]">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${role === "student"
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
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${role === "educator"
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

            {/* Form */}
            <form onSubmit={handleProceedFromStep1} className="space-y-4">
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
                  className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold py-3 rounded-xl transition shadow-xs min-h-[46px] flex items-center justify-center gap-2"
                >
                  {role === "educator" ? (
                    "Create Educator Account"
                  ) : isDirectInstitution ? (
                    `Complete Sign Up for ${tenantName}`
                  ) : (
                    <>
                      <span>Next: Choose Your Academy</span>
                      <ArrowRight className="inline-block mr-2" size={16} />
                    </>
                  )}
                </Button>
              </div>
            </form>
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
                      className={`pt-2 first:pt-0 pb-2 px-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${isSelected
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
                  executeSignup({
                    chosenSlug: selectedInstitution?.slug || null,
                  })
                }
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!selectedInstitution}
                className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold py-3 rounded-xl transition shadow-xs min-h-[46px] disabled:opacity-50"
              >
                {selectedInstitution
                  ? `Join ${selectedInstitution.name} & Sign Up`
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
