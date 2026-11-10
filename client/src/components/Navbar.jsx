import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  BookCheck,
  MenuIcon,
  User2Icon,
  X,
  LayoutDashboard,
  LogOut,
  Building2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  BookOpen,
  Download,
  ArrowRight,
  GraduationCap,
  Users,
  Settings,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { setUserData } from "../redux/userSlice";
import { toast } from "react-toastify";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import MobileBottomNav from "./common/MobileBottomNav";
import { performLogout } from "../services/authStorage";

function Navbar({ currentInstitution = null }) {
  const { userData } = useSelector((state) => state.user);
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  // Lock body scroll when mobile overlays are open
  useEffect(() => {
    if (mobileMenuOpen || profileSheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, profileSheetOpen]);

  // PWA Install prompt listener
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
      toast.success("Skillio app installed!");
    }
    setDeferredPrompt(null);
  };

  const handleLogout = async () => {
    dispatch(setUserData(null));
    try {
      const { setCreatorCourseData } = await import("../redux/courseSlice");
      dispatch(setCreatorCourseData([]));
    } catch (e) {}
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    setProfileSheetOpen(false);
    toast.success("Logged out successfully!");
    await performLogout();
  };

  // Determine if we are rendering within an institution context or the public platform
  const activeInstitution =
    currentInstitution ||
    (tenant && !tenant.isPlatform && tenant.slug !== "platform" && tenant.slug !== "default"
      ? tenant
      : null);

  const brandName = activeInstitution ? activeInstitution.name : "Skillio";
  const brandLogo = activeInstitution ? (activeInstitution.logo || "/skillio.png") : "/skillio.png";
  const brandSubtitle = activeInstitution
    ? activeInstitution.institutionType || "Academy"
    : "SaaS Platform";

  const isEducator =
    userData?.role === "educator" ||
    userData?.role === "tenant_admin" ||
    userData?.role === "platform_admin";

  return (
    <>
      <header className="bg-white/95 text-[#1c1917] w-full sticky top-0 z-40 border-b border-[#e8e5dc] backdrop-blur-md transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex justify-between items-center gap-4">
          {/* Brand / Logo + Institution Switcher Link */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              to={isEducator ? "/educator/home" : activeInstitution ? `/institution/${activeInstitution.slug}` : "/"}
              className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] rounded-xl p-1 pressable"
            >
              <img
                src={brandLogo}
                alt={brandName}
                className="h-8 sm:h-9 w-auto max-w-[120px] sm:max-w-[160px] object-contain transition-transform group-hover:scale-102"
                onError={(e) => {
                  e.target.src = "/skillio.png";
                }}
              />
              <div className="hidden min-[480px]:flex flex-col">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#1c1917] truncate max-w-[150px] sm:max-w-[200px] leading-tight">
                  {brandName}
                </span>
                <span className="text-[10px] text-[#78716c] font-semibold tracking-wider uppercase">
                  {brandSubtitle}
                </span>
              </div>
            </Link>

            {/* Platform / Institution badges for non-students or visitors */}
            {!userData && (
              activeInstitution ? (
                <div className="hidden lg:flex items-center gap-2">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f8f7f4] hover:bg-[#f2efe9] border border-[#e8e5dc] text-xs font-semibold text-[#44403c] transition cursor-pointer pressable"
                    title="Return to Skillio Platform Homepage"
                  >
                    <span>← Platform</span>
                  </Link>
                </div>
              ) : (
                <Link
                  to="/institutions"
                  className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eff6ff] hover:bg-blue-100/70 border border-[#bfdbfe] text-xs font-bold text-[#1e3a8a] transition cursor-pointer pressable"
                >
                  <Building2 size={13} />
                  <span>Explore Institutions</span>
                </Link>
              )
            )}
          </div>

          {/* Desktop Navigation Links — Strictly Role-Aware */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            {/* 1. PUBLIC VISITOR SHELL */}
            {!userData && (
              <>
                <Link
                  to="/institutions"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
                >
                  <Building2 size={15} className="text-[#1e3a8a]" />
                  <span>Explore Institutions</span>
                </Link>
                <Link
                  to="/allcourses"
                  className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
                >
                  Courses
                </Link>
              </>
            )}

            {/* 2. STUDENT LEARNING SHELL */}
            {userData && userData.role === "student" && (
              <>
                <Link
                  to={activeInstitution ? `/institution/${activeInstitution.slug}` : "/"}
                  className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
                >
                  Home
                </Link>
                <Link
                  to={activeInstitution ? `/institution/${activeInstitution.slug}/courses` : "/courses"}
                  className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
                >
                  Courses
                </Link>
                <Link
                  to={activeInstitution ? `/institution/${activeInstitution.slug}/my-courses` : "/mycourses"}
                  className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
                >
                  My Courses
                </Link>
              </>
            )}

            {/* 3. EDUCATOR INSTITUTION MANAGEMENT SHELL */}
            {isEducator && (
              <>
                <Link
                  to="/educator/home"
                  className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
                >
                  Home
                </Link>
                <Link
                  to="/dashboard"
                  className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
                >
                  Dashboard
                </Link>
                <Link
                  to="/courses"
                  className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
                >
                  Courses
                </Link>
                <Link
                  to="/students"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
                >
                  <Users size={14} className="text-[#1e3a8a]" />
                  <span>Students</span>
                </Link>
                <Link
                  to="/create-institution"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
                >
                  <Building2 size={14} className="text-[#1e3a8a]" />
                  <span>Institution</span>
                </Link>
                <button
                  onClick={() => navigate("/builder/new")}
                  className="inline-flex items-center gap-1.5 bg-[#eff6ff] text-[#1e3a8a] hover:bg-blue-100/70 border border-[#bfdbfe] text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition pressable"
                >
                  <PlusCircle size={14} />
                  <span>New Course</span>
                </button>
              </>
            )}

            {/* Install App Button if PWA available */}
            {canInstall && (
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl cursor-pointer transition pressable"
              >
                <Download size={13} />
                <span>Install App</span>
              </button>
            )}

            {!userData ? (
              <div className="flex items-center gap-2 pl-2">
                <button
                  onClick={() => navigate("/login")}
                  className="text-xs sm:text-sm font-bold text-[#1e3a8a] hover:bg-blue-50/80 px-3.5 py-2 rounded-xl cursor-pointer transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl cursor-pointer transition shadow-xs pressable"
                >
                  Get Started
                </button>
              </div>
            ) : (
              <div className="relative pl-2">
                {/* User Avatar Button - Touch target >= 44px */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 p-1 rounded-full border border-[#d6d3c9] hover:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] cursor-pointer transition pressable min-h-[44px] min-w-[44px] justify-center"
                  aria-label="User account menu"
                  aria-expanded={dropdownOpen}
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-[#1e3a8a] flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-xs">
                    {userData?.profilePicture ? (
                      <img
                        src={userData.profilePicture}
                        alt={userData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      userData?.name?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </div>
                  <ChevronDown size={14} className="text-[#78716c] mr-0.5 hidden sm:block" />
                </button>

                {/* Profile Dropdown with Mobile Outside-Dismiss Overlay */}
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] sm:bg-transparent"
                      onClick={() => setDropdownOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-32px)] bg-white border border-[#e8e5dc] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-[#f2efe9]">
                      <p className="text-sm font-bold text-[#1c1917] truncate">{userData.name}</p>
                      <p className="text-xs text-[#78716c] truncate">{userData.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#f2efe9] text-[#451a03] font-bold border border-[#e8e5dc]">
                        {userData.role}
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate("/profile");
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                      >
                        <User2Icon size={15} className="text-[#78716c]" />
                        My Profile
                      </button>
                      {/* Student Dropdown Items */}
                      {userData?.role === "student" && (
                        <>
                          <button
                            onClick={() => {
                              navigate("/mycourses");
                              setDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                          >
                            <BookCheck size={15} className="text-[#78716c]" />
                            My Courses
                          </button>
                          <button
                            onClick={() => {
                              navigate("/profile");
                              setDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                          >
                            <Building2 size={15} className="text-[#1e3a8a]" />
                            My Academy & Settings
                          </button>
                        </>
                      )}

                      {/* Educator Dropdown Items */}
                      {isEducator && (
                        <>
                          <button
                            onClick={() => {
                              navigate("/educator/home");
                              setDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                          >
                            <Building2 size={15} className="text-[#1e3a8a]" />
                            Educator Home
                          </button>
                          <button
                            onClick={() => {
                              navigate("/dashboard");
                              setDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                          >
                            <LayoutDashboard size={15} className="text-[#1e3a8a]" />
                            Educator Dashboard
                          </button>
                          <button
                            onClick={() => {
                              navigate("/students");
                              setDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                          >
                            <Users size={15} className="text-[#1e3a8a]" />
                            Manage Students
                          </button>
                          <button
                            onClick={() => {
                              navigate("/courses");
                              setDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                          >
                            <BookOpen size={15} className="text-[#78716c]" />
                            Course Curriculum
                          </button>
                          <button
                            onClick={() => {
                              navigate("/create-institution");
                              setDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                          >
                            <Building2 size={15} className="text-[#1e3a8a]" />
                            Institution Settings
                          </button>
                        </>
                      )}
                      {isEducator && !userData?.tenantId && (
                        <button
                          onClick={() => {
                            navigate("/create-institution");
                            setDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-[#78716c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                        >
                          <PlusCircle size={15} />
                          Create New Academy
                        </button>
                      )}
                      {canInstall && (
                        <button
                          onClick={() => {
                            handleInstallClick();
                            setDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-emerald-700 hover:bg-emerald-50 transition cursor-pointer text-left font-semibold"
                        >
                          <Download size={15} />
                          Install Progressive App
                        </button>
                      )}
                    </div>

                    <div className="border-t border-[#f2efe9] pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition cursor-pointer text-left font-medium"
                      >
                        <LogOut size={15} />
                        Log Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          </div>

          {/* Compact Mobile Top Actions (App Style) */}
          <div className="flex items-center gap-1.5 md:hidden">
            {activeInstitution && (
              <Link
                to={userData?.role === "student" ? `/institution/${activeInstitution.slug}` : "/institutions"}
                className="px-2.5 py-1.5 rounded-xl text-[#1e3a8a] bg-[#eff6ff] hover:bg-blue-100 border border-[#bfdbfe] flex items-center gap-1.5 text-[11px] font-bold touch-target pressable"
              >
                <Building2 size={14} />
                <span className="truncate max-w-[80px]">{brandName}</span>
              </Link>
            )}

            {canInstall && (
              <button
                onClick={handleInstallClick}
                className="p-2 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 touch-target pressable"
                aria-label="Install App"
              >
                <Download size={17} />
              </button>
            )}

            {/* Mobile Navigation Toggle (Hamburger) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-[#44403c] hover:bg-[#f2efe9] touch-target pressable min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Open navigation menu"
            >
              <MenuIcon size={22} />
            </button>

            {/* Mobile User Avatar Toggle (Tapping opens Profile Menu) */}
            {userData && (
              <button
                type="button"
                onClick={() => setProfileSheetOpen(true)}
                className="p-1 rounded-full border border-[#d6d3c9] hover:border-[#1e3a8a] touch-target pressable min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Open profile menu"
                aria-expanded={profileSheetOpen}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1e3a8a] flex items-center justify-center text-xs font-bold text-white shadow-xs">
                  {userData?.profilePicture ? (
                    <img src={userData.profilePicture} alt={userData.name} className="w-full h-full object-cover" />
                  ) : (
                    userData?.name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer Menu (Mounted directly to document.body to avoid stacking context traps) */}
      {typeof document !== "undefined" &&
        mobileMenuOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999999] md:hidden" role="dialog" aria-modal="true">
            {/* Dark blur backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-out Drawer Panel */}
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-white border-l border-[#e8e5dc] p-5 flex flex-col justify-between overflow-y-auto shadow-2xl z-20">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-[#f2efe9]">
                  <div className="flex items-center gap-2">
                    <img src={brandLogo} alt={brandName} className="h-7 w-auto object-contain" />
                    <span className="font-bold text-sm text-[#1c1917] truncate max-w-[150px]">
                      {brandName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl text-[#78716c] hover:bg-[#f2efe9] touch-target pressable cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X size={19} />
                  </button>
                </div>

                {/* Clickable Profile Card in Drawer */}
                {userData ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/profile");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left p-3.5 rounded-2xl bg-[#eff6ff] hover:bg-blue-100/70 border border-[#bfdbfe] transition cursor-pointer touch-target pressable flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        {userData?.profilePicture ? (
                          <img src={userData.profilePicture} alt={userData.name} className="w-full h-full object-cover" />
                        ) : (
                          userData?.name?.charAt(0)?.toUpperCase() || "U"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1c1917] truncate">{userData.name}</p>
                        <p className="text-xs text-[#78716c] truncate">{userData.email}</p>
                        <span className="inline-block mt-0.5 text-[10px] uppercase font-mono font-bold text-[#1e3a8a]">
                          {userData.role} • View Profile
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={17} className="text-[#1e3a8a] shrink-0 ml-2" />
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        navigate("/login");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl border border-[#d6d3c9] text-xs font-bold text-[#1c1917] hover:bg-[#f8f7f4] text-center touch-target pressable cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        navigate("/signup");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#172554] text-center touch-target shadow-xs pressable cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </div>
                )}

                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-bold text-[#78716c] uppercase tracking-wider px-3 pb-1">
                    Navigation
                  </p>

                  {/* Profile Link for logged in user */}
                  {userData && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/profile");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target text-left cursor-pointer pressable"
                    >
                      <User2Icon size={16} className="text-[#1e3a8a]" />
                      <span>My Profile</span>
                    </button>
                  )}

                  {/* Visitor Nav */}
                  {!userData && (
                    <>
                      <Link
                        to="/institutions"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target"
                      >
                        <Building2 size={16} className="text-[#1e3a8a]" />
                        Explore Institutions
                      </Link>
                      <Link
                        to="/courses"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target"
                      >
                        <BookOpen size={16} className="text-[#78716c]" />
                        Courses
                      </Link>
                    </>
                  )}

                  {/* Student Nav */}
                  {userData?.role === "student" && (
                    <>
                      <Link
                        to={activeInstitution ? `/institution/${activeInstitution.slug}` : "/"}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#1e3a8a] hover:bg-blue-50/60 touch-target"
                      >
                        <Building2 size={16} />
                        Home
                      </Link>
                      <Link
                        to={activeInstitution ? `/institution/${activeInstitution.slug}/courses` : "/courses"}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target"
                      >
                        <BookOpen size={16} className="text-[#78716c]" />
                        Courses
                      </Link>
                      <Link
                        to={activeInstitution ? `/institution/${activeInstitution.slug}/my-courses` : "/mycourses"}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target"
                      >
                        <GraduationCap size={16} className="text-[#78716c]" />
                        My Courses
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          navigate(activeInstitution ? `/institution/${activeInstitution.slug}/profile` : "/profile");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target text-left cursor-pointer pressable"
                      >
                        <User2Icon size={16} className="text-[#78716c]" />
                        <span>Profile & Settings</span>
                      </button>
                    </>
                  )}

                  {isEducator && (
                    <>
                      <Link
                        to="/educator/home"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#1e3a8a] hover:bg-blue-50/60 touch-target"
                      >
                        <Building2 size={16} />
                        Educator Home
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target"
                      >
                        <LayoutDashboard size={16} className="text-[#1e3a8a]" />
                        Dashboard
                      </Link>
                      <Link
                        to="/courses"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target"
                      >
                        <BookOpen size={16} className="text-[#78716c]" />
                        Courses
                      </Link>
                      <Link
                        to="/students"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target"
                      >
                        <Users size={16} className="text-[#1e3a8a]" />
                        Manage Students
                      </Link>
                      <Link
                        to="/create-institution"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target"
                      >
                        <Building2 size={16} className="text-[#1e3a8a]" />
                        Institution
                      </Link>
                    </>
                  )}

                  {userData && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/editprofile");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] touch-target text-left cursor-pointer pressable"
                    >
                      <Settings size={16} className="text-[#78716c]" />
                      <span>Account Settings</span>
                    </button>
                  )}

                  {canInstall && (
                    <button
                      onClick={() => {
                        handleInstallClick();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 touch-target text-left cursor-pointer pressable"
                    >
                      <Download size={16} />
                      Install Skillio App
                    </button>
                  )}
                </div>
              </div>

              {userData && (
                <div className="pt-4 border-t border-[#f2efe9]">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 transition touch-target text-left cursor-pointer pressable"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Dedicated Mobile Profile Bottom Sheet (Mounted directly to document.body via createPortal) */}
      {typeof document !== "undefined" &&
        profileSheetOpen &&
        userData &&
        createPortal(
          <div className="fixed inset-0 z-[999999] md:hidden flex flex-col justify-end" role="dialog" aria-modal="true">
            {/* Dark Backdrop with Click to Dismiss */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setProfileSheetOpen(false)}
              aria-hidden="true"
            />

            {/* Bottom Sheet Card */}
            <div className="relative z-20 w-full max-w-lg mx-auto bg-white rounded-t-3xl border-t border-[#e8e5dc] shadow-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto space-y-4">
              {/* Drag Indicator Handle */}
              <div className="w-10 h-1.5 rounded-full bg-[#d6d3c9] mx-auto mb-1" />

              {/* User Identity Header Card */}
              <button
                type="button"
                onClick={() => {
                  navigate("/profile");
                  setProfileSheetOpen(false);
                }}
                className="w-full text-left flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] cursor-pointer pressable transition"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  {userData?.profilePicture ? (
                    <img src={userData.profilePicture} alt={userData.name} className="w-full h-full object-cover" />
                  ) : (
                    userData?.name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1c1917] truncate">{userData.name}</p>
                  <p className="text-xs text-[#78716c] truncate">{userData.email}</p>
                  <span className="inline-block mt-0.5 text-[10px] uppercase font-mono font-bold text-[#1e3a8a]">
                    {userData.role} • View Profile →
                  </span>
                </div>
                <ChevronRight size={18} className="text-[#1e3a8a] shrink-0" />
              </button>

              {/* Direct Actions List */}
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/profile");
                    setProfileSheetOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left pressable touch-target"
                >
                  <User2Icon size={18} className="text-[#78716c]" />
                  <span>My Profile</span>
                </button>

                {userData?.role === "student" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/mycourses");
                        setProfileSheetOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left pressable touch-target"
                    >
                      <BookCheck size={18} className="text-[#78716c]" />
                      <span>My Courses</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/profile");
                        setProfileSheetOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left pressable touch-target"
                    >
                      <Building2 size={18} className="text-[#1e3a8a]" />
                      <span>Change Institution / Academy</span>
                    </button>
                  </>
                )}

                {isEducator && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/educator/home");
                        setProfileSheetOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left pressable touch-target"
                    >
                      <Building2 size={18} className="text-[#1e3a8a]" />
                      <span>Educator Home</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/dashboard");
                        setProfileSheetOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left pressable touch-target"
                    >
                      <LayoutDashboard size={18} className="text-[#1e3a8a]" />
                      <span>Detailed Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/students");
                        setProfileSheetOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left pressable touch-target"
                    >
                      <Users size={18} className="text-[#1e3a8a]" />
                      <span>Manage Students</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/courses");
                        setProfileSheetOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left pressable touch-target"
                    >
                      <BookOpen size={18} className="text-[#78716c]" />
                      <span>Course Curriculum</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/create-institution");
                        setProfileSheetOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left pressable touch-target"
                    >
                      <Building2 size={18} className="text-[#1e3a8a]" />
                      <span>Institution Settings</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigate("/editprofile");
                    setProfileSheetOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left pressable touch-target"
                >
                  <Settings size={18} className="text-[#78716c]" />
                  <span>Account Settings</span>
                </button>

                {canInstall && (
                  <button
                    type="button"
                    onClick={() => {
                      handleInstallClick();
                      setProfileSheetOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer text-left pressable touch-target"
                  >
                    <Download size={18} />
                    <span>Install Skillio App</span>
                  </button>
                )}
              </div>

              {/* Logout button */}
              <div className="pt-2 border-t border-[#f2efe9]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer touch-target pressable"
                >
                  <LogOut size={16} />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Persistent App-Like Mobile Bottom Navigation Bar */}
      <MobileBottomNav currentInstitution={activeInstitution} />
    </>
  );
}

export default Navbar;
