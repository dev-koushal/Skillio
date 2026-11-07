import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2, Building2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";
import { useTenant } from "../context/TenantContext";
import Button from "../components/common/Button";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { tenant } = useTenant();

  const tenantName = tenant?.name || "Skillio Academy";

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email) {
      toast.error("Please enter your registered email");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/sendotp", { email: email.trim().toLowerCase() });
      setStep(2);
      toast.success(data.message || "OTP sent to your email!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otp) {
      toast.error("Please enter the 4-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/verifyotp", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      setStep(3);
      toast.success(data.message || "OTP verified!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long!");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/resetpassword", {
        email: email.trim().toLowerCase(),
        newPassword: password,
      });
      toast.success(data.message || "Password updated successfully!");
      navigate("/login");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col justify-center items-center px-4 py-8 sm:px-6 font-sans">
      <div className="w-full max-w-md bg-white border border-[#e8e5dc] rounded-2xl shadow-sm p-6 sm:p-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </button>
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]">
            <Building2 size={12} />
            <span className="truncate max-w-[140px]">{tenantName}</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center mx-auto">
            <KeyRound size={22} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1c1917]">
            Reset Your Password
          </h1>
          <p className="text-xs sm:text-sm text-[#78716c]">
            {step === 1 && "Enter your email to receive a 4-digit verification code"}
            {step === 2 && `Enter the 4-digit code sent to ${email}`}
            {step === 3 && "Enter and confirm your new secure password"}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step
                  ? "w-8 bg-[#1e3a8a]"
                  : s < step
                  ? "w-4 bg-emerald-600"
                  : "w-4 bg-[#e8e5dc]"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Send OTP */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-medium py-3 rounded-xl transition shadow-xs min-h-[46px]"
            >
              Send Reset Code
            </Button>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                4-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="1234"
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl text-center tracking-[0.5em] text-2xl font-mono py-3 text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-medium py-3 rounded-xl transition shadow-xs min-h-[46px]"
            >
              Verify Code
            </Button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer"
            >
              Change Email
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                New Password (min. 8 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#1c1917] cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-medium py-3 rounded-xl transition shadow-xs min-h-[46px]"
            >
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
