import React from "react";
import {
  Monitor,
  PenTool,
  Smartphone,
  Shield,
  Brain,
  Share2,
  BarChart3,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function ExploreCourses() {
  const navigate = useNavigate();

  const categories = [
    { name: "Web Development", icon: Monitor, color: "bg-purple-950/40 text-purple-300 border-purple-800/40" },
    { name: "UI/UX Design", icon: PenTool, color: "bg-emerald-950/40 text-emerald-300 border-emerald-800/40" },
    { name: "App Development", icon: Smartphone, color: "bg-pink-950/40 text-pink-300 border-pink-800/40" },
    { name: "Cybersecurity", icon: Shield, color: "bg-blue-950/40 text-blue-300 border-blue-800/40" },
    { name: "AI / Machine Learning", icon: Brain, color: "bg-indigo-950/40 text-indigo-300 border-indigo-800/40" },
    { name: "Data Science", icon: Share2, color: "bg-amber-950/40 text-amber-300 border-amber-800/40" },
    { name: "Data Analytics", icon: BarChart3, color: "bg-teal-950/40 text-teal-300 border-teal-800/40" },
    { name: "Cloud & DevOps", icon: Boxes, color: "bg-cyan-950/40 text-cyan-300 border-cyan-800/40" },
  ];

  return (
    <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-black border-t border-gray-900">
      <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Intro */}
        <div className="md:col-span-5 space-y-4 text-center md:text-left">
          <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold font-mono">
            Domains & Categories
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
            Explore <br className="hidden md:inline" /> Our Disciplines
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto md:mx-0 leading-relaxed">
            Gain mastery in domains vetted by tech industry leaders. Each curriculum is tailored to bridge the gap from foundational knowledge to deployment.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate("/allcourses")}
              className="inline-flex items-center gap-2 bg-cyan-900 hover:bg-cyan-800 text-white text-sm font-semibold px-6 py-3 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
            >
              Explore All Courses <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Right Categories Grid */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {categories.map((cat, index) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                onClick={() => navigate(`/allcourses?category=${encodeURIComponent(cat.name)}`)}
                className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl border ${cat.color} hover:scale-[1.03] transition-all duration-200 cursor-pointer text-center group`}
              >
                <Icon size={26} className="mb-2.5 transition-transform group-hover:scale-110" />
                <p className="text-xs sm:text-sm font-medium text-gray-200 line-clamp-1">
                  {cat.name}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ExploreCourses;
