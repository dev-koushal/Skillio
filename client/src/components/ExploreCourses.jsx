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
    { name: "Web Development", icon: Monitor, bg: "bg-blue-50 text-blue-800 border-blue-200" },
    { name: "UI/UX Design", icon: PenTool, bg: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { name: "App Development", icon: Smartphone, bg: "bg-amber-50 text-amber-800 border-amber-200" },
    { name: "Cybersecurity", icon: Shield, bg: "bg-indigo-50 text-indigo-800 border-indigo-200" },
    { name: "AI / Machine Learning", icon: Brain, bg: "bg-purple-50 text-purple-800 border-purple-200" },
    { name: "Data Science", icon: Share2, bg: "bg-rose-50 text-rose-800 border-rose-200" },
    { name: "Physics & Engineering", icon: BarChart3, bg: "bg-sky-50 text-sky-800 border-sky-200" },
    { name: "Cloud & DevOps", icon: Boxes, bg: "bg-teal-50 text-teal-800 border-teal-200" },
  ];

  return (
    <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#f8f7f4] border-t border-[#e8e5dc]">
      <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Intro */}
        <div className="md:col-span-5 space-y-4 text-center md:text-left">
          <span className="text-xs uppercase tracking-wider text-[#b45309] font-bold bg-[#f2efe9] px-3 py-1 rounded-full border border-[#e8e5dc]">
            Academic Disciplines
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight leading-tight">
            Explore Curriculums <br className="hidden md:inline" /> By Field
          </h2>
          <p className="text-xs sm:text-base text-[#57534e] max-w-md mx-auto md:mx-0 leading-relaxed">
            From university physics to full-stack engineering. Every course provides verified video lessons, downloadable notes, and structured milestones.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate("/allcourses")}
              className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
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
                onClick={() => navigate(`/allcourses?category=${encodeURIComponent(cat.name)}`)}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className="bg-white border border-[#e8e5dc] rounded-2xl p-4 flex flex-col items-center text-center gap-2.5 cursor-pointer hover:border-[#1e3a8a]/50 hover:shadow-xs transition"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cat.bg}`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs font-bold text-[#1c1917] leading-tight">
                  {cat.name}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ExploreCourses;
