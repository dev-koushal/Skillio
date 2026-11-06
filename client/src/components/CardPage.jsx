import React from "react";
import CourseCard from "./CourseCard";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { CourseCardSkeleton } from "./common/Skeleton";
import { BookOpen, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

function CardPage() {
  const { courseData } = useSelector((state) => state.course);
  const navigate = useNavigate();

  const popularCourses = Array.isArray(courseData) ? courseData.slice(0, 8) : [];
  const isLoading = courseData === null;

  return (
    <section className="relative w-full bg-black py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs font-semibold mb-3">
            <Sparkles size={13} />
            Featured Learning Paths
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Our Popular Courses
          </h2>
          <p className="text-sm sm:text-base text-gray-400 mt-3 leading-relaxed">
            Explore industry-tested courses designed to elevate your technical skills, master real-world toolchains, and accelerate your career.
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
          <div className="max-w-md mx-auto text-center py-12 px-6 rounded-2xl bg-gray-950 border border-gray-800">
            <BookOpen size={40} className="mx-auto text-gray-600 mb-3" />
            <h3 className="text-lg font-semibold text-white">No courses published yet</h3>
            <p className="text-sm text-gray-400 mt-1.5 mb-5">
              Courses for this organization are currently being prepared. Check back soon or explore our catalog.
            </p>
            <button
              onClick={() => navigate("/allcourses")}
              className="bg-cyan-900 hover:bg-cyan-800 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg transition"
            >
              Browse All Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {popularCourses.map((course, i) => (
              <motion.div
                key={course._id || i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <CourseCard
                  thumbnail={course.thumbnail}
                  title={course.title}
                  category={course.category}
                  price={course.price}
                  id={course._id}
                  reviews={course.reviews}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CardPage;
