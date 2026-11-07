import React, { lazy, Suspense } from "react";
import Navbar from "../components/Navbar";
import {
  ArrowRight,
  PlayCircle,
  Users,
  BookOpen,
  GraduationCap,
  Sparkles,
  Building2,
  FileText,
  CheckCircle2,
  Award,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTenant } from "../context/TenantContext";

const About = lazy(() => import("../components/About"));
const Footer = lazy(() => import("../components/Footer"));
const ExploreCourses = lazy(() => import("../components/ExploreCourses"));
const CardPage = lazy(() => import("../components/CardPage"));

function Home() {
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const tenantName = tenant?.name || "Skillio Academy";
  const tenantTitle =
    tenant?.title ||
    (tenant?.slug === "physics"
      ? "Master Physics from Basics to Advanced"
      : tenant?.slug === "english"
      ? "Master English with Practical Fluency"
      : tenant?.slug === "coding"
      ? "Master Modern Software Engineering"
      : `Welcome to ${tenantName}`);

  const tenantSubtitle =
    tenant?.subtitle ||
    tenant?.description ||
    (tenant?.slug === "physics"
      ? "Structured preparation for competitive exams, school board excellence, and university physics with concept-first lectures and problem sets."
      : tenant?.slug === "english"
      ? "Build practical speaking confidence, correct grammar, and ace corporate interviews or IELTS with structured everyday lessons."
      : tenant?.slug === "coding"
      ? "Full-stack web development, backend engineering, algorithms, and real-world system design taught by veteran engineers."
      : "Structured, milestone-driven courses taught by accredited educators with video lectures, downloadable notes, and verified access.");

  const institutionType = tenant?.institutionType || "Online Academy";

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 1) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  const cardVariant = {
    hidden: { opacity: 0, y: 15 },
    visible: (i = 1) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.15 + i * 0.06,
        duration: 0.4,
      },
    }),
  };

  return (
    <div className="w-full bg-[#f8f7f4] min-h-screen text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      {/* Tenant-Specific Hero Section */}
      <section className="relative w-full bg-gradient-to-b from-white via-[#fcfbf9] to-[#f8f7f4] border-b border-[#e8e5dc] py-16 sm:py-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              <motion.div
                custom={1}
                variants={fadeUp}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] text-xs font-semibold"
              >
                <Sparkles size={14} className="text-[#1e3a8a]" />
                <span>{institutionType} • {tenantName}</span>
              </motion.div>

              <motion.h1
                custom={2}
                variants={fadeUp}
                className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1c1917] leading-tight"
              >
                {tenantTitle}
              </motion.h1>

              <motion.p
                custom={3}
                variants={fadeUp}
                className="text-[#57534e] text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                {tenantSubtitle}
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                custom={4}
                variants={fadeUp}
                className="pt-2 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              >
                <button
                  onClick={() => navigate("/allcourses")}
                  className="inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer min-h-[46px]"
                >
                  Explore Courses <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => navigate("/institutions")}
                  className="inline-flex items-center justify-center gap-2 border border-[#d6d3d1] bg-white hover:bg-[#f1ede4] text-[#1c1917] font-semibold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer min-h-[46px]"
                >
                  <Building2 size={18} className="text-[#1e3a8a]" />
                  Find Your Institution
                </button>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                custom={5}
                variants={fadeUp}
                className="pt-8 border-t border-[#e8e5dc] flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#78716c]"
              >
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
              </motion.div>
            </motion.div>

            {/* Right Academy Pillars */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={1}
                className="bg-white border border-[#e8e5dc] p-5 sm:p-6 rounded-2xl shadow-xs hover:border-[#1e3a8a]/40 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center mb-3">
                  <BookOpen size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">
                  Curated Curriculum
                </h3>
                <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                  Sequenced video lectures with free previews and structured chapters.
                </p>
              </motion.div>

              <motion.div
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={2}
                className="bg-white border border-[#e8e5dc] p-5 sm:p-6 rounded-2xl shadow-xs hover:border-[#1e3a8a]/40 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">
                  Notes & Resources
                </h3>
                <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                  Download lecture notes, formula sheets, problem sets, and practice materials.
                </p>
              </motion.div>

              <motion.div
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={3}
                className="bg-white border border-[#e8e5dc] p-5 sm:p-6 rounded-2xl shadow-xs hover:border-[#1e3a8a]/40 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                  <GraduationCap size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">
                  Direct Instruction
                </h3>
                <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                  Learn directly from specialized educators dedicated to your learning progress.
                </p>
              </motion.div>

              <motion.div
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={4}
                className="bg-white border border-[#e8e5dc] p-5 sm:p-6 rounded-2xl shadow-xs hover:border-[#1e3a8a]/40 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <Award size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">
                  Dedicated Academy
                </h3>
                <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                  Your independent learning home with personalized courses and notes.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses for this Organization */}
      <CardPage />

      {/* Organization Curriculum Tracks or Educational Values */}
      <ExploreCourses />

      {/* About & Organization Pedagogy Section */}
      <Suspense fallback={<div className="h-40 bg-[#f8f7f4]" />}>
        <About />
      </Suspense>

      {/* Global Footer */}
      <Suspense fallback={<div className="h-40 bg-white" />}>
        <Footer />
      </Suspense>
    </div>
  );
}

export default Home;
