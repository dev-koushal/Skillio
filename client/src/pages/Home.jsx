import React, { lazy, Suspense } from "react";
import Navbar from "../components/Navbar";
import { ArrowRight, PlayCircle, Users, BookOpen, GraduationCap, Sparkles, Building2, FileText, CheckCircle2 } from "lucide-react";
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

  const tenantTitle = tenant?.title || "Learn Without Limits";
  const tenantSubtitle =
    tenant?.subtitle ||
    "A modern multi-tenant learning platform where educators build comprehensive courses and students master real skills through structured learning.";

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
    <div className="w-full bg-[#f8f7f4] min-h-screen text-[#1c1917] flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full bg-gradient-to-b from-white via-[#faf9f6] to-[#f8f7f4] border-b border-[#e8e5dc] py-16 sm:py-24 overflow-hidden">
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
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f2efe9] border border-[#e8e5dc] text-[#451a03] text-xs font-bold"
              >
                <Sparkles size={14} className="text-[#b45309]" />
                <span>Modern Academic SaaS Platform</span>
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
                  className="inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer min-h-[44px]"
                >
                  Explore Courses <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => navigate("/institutions")}
                  className="inline-flex items-center justify-center gap-2 border border-[#d6d3c9] bg-white hover:bg-[#f2efe9] text-[#1c1917] font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer min-h-[44px]"
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
                  <span>Enforced Course Access</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span>Lecture Notes & PDFs</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span>Multi-Tenant Isolation</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Feature Highlights */}
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
                  Sequenced video lectures with free previews and lifetime access upon enrollment.
                </p>
              </motion.div>

              <motion.div
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={2}
                className="bg-white border border-[#e8e5dc] p-5 sm:p-6 rounded-2xl shadow-xs hover:border-[#1e3a8a]/40 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#b45309] flex items-center justify-center mb-3">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">
                  Notes & Resources
                </h3>
                <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                  Download lecture notes, formula sheets, problem sets, and supplementary materials.
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
                  Verified Instructors
                </h3>
                <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                  Learn from accredited teachers, university professors, and industry practitioners.
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
                  <Building2 size={20} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">
                  Multi-Institution
                </h3>
                <p className="text-xs text-[#78716c] mt-1.5 leading-relaxed">
                  Explore specialized coaching centers and academies across multiple academic domains.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Grid */}
      <CardPage />

      {/* Course Domains Section */}
      <ExploreCourses />

      {/* About & Architecture Section */}
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
