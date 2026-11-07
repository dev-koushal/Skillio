import React, { useState } from "react";
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
  PlusCircle,
  BookOpen,
} from "lucide-react";
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

  const tenantName = tenant?.name || "Skillio Academy";
  const tenantLogo = tenant?.logo || "/skillio.png";

  const isEducator =
    userData?.role === "educator" ||
    userData?.role === "tenant_admin" ||
    userData?.role === "platform_admin";

  return (
    <header className="bg-white/95 text-[#1c1917] w-full sticky top-0 z-40 border-b border-[#e8e5dc] backdrop-blur-md transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex justify-between items-center gap-4">
        {/* Brand / Logo + Institution Switcher Link */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] rounded-lg p-1"
          >
            <img
              src={tenantLogo}
              alt={tenantName}
              className="h-8 sm:h-10 w-auto max-w-[130px] sm:max-w-[160px] object-contain transition-transform group-hover:scale-102"
              onError={(e) => {
                e.target.src = "/skillio.png";
              }}
            />
            <div className="hidden min-[480px]:flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#1c1917] truncate max-w-[150px] sm:max-w-[200px] leading-tight">
                {tenantName}
              </span>
              <span className="text-[10px] text-[#78716c] font-medium tracking-wide uppercase">
                {tenant?.institutionType || "Academy"}
              </span>
            </div>
          </Link>

          {/* Current Institution Badge / Selector */}
          <Link
            to="/institutions"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f8f7f4] hover:bg-[#f2efe9] border border-[#e8e5dc] text-xs font-semibold text-[#44403c] transition cursor-pointer"
            title="Browse or switch institution"
          >
            <Building2 size={13} className="text-[#1e3a8a]" />
            <span className="truncate max-w-[120px]">{tenantName}</span>
            <span className="text-[10px] font-mono text-[#78716c] bg-white px-1.5 py-0.5 rounded border border-[#e8e5dc]">
              Change
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4">
          <Link
            to="/allcourses"
            className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-lg hover:bg-[#f8f7f4] transition"
          >
            Courses
          </Link>

          <Link
            to="/institutions"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-lg hover:bg-[#f8f7f4] transition"
          >
            <Building2 size={15} className="text-[#78716c]" />
            <span>Find Institution</span>
          </Link>

          {userData && (
            <Link
              to="/mycourses"
              className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3 py-2 rounded-lg hover:bg-[#f8f7f4] transition"
            >
              My Learning
            </Link>
          )}

          {isEducator && (
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-1.5 bg-[#f2efe9] text-[#1e3a8a] hover:bg-[#ebe7df] border border-[#d6d3c9] text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl cursor-pointer transition"
            >
              <LayoutDashboard size={15} />
              Educator Hub
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
                className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl cursor-pointer transition shadow-xs"
              >
                Get Started
              </button>
            </div>
          ) : (
            <div className="relative pl-2">
              {/* User Avatar Button */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full border border-[#d6d3c9] hover:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] cursor-pointer transition"
                aria-label="User menu"
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
                <ChevronDown size={14} className="text-[#78716c] mr-1 hidden sm:block" />
              </button>

              {/* Profile Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-[#e8e5dc] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-[#f2efe9]">
                    <p className="text-sm font-bold text-[#1c1917] truncate">{userData.name}</p>
                    <p className="text-xs text-[#78716c] truncate">{userData.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#f2efe9] text-[#451a03] font-semibold border border-[#e8e5dc]">
                      {userData.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                    >
                      <User2Icon size={15} className="text-[#78716c]" />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        navigate("/mycourses");
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                    >
                      <BookCheck size={15} className="text-[#78716c]" />
                      Enrolled Courses
                    </button>
                    {isEducator && (
                      <button
                        onClick={() => {
                          navigate("/dashboard");
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer text-left font-medium"
                      >
                        <LayoutDashboard size={15} className="text-[#78716c]" />
                        Educator Dashboard
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigate("/create-institution");
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm text-[#1e3a8a] hover:bg-blue-50/60 transition cursor-pointer text-left font-semibold"
                    >
                      <PlusCircle size={15} />
                      Create New Academy
                    </button>
                  </div>

                  <div className="border-t border-[#f2efe9] pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition cursor-pointer text-left font-medium"
                    >
                      <LogOut size={15} />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Navigation Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            to="/institutions"
            className="p-1.5 rounded-lg text-[#57534e] hover:bg-[#f2efe9] border border-[#e8e5dc] flex items-center gap-1 text-[11px] font-semibold"
          >
            <Building2 size={15} className="text-[#1e3a8a]" />
            <span className="truncate max-w-[90px]">{tenantName}</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl text-[#1c1917] hover:bg-[#f2efe9] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] cursor-pointer"
            aria-label="Open mobile menu"
          >
            <MenuIcon size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-4/5 max-w-sm bg-white border-l border-[#e8e5dc] h-full p-6 flex flex-col justify-between overflow-y-auto z-10 shadow-2xl">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#f2efe9]">
                <div className="flex items-center gap-2.5">
                  <img src={tenantLogo} alt={tenantName} className="h-8 w-auto object-contain" />
                  <span className="font-bold text-sm text-[#1c1917] truncate max-w-[160px]">
                    {tenantName}
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#78716c] hover:bg-[#f2efe9] cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* User summary if logged in */}
              {userData ? (
                <div className="p-3.5 rounded-xl bg-[#f8f7f4] border border-[#e8e5dc] space-y-1">
                  <p className="text-sm font-bold text-[#1c1917]">{userData.name}</p>
                  <p className="text-xs text-[#78716c] truncate">{userData.email}</p>
                  <span className="inline-block mt-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white text-[#451a03] font-bold border border-[#e8e5dc]">
                    {userData.role}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      navigate("/login");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl border border-[#d6d3c9] text-xs font-bold text-[#1c1917] hover:bg-[#f8f7f4] text-center"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      navigate("/signup");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#172554] text-center"
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {/* Navigation Links */}
              <div className="space-y-1 pt-1">
                <button
                  onClick={() => {
                    navigate("/");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4]"
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    navigate("/allcourses");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4]"
                >
                  Browse Courses
                </button>
                <button
                  onClick={() => {
                    navigate("/institutions");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-[#1e3a8a] bg-blue-50/50 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Building2 size={16} />
                    Find Institution
                  </span>
                  <span className="text-[10px] font-mono text-[#78716c]">Directory</span>
                </button>

                {userData && (
                  <>
                    <button
                      onClick={() => {
                        navigate("/mycourses");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4]"
                    >
                      My Enrolled Courses
                    </button>
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-[#44403c] hover:bg-[#f8f7f4]"
                    >
                      Profile Settings
                    </button>
                  </>
                )}

                {isEducator && (
                  <button
                    onClick={() => {
                      navigate("/dashboard");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold text-[#1e3a8a] bg-[#f2efe9]"
                  >
                    Educator Dashboard
                  </button>
                )}

                <button
                  onClick={() => {
                    navigate("/create-institution");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold text-[#451a03] bg-amber-50/70 border border-amber-200/60 flex items-center gap-2"
                >
                  <PlusCircle size={15} className="text-[#b45309]" />
                  <span>Launch New Academy</span>
                </button>
              </div>
            </div>

            {/* Logout button in drawer */}
            {userData && (
              <div className="pt-4 border-t border-[#f2efe9]">
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                >
                  <LogOut size={15} />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
