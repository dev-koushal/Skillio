import React, { lazy } from "react";
import Navbar from "../components/Navbar";
import { ArrowRight, PlayCircle, Users, BookOpen, GraduationCap } from "lucide-react";
import HeroImage from "../assets/D.gif";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
const ExploreCourses = lazy(() => import('../components/ExploreCourses'));
const CardPage = lazy(() => import('../components/CardPage'));

function Home() {
  const navigate = useNavigate();

  const fadeUp = {
    hidden: { opacity: 0, y: 35 },
    visible: (i = 1) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.12,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };
  
  

  const cardVariant = {
    hidden: { opacity: 0, y: 30, scale: 0.96 },
    visible: (i = 1) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.12,
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  return (
    <>
      <div className="w-full">
        <Navbar />
      </div>

      {/* Hero */}
      <div className="relative w-full min-h-[90vh] text-white overflow-hidden">
        {/* Background */}
        <motion.img
          src={HeroImage}
          alt="hero"
          className="absolute inset-0 w-full h-full object-cover grayscale"
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Overlay */}
        <motion.div
          className="absolute inset-0 bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        ></motion.div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
            >
              <motion.h1
                className="text-5xl md:text-6xl font-bold leading-tight"
                custom={1}
                variants={fadeUp}
              >
                Learn Without <br />
                <span className="text-gray-300">Limits</span>
              </motion.h1>

              <motion.p
                className="mt-6 text-gray-400 text-lg max-w-lg"
                custom={2}
                variants={fadeUp}
              >
                A modern learning platform where educators build powerful
                courses and students master real skills through structured
                learning.
              </motion.p>

              <motion.div
                className="mt-8 flex gap-4"
                custom={3}
                variants={fadeUp}
              >
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 bg-cyan-900 text-black px-7 md:py-3 rounded-lg font-semibold hover:bg-gray-200 transition cursor-pointer"
                  onClick={() => navigate("/allcourses")}
                >
                  Explore Courses <ArrowRight size={18} />
                </motion.button>

                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 border border-white px-7 py-3 rounded-lg hover:bg-white hover:text-black transition"
                >
                  Watch Demo <PlayCircle size={18} />
                </motion.button>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="flex gap-10 mt-12 text-gray-300"
                custom={4}
                variants={fadeUp}
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-3xl font-bold">10K+</p>
                  <p className="text-sm text-gray-400">Students</p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-3xl font-bold">500+</p>
                  <p className="text-sm text-gray-400">Courses</p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-3xl font-bold">120+</p>
                  <p className="text-sm text-gray-400">Instructors</p>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-6 gap-2">
              <motion.div
                className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl"
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={1}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                  boxShadow: "0 20px 40px rgba(255,255,255,0.08)",
                }}
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <BookOpen size={28} className="mb-4 text-cyan-900" />
                </motion.div>
                <h3 className="font-semibold text-lg">Structured Courses</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Organized learning paths designed for real progress.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl"
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={2}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                  boxShadow: "0 20px 40px rgba(255,255,255,0.08)",
                }}
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Users size={28} className="mb-4 text-cyan-900" />
                </motion.div>
                <h3 className="font-semibold text-lg">Community Learning</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Learn together with peers and instructors.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl"
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={3}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                  boxShadow: "0 20px 40px rgba(255,255,255,0.08)",
                }}
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <GraduationCap size={28} className="mb-4 text-cyan-900" />
                </motion.div>
                <h3 className="font-semibold text-lg">Expert Mentors</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Courses created by industry professionals.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl"
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                custom={4}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                  boxShadow: "0 20px 40px rgba(255,255,255,0.08)",
                }}
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <PlayCircle size={28} className="mb-4 text-cyan-900" />
                </motion.div>
                <h3 className="font-semibold text-lg">Interactive Lessons</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Videos, quizzes, and hands-on projects.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
        <ExploreCourses />
        <CardPage />
     
    </>
  );
}

export default Home;