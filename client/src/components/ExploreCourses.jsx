import React from "react";
import {
  BookOpen,
  FileText,
  Video,
  Award,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { useTenant } from "../context/TenantContext";

function ExploreCourses() {
  const navigate = useNavigate();
  const { courseData } = useSelector((state) => state.course);
  const { tenant } = useTenant();

  const tenantName = tenant?.name || "This Academy";

  // Derive organization-specific topics dynamically from actual courses
  const distinctTopics = Array.from(
    new Set((courseData || []).map((c) => c.category?.trim()).filter(Boolean))
  );

  return (
    <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white border-t border-[#e8e5dc]">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#e8e5dc]">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#1e3a8a] font-bold bg-[#eff6ff] px-3 py-1 rounded-full border border-[#bfdbfe]">
              <Sparkles size={12} />
              Curriculum Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1c1917] tracking-tight leading-tight">
              {distinctTopics.length > 1
                ? `Specialized Tracks at ${tenantName}`
                : `How You Learn at ${tenantName}`}
            </h2>
            <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
              Every course is built concept-first with step-by-step video lectures, verified notes, and direct educator guidance.
            </p>
          </div>

          <div>
            <button
              onClick={() => navigate("/allcourses")}
              className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer min-h-[42px]"
            >
              Browse All Courses <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Dynamic Topics Grid if organization has multiple categories */}
        {distinctTopics.length > 1 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {distinctTopics.map((topic, index) => {
              const topicCourses = (courseData || []).filter(
                (c) => c.category?.toLowerCase() === topic.toLowerCase()
              );
              return (
                <motion.div
                  key={topic}
                  onClick={() => navigate(`/allcourses?category=${encodeURIComponent(topic)}`)}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  className="group bg-[#fcfbf9] border border-[#e8e5dc] hover:border-[#1e3a8a]/50 hover:bg-white rounded-2xl p-5 cursor-pointer transition shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center font-bold">
                      <Layers size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#1c1917] group-hover:text-[#1e3a8a] transition-colors">
                        {topic}
                      </h3>
                      <p className="text-xs text-[#78716c] mt-1">
                        {topicCourses.length} {topicCourses.length === 1 ? "Course" : "Courses"} available
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-[#f1ede4] flex items-center justify-between text-xs font-semibold text-[#1e3a8a]">
                    <span>Explore Track</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Pedagogical Value Proposition when catalog is focused */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#fcfbf9] border border-[#e8e5dc] rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center">
                <Video size={20} />
              </div>
              <h3 className="font-bold text-base text-[#1c1917]">High-Definition Lectures</h3>
              <p className="text-xs text-[#78716c] leading-relaxed">
                Step-by-step video lessons designed to demystify complex subjects with practical examples.
              </p>
            </div>

            <div className="bg-[#fcfbf9] border border-[#e8e5dc] rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <h3 className="font-bold text-base text-[#1c1917]">Comprehensive Notes</h3>
              <p className="text-xs text-[#78716c] leading-relaxed">
                Downloadable PDF lecture notes, formula cheat sheets, and study materials accompanying each lesson.
              </p>
            </div>

            <div className="bg-[#fcfbf9] border border-[#e8e5dc] rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <h3 className="font-bold text-base text-[#1c1917]">Structured Progression</h3>
              <p className="text-xs text-[#78716c] leading-relaxed">
                Curriculums sequenced from foundational concepts to advanced problem solving.
              </p>
            </div>

            <div className="bg-[#fcfbf9] border border-[#e8e5dc] rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Award size={20} />
              </div>
              <h3 className="font-bold text-base text-[#1c1917]">Verified Access</h3>
              <p className="text-xs text-[#78716c] leading-relaxed">
                Lifetime enrollment access with student dashboard tracking your ongoing milestones.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ExploreCourses;
