import React from "react";
import CourseCard from "./CourseCard";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { CourseCardSkeleton } from "./common/Skeleton";
import { BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

function CardPage() {
  const { courseData } = useSelector((state) => state.course);
  const navigate = useNavigate();

  const popularCourses = Array.isArray(courseData) ? courseData.slice(0, 8) : [];
  const isLoading = courseData === null;

  return (
    <section className="relative w-full bg-[#f8f7f4] py-16 px-4 sm:px-6 lg:px-8 border-t border-[#e8e5dc]">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f2efe9] border border-[#e8e5dc] text-[#451a03] text-xs font-bold">
            <Sparkles size={13} className="text-[#b45309]" />
            Academic Curriculum
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
            Featured Courses & Programs
          </h2>
          <p className="text-xs sm:text-base text-[#57534e] max-w-2xl mx-auto leading-relaxed">
            Curated, structured courses designed by top educators. Master concepts through video lectures, notes, formula sheets, and practice resources.
          </p>
        </div>

        {/* Course Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <CourseCardSkeleton key={n} />
            ))}
          </div>
        ) : popularCourses.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-12 px-6 rounded-2xl bg-white border border-[#e8e5dc] shadow-xs">
            <BookOpen size={40} className="mx-auto text-[#a8a29e] mb-3" />
            <h3 className="text-base font-bold text-[#1c1917]">Courses in Preparation</h3>
            <p className="text-xs text-[#78716c] mt-1.5 mb-5 leading-relaxed">
              Curriculum and video lectures for this academy are currently being prepared by the instructors.
            </p>
            <button
              onClick={() => navigate("/mycourses")}
              className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              View My Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {popularCourses.map((course, i) => (
              <motion.div
                key={course._id || i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
              >
                <CourseCard
                  id={course._id}
                  title={course.title}
                  thumbnail={course.thumbnail}
                  price={course.price}
                  category={course.category}
                  reviews={course.reviews}
                  creator={course.creator}
                  enrolledStudents={course.enrolledStudents}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* View All Button */}
        {popularCourses.length > 0 && (
          <div className="text-center pt-4">
            <button
              onClick={() => navigate("/allcourses")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-[#d6d3c9] hover:bg-[#f2efe9] text-[#1c1917] font-bold text-xs sm:text-sm transition shadow-xs cursor-pointer"
            >
              <span>Explore All Courses</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default CardPage;
