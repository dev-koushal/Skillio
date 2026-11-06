import React, { useState } from "react";
import { BookCheck, MenuIcon, User2Icon, X, LayoutDashboard, LogOut, LogIn, Sparkles } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { setUserData } from "../redux/userSlice";
import { toast } from "react-toastify";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";

function Navbar() {
  const { userData } = useSelector((state) => state.user);
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.get("/api/auth/logout");
      dispatch(setUserData(null));
      setDropdownOpen(false);
      setMobileMenuOpen(false);
      navigate("/");
      toast.success("Logged out successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  };

  const tenantName = tenant?.name || "Skillio";
  const tenantLogo = tenant?.logo || "/skillio.png";

  return (
    <header className="bg-black/95 text-white w-full sticky top-0 z-40 border-b border-gray-800/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex justify-between items-center">
        {/* Brand / Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-lg p-1"
        >
          <img
            src={tenantLogo}
            alt={tenantName}
            className="h-9 sm:h-11 w-auto max-w-[130px] sm:max-w-[160px] object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              e.target.src = "/skillio.png";
            }}
          />
          <span className="font-bold text-base sm:text-lg tracking-tight text-white hidden min-[400px]:inline-block truncate max-w-[150px] sm:max-w-[220px]">
            {tenantName}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3 lg:gap-4">
          <Link
            to="/allcourses"
            className="text-sm font-medium text-gray-300 hover:text-white px-3 py-2 rounded-md hover:bg-white/5 transition"
          >
            Explore Courses
          </Link>

          {userData?.role === "educator" && (
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-1.5 border border-cyan-800/80 text-cyan-300 hover:bg-cyan-950/60 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg cursor-pointer transition"
            >
              <LayoutDashboard size={16} />
              Educator Dashboard
            </button>
          )}

          {!userData ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/login")}
                className="bg-cyan-900 hover:bg-cyan-800 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer transition shadow-sm active:scale-95"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-lg cursor-pointer transition border border-white/15"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* User Avatar Button */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full border-2 border-cyan-800/80 hover:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer transition"
                aria-label="User menu"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-cyan-950 flex items-center justify-center text-sm font-bold text-cyan-200">
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
              </button>

              {/* Profile Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-gray-800">
                    <p className="text-sm font-semibold text-white truncate">{userData.name}</p>
                    <p className="text-xs text-gray-400 truncate">{userData.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {userData.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition cursor-pointer text-left"
                    >
                      <User2Icon size={16} className="text-gray-400" />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        navigate("/mycourses");
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition cursor-pointer text-left"
                    >
                      <BookCheck size={16} className="text-gray-400" />
                      Enrolled Courses
                    </button>
                    {userData.role === "educator" && (
                      <button
                        onClick={() => {
                          navigate("/courses");
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition cursor-pointer text-left"
                      >
                        <LayoutDashboard size={16} className="text-gray-400" />
                        Course Management
                      </button>
                    )}
                  </div>

                  <div className="border-t border-gray-800 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-950/40 transition cursor-pointer text-left"
                    >
                      <LogOut size={16} />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex items-center gap-2 md:hidden">
          {userData && (
            <div
              onClick={() => navigate("/profile")}
              className="w-8 h-8 rounded-full overflow-hidden bg-cyan-950 border border-cyan-800 flex items-center justify-center text-xs font-bold text-cyan-200 cursor-pointer"
            >
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
          )}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            aria-label="Open mobile menu"
          >
            <MenuIcon size={26} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu with Backdrop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-4/5 max-w-sm bg-gray-950 border-l border-gray-800 h-full p-6 flex flex-col justify-between overflow-y-auto z-10 shadow-2xl">
            <div>
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-5 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <img src={tenantLogo} alt={tenantName} className="h-7 w-auto object-contain" />
                  <span className="font-bold text-sm text-white truncate max-w-[160px]">
                    {tenantName}
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* User summary if logged in */}
              {userData && (
                <div className="py-4 border-b border-gray-800">
                  <p className="text-sm font-semibold text-white">{userData.name}</p>
                  <p className="text-xs text-gray-400">{userData.email}</p>
                  <span className="inline-block mt-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {userData.role}
                  </span>
                </div>
              )}

              {/* Navigation Links */}
              <div className="py-4 space-y-1">
                <button
                  onClick={() => {
                    navigate("/");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-900 hover:text-white"
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    navigate("/allcourses");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-900 hover:text-white"
                >
                  Explore All Courses
                </button>

                {userData && (
                  <>
                    <button
                      onClick={() => {
                        navigate("/mycourses");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-900 hover:text-white flex items-center justify-between"
                    >
                      <span>My Enrolled Courses</span>
                      <BookCheck size={16} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-900 hover:text-white flex items-center justify-between"
                    >
                      <span>My Profile</span>
                      <User2Icon size={16} className="text-gray-400" />
                    </button>
                  </>
                )}

                {userData?.role === "educator" && (
                  <div className="pt-2 border-t border-gray-800/80">
                    <p className="px-3 py-1 text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                      Educator Tools
                    </p>
                    <button
                      onClick={() => {
                        navigate("/dashboard");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-900 hover:text-white flex items-center gap-2"
                    >
                      <LayoutDashboard size={16} className="text-cyan-400" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        navigate("/courses");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-900 hover:text-white flex items-center gap-2"
                    >
                      <BookCheck size={16} className="text-cyan-400" />
                      Manage Courses
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Auth actions at bottom */}
            <div className="pt-4 border-t border-gray-800">
              {!userData ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      navigate("/login");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-cyan-900 hover:bg-cyan-800 text-white font-medium py-2.5 rounded-lg text-center text-sm shadow-sm transition"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      navigate("/signup");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white border border-gray-700 font-medium py-2.5 rounded-lg text-center text-sm transition"
                  >
                    Create Free Account
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/60 font-medium py-2.5 rounded-lg text-center text-sm flex items-center justify-center gap-2 transition"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
