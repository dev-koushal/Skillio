import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Search,
  ArrowRight,
  Sparkles,
  School,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  PlayCircle,
  FileText,
  Award,
  Users,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import CourseCard from "../components/CourseCard";
import { CourseCardSkeleton } from "../components/common/Skeleton";

export default function StudentNeutralHome() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [institutions, setInstitutions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch accredited institutions directory
    const fetchInstitutions = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/tenant/directory");
        if (isMounted && data.success && Array.isArray(data.institutions)) {
          setInstitutions(data.institutions);
        }
      } catch (err) {
        console.warn("[StudentNeutralHome] Failed to load directory:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // 2. Fetch published courses for trending curriculum
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const res = await api.get("/api/course/getpublished");
        if (isMounted && Array.isArray(res.data)) {
          setCourses(res.data.slice(0, 4));
        }
      } catch (err) {
        console.warn("[StudentNeutralHome] Failed to load published courses:", err.message);
      } finally {
        if (isMounted) setLoadingCourses(false);
      }
    };

    fetchInstitutions();
    fetchCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectInstitution = (slug) => {
    if (!slug) return;
    localStorage.setItem("skillio_active_tenant", slug);
    navigate(`/institution/${slug}`);
  };

  const studentFirstName = userData?.name ? userData.name.split(" ")[0] : "Learner";

  // Time-aware greeting
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Filter institutions
  const filteredInstitutions = institutions.filter((inst) => {
    const matchesSearch =
      !searchQuery.trim() ||
      inst.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      inst.title?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      inst.description?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      inst.institutionType?.toLowerCase().includes(searchQuery.toLowerCase().trim());

    if (!matchesSearch) return false;
    if (selectedFilter === "all") return true;
    return (
      inst.institutionType?.toLowerCase().includes(selectedFilter.toLowerCase()) ||
      inst.title?.toLowerCase().includes(selectedFilter.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans selection:bg-[#1e3a8a] selection:text-white pb-20 md:pb-0">
      <Navbar />

      <main className="flex-1">
        {/* =========================================================================
            SECTION 1: STUDENT LMS HERO WITH AUTHENTIC PHOTOGRAPHIC WORKSPACE
           ========================================================================= */}
        <section className="relative w-full bg-gradient-to-b from-white via-[#fcfbf9] to-[#f8f7f4] border-b border-[#e8e5dc] py-14 sm:py-20 overflow-hidden">
          {/* Subtle Ambient Grid Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.035]"
            style={{
              backgroundImage: `radial-gradient(#1e3a8a 1px, transparent 1px), radial-gradient(#1e3a8a 1px, #f8f7f4 1px)`,
              backgroundSize: "28px 28px",
              backgroundPosition: "0 0, 14px 14px",
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Greeting & Primary Learning Actions */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* Greeting Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] text-xs font-bold shadow-2xs">
                  <Sparkles size={14} className="text-[#1e3a8a]" />
                  <span>
                    {timeGreeting}, {studentFirstName} • Student Learning Studio
                  </span>
                </div>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1c1917] tracking-tight leading-[1.12]">
                  Master accredited curriculum in your dedicated academy.
                </h1>

                {/* Subtitle */}
                <p className="text-sm sm:text-base lg:text-lg text-[#57534e] max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Stream high-definition lectures with adaptive playback, download comprehensive notes and formula sheets, and learn directly from accredited educators.
                </p>

                {/* Learning Action CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <a
                    href="#academies-directory"
                    className="inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer min-h-[48px]"
                  >
                    <Building2 size={18} />
                    <span>Choose Your Academy</span>
                    <ArrowRight size={16} />
                  </a>

                  <button
                    type="button"
                    onClick={() => navigate("/allcourses")}
                    className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#f1ede4] text-[#1c1917] border border-[#d6d3d1] font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer min-h-[48px]"
                  >
                    <Compass size={18} className="text-[#1e3a8a]" />
                    <span>Browse All Courses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/mycourses")}
                    className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#f1ede4] text-[#1c1917] border border-[#d6d3d1] font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer min-h-[48px]"
                  >
                    <BookOpen size={18} className="text-[#1e3a8a]" />
                    <span>My Enrolled Courses</span>
                  </button>
                </div>

                {/* Trust Verification Strip */}
                <div className="pt-6 border-t border-[#e8e5dc] flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#78716c]">
                  <div className="flex items-center gap-1.5 font-semibold text-[#44403c]">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    <span>100% Verified Educators</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-[#44403c]">
                    <ShieldCheck size={15} className="text-[#1e3a8a] shrink-0" />
                    <span>Zero Public Leaks • Bunny CDN</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-[#44403c]">
                    <FileText size={15} className="text-amber-700 shrink-0" />
                    <span>Downloadable Study Notes</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Layered Photographic LMS Studio Card Composition */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Real Collegiate Learning Photographic Hero Visual */}
                  <div className="relative rounded-3xl overflow-hidden border border-[#e8e5dc] shadow-xl bg-white aspect-[4/3] group">
                    <img
                      src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=80"
                      alt="Student Learning Environment"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Top Floating Glass Badge */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Adaptive Bitrate Streaming Active</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[#1e3a8a] text-[10px] font-extrabold uppercase tracking-wider">
                        1080p HLS
                      </div>
                    </div>

                    {/* Bottom Floating Course Title */}
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                        Interactive Lecture Preview
                      </p>
                      <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-sm truncate">
                        Modern Curriculum & Practical Exercises
                      </h3>
                    </div>
                  </div>

                  {/* Overlapping Floating Milestone Card */}
                  <div className="absolute -bottom-6 -left-4 sm:-left-6 bg-white/95 backdrop-blur-md border border-[#e8e5dc] rounded-2xl p-4 shadow-lg max-w-[270px] hidden sm:block animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center shrink-0 border border-[#bfdbfe]">
                        <GraduationCap size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1c1917] truncate">
                          Milestone Tracking
                        </p>
                        <p className="text-[11px] text-[#78716c]">
                          78% Completed this week
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-[#f2efe9] h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-[#1e3a8a] h-full rounded-full w-[78%]" />
                    </div>
                  </div>

                  {/* Overlapping Floating Verified Academy Badge */}
                  <div className="absolute -top-4 -right-3 sm:-right-5 bg-white/95 backdrop-blur-md border border-[#e8e5dc] rounded-2xl px-3.5 py-2.5 shadow-md flex items-center gap-2 hidden sm:flex">
                    <Award size={18} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="text-[11px] font-extrabold text-[#1c1917] leading-none">
                        Accredited
                      </p>
                      <p className="text-[10px] text-[#78716c] leading-tight">
                        Verified Platform
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: LMS FEATURE PILLARS (3-COLUMN PHOTOGRAPHIC TILES)
           ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tile 1: Video Lectures */}
            <div className="bg-white rounded-3xl border border-[#e8e5dc] p-6 shadow-xs hover:border-[#1e3a8a]/40 hover:shadow-md transition-all group">
              <div className="h-44 rounded-2xl overflow-hidden mb-5 border border-[#f2efe9]">
                <img
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"
                  alt="Video Lectures"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center mb-3">
                <PlayCircle size={22} />
              </div>
              <h3 className="font-bold text-lg text-[#1c1917]">
                Adaptive Bitrate Streaming
              </h3>
              <p className="text-xs text-[#78716c] mt-2 leading-relaxed">
                Watch seamless, authenticated video lectures powered by Bunny CDN edge delivery with zero buffer pauses and automatic quality adaptation.
              </p>
            </div>

            {/* Tile 2: Notes & Study Material */}
            <div className="bg-white rounded-3xl border border-[#e8e5dc] p-6 shadow-xs hover:border-[#1e3a8a]/40 hover:shadow-md transition-all group">
              <div className="h-44 rounded-2xl overflow-hidden mb-5 border border-[#f2efe9]">
                <img
                  src="https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=600&q=80"
                  alt="Study Notes and Resources"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <FileText size={22} />
              </div>
              <h3 className="font-bold text-lg text-[#1c1917]">
                Downloadable Notes & PDFs
              </h3>
              <p className="text-xs text-[#78716c] mt-2 leading-relaxed">
                Access curated formula sheets, lecture presentation slides, and practice problem sets prepared directly by your academy educators.
              </p>
            </div>

            {/* Tile 3: Independent Academies */}
            <div className="bg-white rounded-3xl border border-[#e8e5dc] p-6 shadow-xs hover:border-[#1e3a8a]/40 hover:shadow-md transition-all group">
              <div className="h-44 rounded-2xl overflow-hidden mb-5 border border-[#f2efe9]">
                <img
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80"
                  alt="Accredited Educators"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <Award size={22} />
              </div>
              <h3 className="font-bold text-lg text-[#1c1917]">
                Accredited Dedicated Academies
              </h3>
              <p className="text-xs text-[#78716c] mt-2 leading-relaxed">
                Each academy operates as an independent white-labeled learning institution with dedicated courses, invitation links, and personalized student tracking.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: ACCREDITED INSTITUTIONS DIRECTORY (INTERACTIVE DISCOVERY)
           ========================================================================= */}
        <section id="academies-directory" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[#e8e5dc]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f2efe9] text-[#1c1917] text-xs font-bold mb-2">
                <School size={14} className="text-[#1e3a8a]" />
                <span>Partner Academies</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
                Select an Academy to Enter
              </h2>
              <p className="text-xs sm:text-sm text-[#78716c] mt-1.5 max-w-lg">
                Choose an institution to unlock its complete course catalog, study materials, and direct video lectures.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search academy or subject..."
                className="w-full bg-white border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition shadow-2xs"
              />
            </div>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
            {[
              { label: "All Academies", value: "all" },
              { label: "Technology & Code", value: "coding" },
              { label: "Science & Physics", value: "physics" },
              { label: "Languages & Fluency", value: "english" },
              { label: "College & Higher Ed", value: "college" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setSelectedFilter(f.value)}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition shrink-0 cursor-pointer ${
                  selectedFilter === f.value
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-white text-[#57534e] border border-[#e8e5dc] hover:bg-[#f2efe9]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Institution Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-3xl border border-[#e8e5dc] p-6 h-56 animate-pulse" />
              ))}
            </div>
          ) : filteredInstitutions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#e8e5dc] max-w-lg mx-auto p-8 shadow-xs">
              <School size={40} className="mx-auto text-[#a8a29e] mb-3" />
              <h3 className="font-bold text-base text-[#1c1917]">No Academies Found</h3>
              <p className="text-xs text-[#78716c] mt-1.5 mb-4">
                We couldn't find an academy matching "{searchQuery}". Try a different keyword or reset filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFilter("all");
                }}
                className="text-xs font-bold text-[#1e3a8a] underline cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInstitutions.map((inst) => (
                <div
                  key={inst._id || inst.slug}
                  onClick={() => handleSelectInstitution(inst.slug)}
                  className="bg-white rounded-3xl border border-[#e8e5dc] hover:border-[#1e3a8a] hover:shadow-lg transition-all p-6 flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Header: Logo & Type Badge */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#f8f7f4] border border-[#e8e5dc] p-2 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        <img
                          src={inst.logo || "/skillio.png"}
                          alt={inst.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.src = "/skillio.png";
                          }}
                        />
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]">
                        {inst.institutionType || "Academy"}
                      </span>
                    </div>

                    {/* Academy Name & Description */}
                    <h3 className="font-extrabold text-lg text-[#1c1917] group-hover:text-[#1e3a8a] transition truncate">
                      {inst.name}
                    </h3>
                    <p className="text-xs text-[#78716c] mt-1.5 line-clamp-2 leading-relaxed">
                      {inst.description || inst.title || "Accredited curriculum with verified lectures and study materials."}
                    </p>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-5 mt-5 border-t border-[#f2efe9] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#a8a29e]">
                      Dedicated Student Space
                    </span>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] group-hover:translate-x-1 transition-transform">
                      <span>Enter Academy</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =========================================================================
            SECTION 4: FEATURED COURSES CATALOG PREVIEW
           ========================================================================= */}
        {courses.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#e8e5dc]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff6ff] text-[#1e3a8a] text-xs font-bold mb-2">
                  <Compass size={14} className="text-[#1e3a8a]" />
                  <span>Curriculum Highlights</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                  Featured Live Courses
                </h2>
              </div>

              <button
                type="button"
                onClick={() => navigate("/allcourses")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] hover:text-[#172554] transition cursor-pointer"
              >
                <span>View All Courses</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {loadingCourses
                ? [1, 2, 3, 4].map((n) => <CourseCardSkeleton key={n} />)
                : courses.map((course) => (
                    <CourseCard key={course._id} course={course} />
                  ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
