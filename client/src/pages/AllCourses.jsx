import React, { useEffect, useState } from "react";
import { ArrowLeft, Filter, Search, X, BookOpen } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CourseCard from "../components/CourseCard";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import { CourseCardSkeleton } from "../components/common/Skeleton";
import { useTenant } from "../context/TenantContext";

const CATEGORIES = [
  "Development",
  "Cyber",
  "Cyber Security",
  "Business",
  "AIML",
  "AI/ML",
  "Data Science",
  "UI/UX Design",
];

function AllCourses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { courseData } = useSelector((state) => state.course);
  const { tenant } = useTenant();

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Initialize category filter from URL params if present
  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam && !selectedCategories.includes(catParam)) {
      setSelectedCategories([catParam]);
    }
  }, [searchParams]);

  const toggleCategory = (cat) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSearchQuery("");
    setSearchParams({});
  };

  // Filter courses by category and search query
  const filteredCourses = (courseData || []).filter((course) => {
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some(
        (cat) =>
          course.category?.toLowerCase() === cat.toLowerCase() ||
          (cat === "AIML" && course.category?.toLowerCase() === "ai/ml") ||
          (cat === "AI/ML" && course.category?.toLowerCase() === "aiml")
      );

    const matchesSearch =
      !searchQuery ||
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const isLoading = courseData === null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Top Header & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate("/")}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
                aria-label="Back to home"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                All Courses
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              Browse curricula offered by {tenant?.name || "this organization"}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 min-h-[40px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile Filter Button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 border border-gray-800 text-sm font-medium text-gray-300 hover:text-white min-h-[40px] cursor-pointer"
            >
              <Filter size={16} />
              <span>Filters</span>
              {selectedCategories.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-cyan-900 text-white text-[11px] flex items-center justify-center font-bold">
                  {selectedCategories.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Layout: Desktop Sidebar + Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden md:block md:col-span-1 space-y-6">
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-5 sticky top-24 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <span className="text-xs uppercase tracking-wider font-bold text-gray-300">
                  Filter by Category
                </span>
                {selectedCategories.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {CATEGORIES.map((cat) => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer transition select-none ${
                        isChecked
                          ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/80"
                          : "text-gray-300 hover:bg-gray-800/60"
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat)}
                        className="rounded border-gray-700 text-cyan-600 focus:ring-cyan-500 h-4 w-4 bg-gray-800"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Main Course Grid */}
          <main className="md:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <CourseCardSkeleton key={n} />
                ))}
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-16 px-6 bg-gray-900/50 rounded-2xl border border-gray-800/80 max-w-md mx-auto">
                <BookOpen size={40} className="mx-auto text-gray-600 mb-3" />
                <h3 className="text-lg font-semibold text-white">No matching courses</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 mb-5">
                  Try adjusting your search criteria or clearing active filters.
                </p>
                <button
                  onClick={clearFilters}
                  className="bg-cyan-900 hover:bg-cyan-800 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-400 mb-4">
                  Showing {filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <CourseCard
                      key={course._id}
                      thumbnail={course.thumbnail}
                      title={course.title}
                      category={course.category}
                      price={course.price}
                      id={course._id}
                      reviews={course?.reviews}
                    />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-gray-950 border-l border-gray-800 h-full p-6 flex flex-col justify-between z-10 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <span className="font-bold text-sm text-white">Filter Courses</span>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2">
                {CATEGORIES.map((cat) => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium cursor-pointer ${
                        isChecked
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                          : "text-gray-300 hover:bg-gray-900"
                      }`}
                    >
                      <span>{cat}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat)}
                        className="rounded border-gray-700 text-cyan-600 h-4 w-4 bg-gray-800"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 space-y-2">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full bg-cyan-900 hover:bg-cyan-800 text-white font-medium py-2.5 rounded-lg text-sm"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="w-full bg-gray-900 hover:bg-gray-800 text-gray-400 font-medium py-2 rounded-lg text-xs"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AllCourses;
