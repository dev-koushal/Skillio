import React, { useEffect, useState } from "react";
import { ArrowLeft, Filter, Search, X, BookOpen, Building2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CourseCard from "../components/CourseCard";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CourseCardSkeleton } from "../components/common/Skeleton";
import { useTenant } from "../context/TenantContext";

const CATEGORIES = [
  "Development",
  "Physics",
  "Cyber Security",
  "Business",
  "AIML",
  "AI/ML",
  "Data Science",
  "UI/UX Design",
  "Engineering",
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
    <div className="flex flex-col min-h-screen bg-[#f8f7f4] text-[#1c1917]">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 space-y-8">
        {/* Top Header & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate("/")}
                className="p-1 rounded-md text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] transition cursor-pointer"
                aria-label="Back to home"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                Curriculum Catalog
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#57534e]">
              Courses offered by <span className="font-bold text-[#1e3a8a]">{tenant?.name || "this academy"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c] w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, topic, or keyword..."
                className="w-full bg-white border border-[#d6d3c9] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] min-h-[42px] shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#1c1917]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile Filter Button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d3c9] text-xs font-bold text-[#1c1917] hover:bg-[#f2efe9] min-h-[42px] cursor-pointer"
            >
              <Filter size={15} />
              <span>Filter</span>
              {selectedCategories.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#1e3a8a] text-white text-[10px] flex items-center justify-center font-bold">
                  {selectedCategories.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Layout: Desktop Sidebar + Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden md:block md:col-span-1 space-y-6">
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-5 sticky top-24 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#f2efe9]">
                <span className="text-xs uppercase tracking-wider font-bold text-[#1c1917]">
                  Filter by Field
                </span>
                {selectedCategories.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-[#1e3a8a] hover:underline cursor-pointer font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {CATEGORIES.map((cat) => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition select-none ${
                        isChecked
                          ? "bg-blue-50 text-[#1e3a8a] font-bold border border-blue-200"
                          : "text-[#44403c] hover:bg-[#f8f7f4]"
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat)}
                        className="rounded border-[#d6d3c9] text-[#1e3a8a] focus:ring-[#1e3a8a] h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>

              {/* Institution Switcher Hint */}
              <div className="pt-4 border-t border-[#f2efe9] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716c]">
                  Looking for another academy?
                </span>
                <button
                  onClick={() => navigate("/institutions")}
                  className="w-full text-xs font-semibold text-[#1e3a8a] bg-[#f8f7f4] hover:bg-[#f2efe9] p-2.5 rounded-xl border border-[#e8e5dc] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Building2 size={13} />
                  <span>Browse Institutions</span>
                </button>
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
              <div className="text-center py-16 px-6 bg-white rounded-2xl border border-[#e8e5dc] max-w-md mx-auto shadow-xs space-y-3">
                <BookOpen size={40} className="mx-auto text-[#a8a29e]" />
                <h3 className="text-base font-bold text-[#1c1917]">No matching courses found</h3>
                <p className="text-xs text-[#78716c]">
                  Try adjusting your search criteria, checking spelling, or clearing filters.
                </p>
                <div className="pt-2">
                  <button
                    onClick={clearFilters}
                    className="bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-[#78716c] mb-4 font-medium">
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
      </main>

      {/* Mobile Filters Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileFilterOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-white border-l border-[#e8e5dc] h-full p-6 flex flex-col justify-between overflow-y-auto z-10 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#f2efe9]">
                <h3 className="font-bold text-sm text-[#1c1917]">Filters</h3>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-md text-[#78716c] hover:bg-[#f2efe9]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1.5">
                {CATEGORIES.map((cat) => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        isChecked
                          ? "bg-blue-50 text-[#1e3a8a] border border-blue-200"
                          : "text-[#44403c] hover:bg-[#f8f7f4]"
                      }`}
                    >
                      <span>{cat}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat)}
                        className="rounded border-[#d6d3c9] text-[#1e3a8a] focus:ring-[#1e3a8a] h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#f2efe9] space-y-2">
              <button
                onClick={() => {
                  clearFilters();
                  setMobileFilterOpen(false);
                }}
                className="w-full py-2.5 text-xs font-bold text-[#78716c] hover:bg-[#f8f7f4] rounded-xl"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-2.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default AllCourses;
