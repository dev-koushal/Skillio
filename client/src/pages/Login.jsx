import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, LogIn } from "lucide-react";
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

  const tenantName = tenant?.name || "Skillio";
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
      navigate("/");
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
    <div className="min-h-screen bg-black/95 text-white flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md sm:max-w-xl bg-gray-950 border border-gray-800/80 rounded-2xl shadow-2xl p-6 sm:p-10 space-y-6">
        {/* Back Link & Brand Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            {tenant?.slug || "default"}
          </span>
        </div>

        <div className="text-center space-y-2">
          <img
            src={tenantLogo}
            alt={tenantName}
            className="h-10 sm:h-12 w-auto mx-auto object-contain"
            onError={(e) => {
              e.target.src = "/skillio.png";
            }}
          />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Sign In to {tenantName}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Enter your credentials to access your courses and progress
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-gray-900 border border-gray-700/80 rounded-lg pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all min-h-[44px]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs sm:text-sm font-medium text-gray-300">
                Password
              </label>
              <Link
                to="/forget"
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-900 border border-gray-700/80 rounded-lg pl-10 pr-10 py-2.5 sm:py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role Selection */}
          <div className="pt-1">
            <span className="block text-xs font-medium text-gray-300 mb-2">
              Sign In As:
            </span>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs sm:text-sm font-medium cursor-pointer transition select-none min-h-[44px] ${
                  role === "student"
                    ? "bg-cyan-950/80 border-cyan-700 text-cyan-200"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-850"
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
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs sm:text-sm font-medium cursor-pointer transition select-none min-h-[44px] ${
                  role === "educator"
                    ? "bg-cyan-950/80 border-cyan-700 text-cyan-200"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-850"
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
              className="w-full shadow-lg min-h-[46px]"
            >
              Sign In
            </Button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-gray-800 text-xs sm:text-sm text-gray-400">
          Don't have an account yet?{" "}
          <Link
            to="/signup"
            className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
