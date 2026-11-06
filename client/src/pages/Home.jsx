import React, { lazy, Suspense } from "react";
import Navbar from "../components/Navbar";
import { ArrowRight, PlayCircle, Users, BookOpen, GraduationCap, Sparkles } from "lucide-react";
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
    "A modern learning platform where educators build powerful courses and students master real skills through structured learning.";
  const heroImage =
    tenant?.heroImage ||
    "https://images.freecreatives.com/wp-content/uploads/2016/04/Minimalistic-Website-Background.jpg";

  const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: (i = 1) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 1) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.2 + i * 0.08,
        duration: 0.5,
      },
    }),
  };

  return (
    <div className="w-full bg-black min-h-screen text-white flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full min-h-[85vh] flex items-center overflow-hidden border-b border-gray-900">
        {/* Background Image with Dark Overlay */}
        <motion.img
          src={heroImage}
          alt="Hero backdrop"
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-25"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2 }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/85 to-black" />

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              <motion.div custom={1} variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-semibold">
                <Sparkles size={13} />
                <span>Next-Gen Multi-Tenant Learning</span>
              </motion.div>

              <motion.h1
                custom={2}
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight"
              >
                {tenantTitle}
              </motion.h1>

              <motion.p
                custom={3}
                variants={fadeUp}
                className="text-gray-300 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                {tenantSubtitle}
              </motion.p>

              {/* Call-to-Action Buttons */}
              <motion.div
                custom={4}
                variants={fadeUp}
                className="pt-2 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              >
                <button
                  onClick={() => navigate("/allcourses")}
                  className="inline-flex items-center justify-center gap-2 bg-cyan-900 hover:bg-cyan-800 text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-lg shadow-lg shadow-cyan-950/50 transition-all duration-150 active:scale-95 cursor-pointer min-h-[44px]"
                >
                  Explore Courses <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById("about");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-500 bg-white/5 hover:bg-white/10 text-white font-medium text-sm sm:text-base px-7 py-3.5 rounded-lg transition-all active:scale-95 cursor-pointer min-h-[44px]"
                >
                  How It Works <PlayCircle size={18} />
                </button>
              </motion.div>

              {/* Key Platform Stats */}
              <motion.div
                custom={5}
                variants={fadeUp}
                className="pt-8 border-t border-gray-800/80 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0 text-center lg:text-left"
              >
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white">100%</p>
                  <p className="text-xs text-gray-400 mt-0.5">Isolated Tenants</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white">500+</p>
                  <p className="text-xs text-gray-400 mt-0.5">Active Courses</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white">99.9%</p>
                  <p className="text-xs text-gray-400 mt-0.5">SaaS Uptime</p>
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
                className="bg-gray-950/70 border border-gray-800/80 p-5 rounded-2xl backdrop-blur-md"
              >
                <BookOpen size={26} className="text-cyan-400 mb-3" />
                <h3 className="font-semibold text-base text-white">Structured Courses</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-normal">
                  Step-by-step video curriculums structured for real mastery.
                </p>
              </motion.div>

              <motion.div
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={2}
                className="bg-gray-950/70 border border-gray-800/80 p-5 rounded-2xl backdrop-blur-md"
              >
                <Users size={26} className="text-cyan-400 mb-3" />
                <h3 className="font-semibold text-base text-white">Community Driven</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-normal">
                  Engage directly with instructors and peers within your tenant.
                </p>
              </motion.div>

              <motion.div
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={3}
                className="bg-gray-950/70 border border-gray-800/80 p-5 rounded-2xl backdrop-blur-md"
              >
                <GraduationCap size={26} className="text-cyan-400 mb-3" />
                <h3 className="font-semibold text-base text-white">Industry Instructors</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-normal">
                  Learn skills directly from experienced practitioners.
                </p>
              </motion.div>

              <motion.div
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={4}
                className="bg-gray-950/70 border border-gray-800/80 p-5 rounded-2xl backdrop-blur-md"
              >
                <PlayCircle size={26} className="text-cyan-400 mb-3" />
                <h3 className="font-semibold text-base text-white">Instant Streaming</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-normal">
                  High-speed video playback with free preview access.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Carousel / Grid */}
      <CardPage />

      {/* Course Domains Section */}
      <ExploreCourses />

      {/* About & Architecture Section */}
      <Suspense fallback={<div className="h-40 bg-black" />}>
        <About />
      </Suspense>

      {/* Global Footer */}
      <Suspense fallback={<div className="h-40 bg-black" />}>
        <Footer />
      </Suspense>
    </div>
  );
}

export default Home;
