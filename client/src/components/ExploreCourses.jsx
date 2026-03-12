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

function ExploreCourses() {

  const navigate = useNavigate();
  const courses = [
    { name: "Web Development", icon: Monitor, color: "bg-purple-100" },
    { name: "UI UX Designing", icon: PenTool, color: "bg-green-100" },
    { name: "App Development", icon: Smartphone, color: "bg-pink-100" },
    { name: "Ethical Hacking", icon: Shield, color: "bg-purple-100" },
    { name: "AI/ML", icon: Brain, color: "bg-green-100" },
    { name: "Data Science", icon: Share2, color: "bg-pink-100" },
    { name: "Data Analytics", icon: BarChart3, color: "bg-purple-100" },
    { name: "AI Tools", icon: Boxes, color: "bg-green-100" },
  ];

  return (
    
    <div className="w-full   py-16 px-4 md:px-12 lg:px-20 bg-black">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left */}
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Explore <br /> Our Courses
          </h2>

          <p className="text-gray-500 mb-6 max-w-md">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Rem vel
            iure explicabo laboriosam accusantium expedita laudantium facere
            magnam.
          </p>

          <button className="flex items-center gap-2 bg-black text-white px-6 py-3 border border-white rounded-lg hover:opacity-90 cursor-pointer" onClick={()=>navigate("/allcourses")}>
            Explore Courses <ArrowRight size={18} />
          </button>
        </div>

        {/* Right */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {courses.map((course, index) => {
            const Icon = course.icon;
            return (
              <div
                key={index}
                className={`flex flex-col items-center justify-center p-6 rounded-xl ${course.color} hover:scale-105 transition`}
              >
                <Icon size={28} className="mb-3 text-gray-700" />
                <p className="text-sm font-medium text-gray-700 text-center">
                  {course.name}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default ExploreCourses;