import React, { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import {
  ArrowRight,
  BookOpen,
  FileText,
  GraduationCap,
  Award,
  Sparkles,
  CheckCircle2,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { useTenant } from "../context/TenantContext";
import api from "../services/api";

const About = lazy(() => import("../components/About"));
const Footer = lazy(() => import("../components/Footer"));
const ExploreCourses = lazy(() => import("../components/ExploreCourses"));
const CardPage = lazy(() => import("../components/CardPage"));

export default function InstitutionHome() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { courseData } = useSelector((state) => state.course);
  const { tenant: contextTenant, reloadTenant } = useTenant();

  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchInstitution = async () => {
      try {
        setLoading(true);
        setError(null);
        const targetSlug = slug || contextTenant?.slug || "default";

        // Store active tenant in localStorage so downstream course clicks know the tenant
        if (targetSlug && targetSlug !== "default") {
          localStorage.setItem("skillio_active_tenant", targetSlug);
        }

        const res = await api.get(`/api/tenant/by-slug/${targetSlug}`);
        if (isMounted && res.data?.success && res.data?.tenant) {
          setInstitution(res.data.tenant);
          document.title = `${res.data.tenant.name} — ${res.data.tenant.title || "Academy"}`;
        } else {
          // If not found by slug, use context tenant
          if (isMounted && contextTenant) {
            setInstitution(contextTenant);
          }
        }
      } catch (err) {
        console.warn("[InstitutionHome] Could not fetch by slug, falling back to context tenant:", err.message);
        if (isMounted && contextTenant) {
          setInstitution(contextTenant);
        } else if (isMounted) {
          setError("Institution not found");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInstitution();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const activeTenant = institution || contextTenant;
  const tenantName = activeTenant?.name || "Learning Academy";
  const tenantTitle =
    activeTenant?.title ||
    (activeTenant?.slug === "physics"
      ? "Master Physics from Basics to Advanced"
      : activeTenant?.slug === "english"
      ? "Master English with Practical Fluency"
      : activeTenant?.slug === "coding"
      ? "Master Modern Software Engineering"
      : `Welcome to ${tenantName}`);

  const tenantSubtitle =
    activeTenant?.subtitle ||
    activeTenant?.description ||
    "Structured, milestone-driven courses taught by accredited educators with video lectures, downloadable notes, and verified access.";

  const institutionType = activeTenant?.institutionType || "Academy";

  // Filter enrolled courses belonging to this institution
  const enrolledCoursesInTenant = (userData?.enrolledCourses || [])
    .map((item) => (typeof item === "object" ? item : (courseData || []).find((c) => c._id === item)))
    .filter((c) => c && c.title);

  const activeEnrolledCourse = enrolledCoursesInTenant[0];

  return (
    <div className="w-full bg-[#f8f7f4] min-h-screen text-[#1c1917] flex flex-col font-sans pb-20 md:pb-0">
      <Navbar currentInstitution={activeTenant} />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a]" />
          <p className="text-xs text-[#78716c] font-semibold uppercase tracking-wider">
            Loading {tenantName}...
          </p>
        </div>
      ) : (
        <>
          {/* Institution Hero Section */}
          <section className="relative w-full bg-gradient-to-b from-white via-[#fcfbf9] to-[#f8f7f4] border-b border-[#e8e5dc] py-16 sm:py-20 overflow-hidden">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Left Content */}
                <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] text-xs font-semibold">
                    <Sparkles size={14} className="text-[#1e3a8a]" />
                    <span>
                      {institutionType} • {tenantName}
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1c1917] leading-tight">
                    {tenantTitle}
                  </h1>

                  <p className="text-[#57534e] text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
                    {tenantSubtitle}
                  </p>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                    <button
                      onClick={() => navigate(activeTenant?.slug ? `/institution/${activeTenant.slug}/courses` : "/courses")}
                      className="inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer min-h-[46px]"
                    >
                      Explore Courses <ArrowRight size={18} />
                    </button>

                    {userData ? (
                      <button
                        onClick={() => navigate(activeTenant?.slug ? `/institution/${activeTenant.slug}/my-courses` : "/mycourses")}
                        className="inline-flex items-center justify-center gap-2 border border-[#d6d3d1] bg-white hover:bg-[#f1ede4] text-[#1c1917] font-semibold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer min-h-[46px]"
                      >
                        <BookOpen size={18} className="text-[#1e3a8a]" />
                        My Courses
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate("/login")}
                        className="inline-flex items-center justify-center gap-2 border border-[#d6d3d1] bg-white hover:bg-[#f1ede4] text-[#1c1917] font-semibold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer min-h-[46px]"
                      >
                        Sign In to Learn
                      </button>
                    )}
                  </div>

                  {/* Trust Indicators */}
                  <div className="pt-6 border-t border-[#e8e5dc] flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#78716c]">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 size={16} className="text-emerald-700" />
                      <span>Verified Course Curriculum</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 size={16} className="text-emerald-700" />
                      <span>Downloadable Notes & PDFs</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 size={16} className="text-emerald-700" />
                      <span>Lifetime Learning Access</span>
                    </div>
                  </div>
                </div>

                {/* Right Academy Pillars */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-[#e8e5dc] p-5 sm:p-6 rounded-2xl shadow-xs hover:border-[#1e3a8a]/40 transition">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center mb-3">
                      <BookOpen size={20} />
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">
                      Curated Curriculum
                    </h3>
                    <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                      Sequenced video lectures with free previews and structured chapters.
                    </p>
                  </div>

                  <div className="bg-white border border-[#e8e5dc] p-5 sm:p-6 rounded-2xl shadow-xs hover:border-[#1e3a8a]/40 transition">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                      <FileText size={20} />
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">
                      Notes & Resources
                    </h3>
                    <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                      Download lecture notes, formula sheets, problem sets, and practice materials.
                    </p>
                  </div>

                  <div className="bg-white border border-[#e8e5dc] p-5 sm:p-6 rounded-2xl shadow-xs hover:border-[#1e3a8a]/40 transition">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                      <GraduationCap size={20} />
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">
                      Direct Instruction
                    </h3>
                    <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                      Learn directly from specialized educators dedicated to your learning progress.
                    </p>
                  </div>

                  <div className="bg-white border border-[#e8e5dc] p-5 sm:p-6 rounded-2xl shadow-xs hover:border-[#1e3a8a]/40 transition">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                      <Award size={20} />
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">
                      Dedicated Academy
                    </h3>
                    <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                      Your independent learning home with personalized courses and notes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Continue Learning in Active Academy (if student is enrolled in courses) */}
          {activeEnrolledCourse && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
              <div className="bg-white rounded-2xl border border-[#e8e5dc] p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                  <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center shrink-0 border border-[#bfdbfe]">
                    <GraduationCap size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider">
                      Continue Learning in {tenantName}
                    </p>
                    <p className="text-sm font-bold text-[#1c1917] truncate">
                      {activeEnrolledCourse.title}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/viewlecture/${activeEnrolledCourse._id}`)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shrink-0 cursor-pointer touch-target pressable"
                >
                  <span>Resume Lecture & Notes</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </section>
          )}

          {/* Featured Courses for this Organization */}
          <CardPage />

          {/* Organization Curriculum Tracks or Educational Values */}
          <ExploreCourses />

          {/* About & Organization Pedagogy Section */}
          <Suspense fallback={<div className="h-40 bg-[#f8f7f4]" />}>
            <About />
          </Suspense>

          {/* Footer */}
          <Suspense fallback={<div className="h-40 bg-white" />}>
            <Footer />
          </Suspense>
        </>
      )}
    </div>
  );
}

