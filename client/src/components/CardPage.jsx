import React, { useEffect, useState } from "react";
import CourseCard from "./CourseCard";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";


function CardPage() {
  const { courseData } = useSelector((state) => state.course);
  const [popularCourses, setPopularCourses] = useState([]);
  
  useEffect(() => {
    setPopularCourses(courseData?.slice(0,8));
  }, [courseData]);
  return (
    <div className="relative flex items-center justify-center flex-col bg-black">
      <div className="min-h-screen max-w-7xl mx-auto text-white px-6 py-10">
        {/* Heading */}
        <h1 className="text-4xl font-bold mb-18 text-center">Our Popular Courses <p className="text-xs md:text-sm text-gray-600 mt-2">
          Explore top-rated courses designed to boost your skills,enhance careers, and unlock <br />opportunities in tech, AI, Business and beyond.</p></h1>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {popularCourses?.map((course, i) => (
            <motion.div
                key={i}
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}>
              <CourseCard 
              key={i}
              thumbnail={course.thumbnail}
              title={course.title}
              category={course.category}
              price={course.price}
              id={course._id}
            />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CardPage;
