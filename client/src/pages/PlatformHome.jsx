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
  Play,
  Award,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import api from "../services/api";
import { setUserData } from "../redux/userSlice";
import { setCreatorCourseData } from "../redux/courseSlice";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import InstitutionCard from "../components/common/InstitutionCard";
import { InstitutionCardSkeleton } from "../components/common/Skeleton";
import { HeroIllustration, ConnectorPath } from "../components/common/IllustrationBlock";

export default function PlatformHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isEducator =
    userData?.role === "educator" ||
    userData?.role === "tenant_admin" ||
    userData?.role === "platform_admin";

  // Asynchronously load institution directory preview
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

  // Filter institutions for instant on-page discovery
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
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans selection:bg-[#1e3a8a] selection:text-white pb-20 md:pb-0">
      {/* 1. Global Navigation Bar */}
      <Navbar />

      <main className="flex-1 space-y-16 sm:space-y-24">
        {/* ============================================================== */}
        {/* 2. HERO SECTION                                                */}
        {/* ============================================================== */}
        <section className="relative w-full bg-gradient-to-b from-white via-[#fcfbf9] to-[#f8f7f4] border-b border-[#e8e5dc] py-12 sm:py-20 lg:py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Column: Headlines & Actions */}
              <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
                {/* Small Eyebrow Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] text-xs font-bold shadow-2xs">
                  <Sparkles size={14} className="text-[#1e3a8a]" />
                  <span>Modern learning, built for real academies</span>
                </div>

                {/* Main Headline */}
                <div className="space-y-4">
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1c1917] leading-[1.14]">
                    Learn from the institutions you trust.
                  </h1>
                  <p className="text-base sm:text-xl text-[#57534e] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                    Discover courses, learn at your pace, and keep everything in one place. Direct video lectures, verified notes, and your personal AI study assistant.
                  </p>
                </div>

                {/* Primary & Secondary Action CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center">
                  <button
                    onClick={() => navigate("/institutions")}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer touch-target pressable"
                  >
                    <span>Find an Institution</span>
                    <ArrowRight size={18} />
                  </button>

                  <button
                    onClick={() => navigate("/allcourses")}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-[#f1ede4] border border-[#d6d3c9] text-[#1c1917] font-bold text-sm sm:text-base px-7 py-3.5 rounded-xl transition-all active:scale-98 cursor-pointer touch-target pressable shadow-2xs"
                  >
                    <BookOpen size={17} className="text-[#1e3a8a]" />
                    <span>Explore Courses</span>
                  </button>
                </div>

                {/* Trust Highlights */}
                <div className="pt-4 border-t border-[#e8e5dc] flex flex-wrap items-center justify-center lg:justify-start gap-5 sm:gap-8 text-xs text-[#78716c] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Accredited Curriculum</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Downloadable Notes & PDFs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Zero Ad Interruptions</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Custom Visual Composition (Editorial Motif) */}
              <div className="lg:col-span-5 flex justify-center">
                <HeroIllustration />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. FIND AN INSTITUTION (COMPACT DISCOVERY EXPERIENCE)           */}
        {/* ============================================================== */}
        <section id="find-institution" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">
                <Building2 size={15} />
                <span>Multi-Academy Directory</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
                Find Your Institution
              </h2>
              <p className="text-xs sm:text-sm text-[#78716c] max-w-lg">
                Enter any certified learning academy, tutor environment, or coaching center to access courses and resources.
              </p>
            </div>

            {/* Quick Filter Search Input */}
            <div className="w-full md:w-80 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search academy, teacher or subject..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d6d3c9] rounded-xl text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition shadow-2xs"
              />
            </div>
          </div>

          {/* Institution Cards Grid */}
          {loadingInstitutions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <InstitutionCardSkeleton />
              <InstitutionCardSkeleton />
              <InstitutionCardSkeleton />
            </div>
          ) : filteredInstitutions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInstitutions.slice(0, 6).map((inst) => (
                <InstitutionCard key={inst._id || inst.slug} institution={inst} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-2xl bg-white border border-[#e8e5dc] space-y-3">
              <p className="text-sm font-bold text-[#1c1917]">No academies matched &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-[#1e3a8a] font-bold hover:underline"
              >
                Clear filter to view all academies
              </button>
            </div>
          )}

          {/* View All Academies Action */}
          <div className="text-center pt-2">
            <button
              onClick={() => navigate("/institutions")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-[#d6d3c9] text-xs sm:text-sm font-bold text-[#1c1917] hover:bg-[#f2efe9] transition shadow-2xs pressable"
            >
              <span>Explore All Academies</span>
              <ArrowRight size={15} className="text-[#1e3a8a]" />
            </button>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. HOW LEARNING WORKS (WITH DOTTED CONNECTOR PATHS)             */}
        {/* ============================================================== */}
        <section className="bg-white border-y border-[#e8e5dc] py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">
                The Learning Workflow
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
                Simple, Focused Learning
              </h2>
              <p className="text-xs sm:text-sm text-[#78716c]">
                No distractions, algorithm feeds, or ad interruptions. Just the curriculum you chose and the notes to master it.
              </p>
            </div>

            {/* 3 Step Pipeline with Connector Paths */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
              {/* Step 1 */}
              <div className="md:col-span-1 p-6 rounded-2xl bg-[#f8f7f4] border border-[#e8e5dc] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center font-extrabold text-lg mx-auto shadow-2xs">
                  1
                </div>
                <h3 className="font-extrabold text-base text-[#1c1917]">Select Academy</h3>
                <p className="text-xs text-[#78716c] leading-relaxed">
                  Join the branded space of your favorite educator, coaching center, or technical tutor.
                </p>
              </div>

              {/* Connector 1 */}
              <ConnectorPath className="md:col-span-1" />

              {/* Step 2 */}
              <div className="md:col-span-1 p-6 rounded-2xl bg-[#f8f7f4] border border-[#e8e5dc] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-extrabold text-lg mx-auto shadow-2xs">
                  2
                </div>
                <h3 className="font-extrabold text-base text-[#1c1917]">Learn at Your Pace</h3>
                <p className="text-xs text-[#78716c] leading-relaxed">
                  Stream high-definition lectures, track completion, and resume seamlessly across all devices.
                </p>
              </div>

              {/* Connector 2 */}
              <ConnectorPath className="md:col-span-1" />

              {/* Step 3 */}
              <div className="md:col-span-1 p-6 rounded-2xl bg-[#f8f7f4] border border-[#e8e5dc] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-extrabold text-lg mx-auto shadow-2xs">
                  3
                </div>
                <h3 className="font-extrabold text-base text-[#1c1917]">Download & Retain</h3>
                <p className="text-xs text-[#78716c] leading-relaxed">
                  Save lecture cheat sheets, formula PDFs, and practice tests directly to your study folders.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 5. WHY INSTITUTIONS USE SKILLIO (VALUE PROPOSITION PILLARS)     */}
        {/* ============================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">
              Platform Architecture
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
              Why Top Academies Choose Skillio
            </h2>
            <p className="text-xs sm:text-sm text-[#78716c]">
              Built ground-up with strict tenant isolation, multi-subdomain support, and production-grade educator tooling.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-[#e8e5dc] shadow-xs space-y-3 card-lift">
              <div className="w-11 h-11 rounded-xl bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center shadow-2xs">
                <Building2 size={22} />
              </div>
              <h3 className="font-extrabold text-base text-[#1c1917]">Isolated Academy Spaces</h3>
              <p className="text-xs text-[#78716c] leading-relaxed">
                Each institution runs its own domain, branding, catalog, and student enrollments without cross-tenant leakage.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#e8e5dc] shadow-xs space-y-3 card-lift">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-2xs">
                <Play size={22} />
              </div>
              <h3 className="font-extrabold text-base text-[#1c1917]">High-Performance Video</h3>
              <p className="text-xs text-[#78716c] leading-relaxed">
                Adaptive video streaming optimized for mobile and low-bandwidth networks with instant resume playback.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#e8e5dc] shadow-xs space-y-3 card-lift">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-2xs">
                <FileText size={22} />
              </div>
              <h3 className="font-extrabold text-base text-[#1c1917]">Structured Study Notes</h3>
              <p className="text-xs text-[#78716c] leading-relaxed">
                Attach downloadable PDFs, formula sheets, and code resources directly to individual video lectures.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#e8e5dc] shadow-xs space-y-3 card-lift">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-2xs">
                <Sparkles size={22} />
              </div>
              <h3 className="font-extrabold text-base text-[#1c1917]">AI Teaching Assistant</h3>
              <p className="text-xs text-[#78716c] leading-relaxed">
                Domain-scoped AI assistant to draft course outlines, refine lesson copy, and answer learner inquiries.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 6. EDUCATOR STUDIO CTA SECTION                                  */}
        {/* ============================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#0f172a] via-[#1e3a8a] to-[#0f172a] text-white p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-5 text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/20">
                <Sparkles size={13} className="text-amber-300" />
                <span>For Educators & Academy Founders</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Launch your branded online academy today.
              </h2>
              <p className="text-xs sm:text-base text-white/80 leading-relaxed font-normal">
                Everything you need to teach online: upload video lectures, organize notes, set tuition pricing in INR, and operate with an AI teaching assistant.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate("/create-institution")}
                  className="bg-white hover:bg-white/95 text-[#1e3a8a] text-xs sm:text-sm font-extrabold px-7 py-3.5 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer touch-target pressable"
                >
                  Create Your Academy
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold px-6 py-3.5 rounded-xl border border-white/20 transition-all cursor-pointer touch-target pressable"
                >
                  Open Educator Studio
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
