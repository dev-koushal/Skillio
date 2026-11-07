import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Sparkles,
  ArrowRight,
  BookOpen,
  FileText,
  Users,
  CheckCircle2,
  Shield,
  Zap,
  Mic,
  GraduationCap,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  LogOut,
  Laptop,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import api from "../services/api";
import { setUserData } from "../redux/userSlice";
import { setCreatorCourseData } from "../redux/courseSlice";
import { toast } from "react-toastify";
import { optimizeImage } from "../utils/imageOptimizer";

export default function PlatformHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isEducator =
    userData?.role === "educator" ||
    userData?.role === "tenant_admin" ||
    userData?.role === "platform_admin";

  // Logout handler that clears all auth state and always redirects to "/"
  const handleLogout = async () => {
    try {
      await api.get("/api/auth/logout");
    } catch (e) {
      // Proceed even if network drop occurs
    }
    dispatch(setUserData(null));
    dispatch(setCreatorCourseData([]));
    localStorage.removeItem("skillio_active_tenant");
    sessionStorage.clear();
    toast.success("Logged out successfully");
    window.location.replace("/");
  };

  // Asynchronously load institution directory preview (does not block initial page render)
  useEffect(() => {
    let isMounted = true;
    const fetchDirectory = async () => {
      try {
        setLoadingInstitutions(true);
        const res = await api.get("/api/tenant/directory");
        if (isMounted && res.data?.success) {
          setInstitutions(res.data.institutions || []);
        }
      } catch (err) {
        console.warn("[PlatformHome] Could not load institutions preview:", err.message);
      } finally {
        if (isMounted) setLoadingInstitutions(false);
      }
    };
    fetchDirectory();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter institutions for quick on-page discovery
  const filteredInstitutions = institutions.filter((inst) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      inst.name?.toLowerCase().includes(q) ||
      inst.slug?.toLowerCase().includes(q) ||
      inst.description?.toLowerCase().includes(q) ||
      inst.institutionType?.toLowerCase().includes(q) ||
      inst.domainTags?.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans selection:bg-[#1e3a8a] selection:text-white">
      {/* ============================================================== */}
      {/* 1. PLATFORM NAVBAR                                             */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e8e5dc] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Platform Identity */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <img
              src="/skillio.png"
              alt="Skillio Platform"
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-102"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#1c1917] leading-none">
                Skillio
              </span>
              <span className="text-[10px] text-[#78716c] font-medium tracking-wide uppercase mt-0.5">
                SaaS Learning Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to="/institutions"
              className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3.5 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
            >
              Explore Institutions
            </Link>
            <a
              href="#educators"
              className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3.5 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
            >
              For Educators
            </a>
            <a
              href="#how-it-works"
              className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3.5 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1e3a8a] px-3.5 py-2 rounded-xl hover:bg-[#f8f7f4] transition"
            >
              Features
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {userData ? (
              <div className="flex items-center gap-3">
                {isEducator ? (
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Manage Institution
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/mycourses")}
                    className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
                  >
                    My Learning
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 text-[#78716c] hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-[#e8e5dc] transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-semibold text-[#44403c] hover:text-[#1c1917] px-4 py-2.5 rounded-xl hover:bg-[#f1ede4] transition cursor-pointer"
                >
                  Sign In
                </Link>
                <Link
                  to="/create-institution"
                  className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  Start Teaching
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              to="/institutions"
              className="text-xs font-bold text-[#1e3a8a] px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200"
            >
              Academies
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#44403c] hover:bg-[#f1ede4] rounded-xl border border-[#e8e5dc]"
              aria-label="Toggle Menu"
            >
              <Building2 size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden px-4 pt-2 pb-4 space-y-2 bg-white border-t border-[#e8e5dc]">
            <Link
              to="/institutions"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#44403c] py-2 px-3 rounded-lg hover:bg-[#f8f7f4]"
            >
              Find Your Institution
            </Link>
            <a
              href="#educators"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#44403c] py-2 px-3 rounded-lg hover:bg-[#f8f7f4]"
            >
              For Educators
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#44403c] py-2 px-3 rounded-lg hover:bg-[#f8f7f4]"
            >
              How It Works
            </a>
            {userData ? (
              <div className="pt-2 border-t border-[#e8e5dc] flex items-center justify-between">
                <span className="text-xs text-[#78716c] font-medium truncate">
                  Logged in as {userData.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 py-1 px-2"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#e8e5dc] flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-semibold rounded-xl border border-[#d6d3d1]"
                >
                  Sign In
                </Link>
                <Link
                  to="/create-institution"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-bold bg-[#1e3a8a] text-white rounded-xl"
                >
                  Start Teaching
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ============================================================== */}
      {/* 2. HERO SECTION                                                */}
      {/* ============================================================== */}
      <section className="relative w-full bg-gradient-to-b from-white via-[#fcfbf9] to-[#f8f7f4] border-b border-[#e8e5dc] py-16 sm:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] text-xs font-semibold shadow-2xs">
            <Sparkles size={14} className="text-[#1e3a8a]" />
            <span>Learning infrastructure for modern educators & academies</span>
          </div>

          {/* Headline */}
          <div className="max-w-4xl mx-auto space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1c1917] leading-[1.12]">
              Build Your Own Online Learning Platform
            </h1>
            <p className="text-base sm:text-xl text-[#57534e] max-w-2xl mx-auto leading-relaxed font-normal">
              Skillio empowers teachers, tutors, and coaching institutes to launch their own branded academy with structured video courses, downloadable study notes, and an AI teaching assistant.
            </p>
          </div>

          {/* Main Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3.5 justify-center items-center">
            <button
              onClick={() => navigate("/institutions")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold text-sm sm:text-base px-8 py-4 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer min-h-[48px]"
            >
              <span>Explore Institutions</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => navigate(userData ? (isEducator ? "/dashboard" : "/create-institution") : "/create-institution")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-[#f1ede4] border border-[#d6d3d1] text-[#1c1917] font-bold text-sm sm:text-base px-7 py-4 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer min-h-[48px]"
            >
              <Building2 size={18} className="text-[#1e3a8a]" />
              <span>For Educators • Launch Academy</span>
            </button>
          </div>

          {/* Platform Trust Highlights */}
          <div className="pt-10 max-w-4xl mx-auto border-t border-[#e8e5dc] grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-left">
            <div className="p-3 bg-white/70 rounded-xl border border-[#e8e5dc]/80">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1e3a8a]">
                <Shield size={14} className="shrink-0 text-emerald-600" />
                <span>Isolated Academies</span>
              </div>
              <p className="text-[11px] text-[#78716c] mt-1">
                Zero cross-tenant data leakage or student interference.
              </p>
            </div>

            <div className="p-3 bg-white/70 rounded-xl border border-[#e8e5dc]/80">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1e3a8a]">
                <Mic size={14} className="shrink-0 text-purple-600" />
                <span>AI Assistant</span>
              </div>
              <p className="text-[11px] text-[#78716c] mt-1">
                Build courses with voice or text in Hindi, English, or Hinglish.
              </p>
            </div>

            <div className="p-3 bg-white/70 rounded-xl border border-[#e8e5dc]/80">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1e3a8a]">
                <FileText size={14} className="shrink-0 text-amber-600" />
                <span>Lecture Notes</span>
              </div>
              <p className="text-[11px] text-[#78716c] mt-1">
                Attach PDFs, formula sheets, and study materials per lecture.
              </p>
            </div>

            <div className="p-3 bg-white/70 rounded-xl border border-[#e8e5dc]/80">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1e3a8a]">
                <Zap size={14} className="shrink-0 text-blue-600" />
                <span>1-Click Builder</span>
              </div>
              <p className="text-[11px] text-[#78716c] mt-1">
                Create lectures and upload content directly in one screen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. INTERACTIVE INSTITUTION DISCOVERY PREVIEW                   */}
      {/* ============================================================== */}
      <section id="institutions" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a8a] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              <Building2 size={13} />
              <span>Accredited Network</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
              Find Your Learning Institution
            </h2>
            <p className="text-sm sm:text-base text-[#57534e]">
              Search and choose your dedicated coaching center, academy, or tutor below to browse courses and start learning.
            </p>
          </div>

          {/* Quick Search Field */}
          <div className="w-full md:w-80 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search academy or subject..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#d6d3d1] rounded-xl text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Institution Cards Grid */}
        {loadingInstitutions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-[#e8e5dc] rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-10 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredInstitutions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInstitutions.slice(0, 6).map((inst) => (
              <div
                key={inst.id || inst.slug}
                onClick={() => navigate(`/institution/${inst.slug}`)}
                className="group bg-white border border-[#e8e5dc] hover:border-[#1e3a8a]/40 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <img
                      src={optimizeImage(inst.logo, 100)}
                      alt={inst.name}
                      className="w-12 h-12 rounded-xl object-contain border border-[#e8e5dc] p-1.5 bg-[#fcfbf9] shrink-0"
                      onError={(e) => {
                        e.target.src = "/skillio.png";
                      }}
                    />
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#f8f7f4] text-[#57534e] border border-[#e8e5dc]">
                      {inst.institutionType || "Academy"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors line-clamp-1">
                      {inst.name}
                    </h3>
                    <p className="text-xs text-[#78716c] line-clamp-2 mt-1 leading-relaxed">
                      {inst.description || inst.title || "Independent verified learning academy."}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#f1ede4] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#57534e] flex items-center gap-1.5">
                    <BookOpen size={13} className="text-[#1e3a8a]" />
                    {inst.courseCount || 0} {inst.courseCount === 1 ? "Course" : "Courses"}
                  </span>

                  <span className="text-xs font-bold text-[#1e3a8a] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                    Enter Academy <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white border border-[#e8e5dc] rounded-2xl space-y-3">
            <Building2 size={32} className="mx-auto text-[#a8a29e]" />
            <h4 className="font-bold text-[#1c1917] text-base">No institutions matched your search</h4>
            <p className="text-xs text-[#78716c]">Try searching for Physics, Coding, or English.</p>
          </div>
        )}

        {/* Directory Link */}
        <div className="text-center pt-2">
          <Link
            to="/institutions"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1e3a8a] hover:text-[#172554] underline-offset-4 hover:underline"
          >
            <span>View Full Directory of All Institutions & Academies</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. BUILT FOR EDUCATORS                                         */}
      {/* ============================================================== */}
      <section id="educators" className="py-16 sm:py-24 bg-white border-y border-[#e8e5dc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] bg-[#eff6ff] px-3.5 py-1 rounded-full border border-[#bfdbfe]">
              For Teachers, Tutors & Coaching Centers
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
              Everything You Need to Run an Online Academy
            </h2>
            <p className="text-sm sm:text-base text-[#57534e] leading-relaxed">
              Forget clunky legacy dashboards and complex database navigations. Skillio gives educators a single coherent workspace to create, teach, and scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-[#e8e5dc] bg-[#fcfbf9] hover:border-[#1e3a8a]/40 transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center font-bold">
                <Zap size={20} />
              </div>
              <h3 className="font-bold text-base text-[#1c1917]">1-Click Course Builder</h3>
              <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
                Add lectures, descriptions, video uploads, and notes directly on one continuous page without jumping between separate admin modules.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-[#e8e5dc] bg-[#fcfbf9] hover:border-[#1e3a8a]/40 transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Mic size={20} />
              </div>
              <h3 className="font-bold text-base text-[#1c1917]">AI Teaching Assistant</h3>
              <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
                Speak naturally in Hindi, English, or Hinglish: &quot;Ek course banao jiska naam English Full Course hai&quot;. The AI builds your draft instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-[#e8e5dc] bg-[#fcfbf9] hover:border-[#1e3a8a]/40 transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <FileText size={20} />
              </div>
              <h3 className="font-bold text-base text-[#1c1917]">Curated Study Notes & PDFs</h3>
              <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
                Attach downloadable lecture notes, formula sheets, problem sets, and practice materials with verified student access controls.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-[#e8e5dc] bg-[#fcfbf9] hover:border-[#1e3a8a]/40 transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Building2 size={20} />
              </div>
              <h3 className="font-bold text-base text-[#1c1917]">Branded Academy Experience</h3>
              <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
                Your own logo, custom colors, institutional identity, and course catalog accessible via direct URL or custom subdomain.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl border border-[#e8e5dc] bg-[#fcfbf9] hover:border-[#1e3a8a]/40 transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <Shield size={20} />
              </div>
              <h3 className="font-bold text-base text-[#1c1917]">Strict Tenant Isolation</h3>
              <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
                Your student records, course videos, analytics, and enrollments remain completely isolated from other academies on the platform.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl border border-[#e8e5dc] bg-[#fcfbf9] hover:border-[#1e3a8a]/40 transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-800 flex items-center justify-center font-bold">
                <Laptop size={20} />
              </div>
              <h3 className="font-bold text-base text-[#1c1917]">Low-Bandwidth Optimization</h3>
              <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
                CDN-optimized delivery, compressed WebP thumbnails, and lean API responses ensure your students learn seamlessly even on 3G and 4G networks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. HOW SKILLIO WORKS                                           */}
      {/* ============================================================== */}
      <section id="how-it-works" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] bg-[#eff6ff] px-3.5 py-1 rounded-full border border-[#bfdbfe]">
            The Dual-Track Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
            How Skillio Operates
          </h2>
          <p className="text-sm sm:text-base text-[#57534e]">
            Simple, structured, and transparent for both educators running institutions and students acquiring mastery.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Educator Track */}
          <div className="bg-white border border-[#e8e5dc] p-6 sm:p-8 rounded-2xl space-y-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#f1ede4]">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-bold text-base sm:text-lg text-[#1c1917]">
                For Educators & Coaching Academies
              </h3>
            </div>

            <ol className="space-y-4 text-xs sm:text-sm text-[#44403c]">
              <li className="flex items-start gap-3">
                <span className="font-bold text-[#1e3a8a] shrink-0">Step 1:</span>
                <span><strong>Launch Your Academy:</strong> Set your academy name, domain slug, logo, and brand description in 2 minutes.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold text-[#1e3a8a] shrink-0">Step 2:</span>
                <span><strong>Build Your Curriculum:</strong> Use the unified course builder or speak directly to the AI Assistant to generate chapters and video lectures.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold text-[#1e3a8a] shrink-0">Step 3:</span>
                <span><strong>Attach Study Material:</strong> Upload PDF notes, problem sheets, and practice sets per lecture.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold text-[#1e3a8a] shrink-0">Step 4:</span>
                <span><strong>Publish & Teach:</strong> Welcome students, track completion progress, and monitor institutional growth.</span>
              </li>
            </ol>
          </div>

          {/* Student Track */}
          <div className="bg-white border border-[#e8e5dc] p-6 sm:p-8 rounded-2xl space-y-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#f1ede4]">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-bold text-base sm:text-lg text-[#1c1917]">
                For Students & Learners
              </h3>
            </div>

            <ol className="space-y-4 text-xs sm:text-sm text-[#44403c]">
              <li className="flex items-start gap-3">
                <span className="font-bold text-emerald-700 shrink-0">Step 1:</span>
                <span><strong>Find Your Academy:</strong> Search by subject (Physics, Coding, English) or find your tutor&apos;s verified institution.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold text-emerald-700 shrink-0">Step 2:</span>
                <span><strong>Browse Structured Courses:</strong> Watch free video lecture previews and inspect the syllabus.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold text-emerald-700 shrink-0">Step 3:</span>
                <span><strong>Enroll & Stream:</strong> Access distraction-free video lectures on mobile or desktop without ad interruptions.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold text-emerald-700 shrink-0">Step 4:</span>
                <span><strong>Download Notes & Master:</strong> Download offline study materials and complete lectures with tracking.</span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. CALL TO ACTION                                              */}
      {/* ============================================================== */}
      <section className="bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#1e3a8a] text-white py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Build Your Online Learning Platform?
          </h2>
          <p className="text-sm sm:text-base text-white/80 max-w-xl mx-auto leading-relaxed">
            Join hundreds of educators and academies running their own independent, branded online learning home with Skillio.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3.5 justify-center items-center">
            <button
              onClick={() => navigate("/create-institution")}
              className="w-full sm:w-auto bg-white hover:bg-[#f8f7f4] text-[#1c1917] font-bold text-xs sm:text-sm px-7 py-3.5 rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
            >
              Launch Your Academy
            </button>
            <button
              onClick={() => navigate("/institutions")}
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition active:scale-95 cursor-pointer"
            >
              Explore Institutions
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. PLATFORM FOOTER                                             */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-[#e8e5dc] py-12 text-[#78716c] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src="/skillio.png" alt="Skillio" className="h-6 w-auto" />
              <span className="font-bold text-[#1c1917] text-sm">Skillio Platform</span>
              <span className="text-[10px] text-[#78716c] bg-[#f8f7f4] px-2 py-0.5 rounded-full border border-[#e8e5dc]">
                v2.0 Multi-Tenant
              </span>
            </div>

            <div className="flex items-center gap-6">
              <Link to="/institutions" className="hover:text-[#1c1917] transition">
                Institution Directory
              </Link>
              <Link to="/create-institution" className="hover:text-[#1c1917] transition">
                Create Institution
              </Link>
              <Link to="/login" className="hover:text-[#1c1917] transition">
                Sign In
              </Link>
            </div>
          </div>

          <div className="pt-6 border-t border-[#f1ede4] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
            <p>© {new Date().getFullYear()} Skillio Technologies. All rights reserved.</p>
            <p>The modern learning infrastructure for independent academies & educators.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
