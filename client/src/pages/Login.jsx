import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, LogIn, Building2 } from "lucide-react";
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
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const tenantName = tenant?.name || "Skillio Academy";
  const tenantLogo = tenant?.logo || "/skillio.png";

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
      toast.success(`Welcome back, ${data.user.name}!`);

      // Resolve user's institution
      const userRole = data.user.role;
      const tenantSlug =
        data.user.tenant?.slug ||
        (typeof data.user.tenantId === "object" ? data.user.tenantId?.slug : null);

      if (tenantSlug) {
        localStorage.setItem("skillio_active_tenant", tenantSlug);
      }

      // Route educators directly to their institution management workspace
      if (
        userRole === "educator" ||
        userRole === "tenant_admin" ||
        userRole === "platform_admin"
      ) {
        navigate("/dashboard");
      } else {
        // Direct students to their institution learning experience
        if (tenantSlug && tenantSlug !== "default") {
          navigate(`/institution/${tenantSlug}`);
        } else {
          navigate("/mycourses");
        }
      }
    } catch (error) {
      console.error("[Login Error]", error);
      const message =
        error?.response?.data?.message || error?.message || "Invalid credentials";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col justify-center items-center px-4 py-8 sm:px-6 font-sans">
      <div className="w-full max-w-md sm:max-w-lg bg-white border border-[#e8e5dc] rounded-2xl shadow-sm p-6 sm:p-10 space-y-6">
        {/* Back Link & Brand Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]">
            <Building2 size={12} />
            <span className="truncate max-w-[140px]">{tenantName}</span>
          </div>
        </div>

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
            Sign In to {tenantName}
          </h1>
          <p className="text-xs sm:text-sm text-[#78716c]">
            Enter your credentials to access your courses, lectures, and study resources
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs sm:text-sm font-semibold text-[#44403c]">
                Password
              </label>
              <Link
                to="/forget"
                className="text-xs text-[#1e3a8a] hover:text-[#172554] hover:underline transition font-medium"
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

          {/* Role Selection */}
          <div className="pt-1">
            <span className="block text-xs font-semibold text-[#44403c] mb-2">
              Sign In As:
            </span>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition select-none min-h-[44px] ${
                  role === "student"
                    ? "bg-[#eff6ff] border-[#1e3a8a] text-[#1e3a8a] shadow-xs"
                    : "bg-[#fcfbf9] border-[#e8e5dc] text-[#78716c] hover:bg-[#f1ede4]"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === "student"}
                  onChange={() => setRole("student")}
                  className="sr-only"
                />
                Student
              </label>

              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition select-none min-h-[44px] ${
                  role === "educator"
                    ? "bg-[#eff6ff] border-[#1e3a8a] text-[#1e3a8a] shadow-xs"
                    : "bg-[#fcfbf9] border-[#e8e5dc] text-[#78716c] hover:bg-[#f1ede4]"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="educator"
                  checked={role === "educator"}
                  onChange={() => setRole("educator")}
                  className="sr-only"
                />
                Educator / Instructor
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-medium py-3 rounded-xl transition shadow-xs min-h-[46px]"
            >
              Sign In
            </Button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-[#e8e5dc] text-xs sm:text-sm text-[#78716c]">
          Don't have an account yet?{" "}
          <Link
            to="/signup"
            className="text-[#1e3a8a] hover:text-[#172554] font-semibold hover:underline"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
