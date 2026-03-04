import React from "react";
import Navbar from "../components/Navbar";
import { ArrowRight, PlayCircle, Users, BookOpen, GraduationCap } from "lucide-react";
import HeroImage from '../assets/D.gif'
function Home() {
  return (
    <>
      <div className="w-full ">
        <Navbar />
      </div>

      {/* Hero */}
      <div className="relative w-full min-h-[90vh] text-white overflow-hidden">

        {/* Background */}
        <img
          src={HeroImage}
          alt="hero"
          className="absolute inset-0 w-full h-full object-cover grayscale"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/70"></div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20">

          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left */}
            <div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Learn Without <br />
                <span className="text-gray-300">Limits</span>
              </h1>

              <p className="mt-6 text-gray-400 text-lg max-w-lg">
                A modern learning platform where educators build powerful
                courses and students master real skills through structured
                learning.
              </p>

              <div className="mt-8 flex gap-4">
                <button className="flex items-center gap-2 bg-cyan-900 text-black px-7 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
                  Explore Courses <ArrowRight size={18} />
                </button>

                <button className="flex items-center gap-2 border border-white px-7 py-3 rounded-lg hover:bg-white hover:text-black transition">
                  Watch Demo <PlayCircle size={18} />
                </button>
              </div>

              {/* Stats */}
              <div className="flex gap-10 mt-12 text-gray-300">
                <div>
                  <p className="text-3xl font-bold">10K+</p>
                  <p className="text-sm text-gray-400">Students</p>
                </div>

                <div>
                  <p className="text-3xl font-bold">500+</p>
                  <p className="text-sm text-gray-400">Courses</p>
                </div>

                <div>
                  <p className="text-3xl font-bold">120+</p>
                  <p className="text-sm text-gray-400">Instructors</p>
                </div>
              </div>
            </div>

            {/* Right Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-6 gap-2">

              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
                <BookOpen size={28} className="mb-4  text-cyan-900"/>
                <h3 className="font-semibold text-lg">Structured Courses</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Organized learning paths designed for real progress.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
                <Users size={28} className="mb-4 text-cyan-900"/>
                <h3 className="font-semibold text-lg">Community Learning</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Learn together with peers and instructors.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
                <GraduationCap size={28} className="mb-4 text-cyan-900"/>
                <h3 className="font-semibold text-lg">Expert Mentors</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Courses created by industry professionals.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
                <PlayCircle size={28} className="mb-4 text-cyan-900"/>
                <h3 className="font-semibold text-lg">Interactive Lessons</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Videos, quizzes, and hands-on projects.
                </p>
              </div>

            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default Home;