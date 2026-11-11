import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { X, Sparkles, LogIn, UserPlus } from "lucide-react";
import Button from "./Button";

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    // Only show on root path or when no user is logged in
    if (userData) return;
    if (location.pathname !== "/" && location.pathname !== "/platform") return;

    const hasSeenWelcome = sessionStorage.getItem("skillio_welcome_seen");
    if (!hasSeenWelcome) {
      // Small timeout so page loads smoothly before showing
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [userData, location.pathname]);

  const handleDismiss = () => {
    sessionStorage.setItem("skillio_welcome_seen", "true");
    setIsOpen(false);
  };

  const handleAction = (path) => {
    handleDismiss();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#e8e5dc] rounded-t-3xl sm:rounded-3xl w-full max-w-sm sm:max-w-md p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5defc]/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] rounded-xl transition cursor-pointer"
          aria-label="Close welcome prompt"
        >
          <X size={18} />
        </button>

        {/* Welcome Badge & Title */}
        <div className="space-y-2 text-center pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f1edff] text-[#5b3cc4] border border-[#d8cdf7] text-xs font-bold uppercase tracking-wider mx-auto">
            <Sparkles size={13} />
            <span>Welcome to Skillio</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#1c1917] tracking-tight">
            How would you like to start?
          </h2>

          <p className="text-xs sm:text-sm text-[#78716c] max-w-xs mx-auto leading-relaxed">
            Sign in to continue with your institution, or create an account and choose your learning space.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <Button
            variant="primary"
            size="lg"
            onClick={() => handleAction("/login")}
            className="w-full font-bold shadow-xs pressable gap-2 justify-center"
          >
            <LogIn className="inline-block mr-2" size={16} />
            <span>Sign In</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => handleAction("/signup")}
            className="w-full font-bold pressable gap-2 justify-center text-[#1c1917]"
          >
            <UserPlus className="inline-block mr-2" size={16} />
            <span>Create Free Account</span>
          </Button>

        </div>

        {/* Dismiss Notice */}
        <div className="text-center">
          <button
            onClick={handleDismiss}
            className="text-[11px] font-medium text-[#a8a29e] hover:text-[#78716c] transition cursor-pointer"
          >
            Continue as guest →
          </button>
        </div>
      </div>
    </div>
  );
}

