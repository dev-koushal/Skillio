import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2, Building2, Sparkles, RefreshCw } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";
import { useTenant } from "../context/TenantContext";
import Button from "../components/common/Button";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const navigate = useNavigate();
  const { tenant } = useTenant();

  const tenantName = tenant?.name || "Skillio Academy";

  // Resend cooldown timer
  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email) {
      toast.error("Please enter your registered email address");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/sendotp", { email: email.trim().toLowerCase() });
      setStep(2);
      setCooldown(60);
      toast.success(data.message || "Verification code sent to your email!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      toast.error("Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/verifyotp", {
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
      });

      if (data.resetToken) {
        setResetToken(data.resetToken);
      }

      setStep(3);
      toast.success(data.message || "Code confirmed! Please set your new password.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Invalid or expired verification code");
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
        password,
        newPassword: password,
        resetToken,
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
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col justify-center items-center px-4 py-8 sm:px-6 font-sans selection:bg-[#1e3a8a] selection:text-white">
      <div className="w-full max-w-md bg-white border border-[#e8e5dc] rounded-3xl shadow-sm p-6 sm:p-10 space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#78716c] hover:text-[#1c1917] transition cursor-pointer pressable p-1 rounded-lg"
          >
            <ArrowLeft size={15} /> Back to Sign In
          </button>
          <div className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]">
            <Building2 size={12} />
            <span className="truncate max-w-[130px]">{tenantName}</span>
          </div>
        </div>

        {/* Title & Icon */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center mx-auto shadow-2xs">
            <KeyRound size={22} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1c1917]">
            Reset Your Password
          </h1>
          <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
            {step === 1 && "Enter your email to receive a secure one-time verification code."}
            {step === 2 && `Enter the verification code sent to ${email}`}
            {step === 3 && "Create a new secure password for your account."}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
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
                  placeholder="name@example.com"
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-bold shadow-xs pressable"
            >
              Send Verification Code
            </Button>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-[#44403c]">
                  Verification Code
                </label>
                <span className="text-[11px] font-medium text-[#78716c]">
                  Expires in 10 mins
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl text-center tracking-[0.4em] sm:tracking-[0.6em] text-2xl font-mono py-3 text-[#1e3a8a] placeholder-[#d6d3c9] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[48px] font-bold"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-bold shadow-xs pressable"
            >
              Confirm Code
            </Button>

            {/* Resend and Email Change Links */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={handleSendOtp}
                className="inline-flex items-center gap-1 font-semibold text-[#1e3a8a] hover:underline disabled:text-[#a8a29e] disabled:no-underline cursor-pointer"
              >
                <RefreshCw size={12} className={cooldown > 0 ? "animate-spin" : ""} />
                <span>{cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                }}
                className="text-[#78716c] hover:text-[#1c1917] font-medium transition cursor-pointer"
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Set New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                New Password (minimum 8 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-10 py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
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

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#44403c] mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-10 py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#1c1917] cursor-pointer"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Validation checks */}
            <div className="space-y-1 text-[11px] text-[#78716c] pt-1">
              <div className={`flex items-center gap-1.5 ${password.length >= 8 ? "text-emerald-700 font-semibold" : ""}`}>
                <CheckCircle2 size={13} className={password.length >= 8 ? "text-emerald-600" : "text-[#d6d3c9]"} />
                <span>At least 8 characters long</span>
              </div>
              <div className={`flex items-center gap-1.5 ${password && password === confirmPassword ? "text-emerald-700 font-semibold" : ""}`}>
                <CheckCircle2 size={13} className={password && password === confirmPassword ? "text-emerald-600" : "text-[#d6d3c9]"} />
                <span>Passwords match</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-bold shadow-xs pressable mt-2"
            >
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
