import React, { useEffect, useState } from "react";
import { ArrowLeft, Funnel, Menu, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CourseCard from "../components/CourseCard";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";

function AllCourses() {
  const navigate = useNavigate();
  const { courseData } = useSelector((state) => state.course);

  const [category, setCategory] = useState([]);
  const [filterCourses, setFilterCourses] = useState([]);
  const [filterCoursesSmall, setFilterCoursesSmall] = useState(false);

  const toggleCategory = (e) => {
    const value = e.target.value;

    if (category.includes(value)) {
      setCategory((prev) => prev.filter((c) => c !== value));
    } else {
      setCategory((prev) => [...prev, value]);
    }
  };

  const applyFilter = () => {
    let courseCopy = courseData?.slice();

    if (category.length > 0) {
      courseCopy = courseCopy.filter((c) => category.includes(c.category));
    }

    setFilterCourses(courseCopy);
  };

  useEffect(() => {
    setFilterCourses(courseData);
  }, [courseData]);

  useEffect(() => {
    applyFilter();
  }, [category]);

  return (

    <div className="flex flex-col min-h-screen bg-gray-300 overflow-hidden">
      {/* Sidebar */}
      <Navbar/>
      <aside className={`${filterCoursesSmall? 'block':'hidden'} md:block transition duration-300  md:w-[260px] h-screen overflow-y-auto bg-black fixed top-0 left-0 p-6 py-32 border-r border-gray-700 shadow-md`}>
        <h2 className="text-xl font-bold flex items-center justify-center gap-2 text-gray-50 mb-6 cursor-pointer">
          <ArrowLeft size={30} onClick={() => navigate("/")} />
          Filter by Category
        </h2>

        <form className="space-y-4 text-sm text-white border border-gray-600 p-4 rounded-2xl">
          <button
            type="button"
            className="px-3 py-2 bg-gray-700 rounded text-[15px] font-light flex items-center justify-center gap-2 cursor-pointer w-full"
          >
            Search with Ai <Search size={20} color="purple" />
          </button>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              value="Development"
              onChange={toggleCategory}
            />
            Development
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" value="Cyber" onChange={toggleCategory} />
            Cyber
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" value="Business" onChange={toggleCategory} />
            Business
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" value="AIML" onChange={toggleCategory} />
            AI/ML
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              value="Cyber Security"
              onChange={toggleCategory}
            />
            Cyber Security
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              value="Data Science"
              onChange={toggleCategory}
            />
            Data Science
          </label>
        </form>
      </aside>

      {/* Cards */}
      <div className="w-full min-h-screen">
        {/* Mobile Top Bar */}
        <button onClick={()=>setFilterCoursesSmall(!filterCoursesSmall)} className=" md:hidden p-2 rounded-lg shadow-lg text-white px-4 absolute mt-2 right-4"><Funnel/></button>
        <main className="md:ml-[260px] pt-20 md:pt-20 px-6 flex flex-wrap gap-6">
          {filterCourses?.map((course, ind) => (
            <div key={ind} style={{ width: "320px", flex: "0 0 320px" }}>
              <CourseCard
                thumbnail={course.thumbnail}
                title={course.title}
                category={course.category}
                price={course.price}
                id={course._id}
              />
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}

export default AllCourses;
