import React, { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Filter, Search, X, BookOpen, Building2, SlidersHorizontal, Check } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CourseCard from "../components/CourseCard";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CourseCardSkeleton } from "../components/common/Skeleton";
import { useTenant } from "../context/TenantContext";
import EmptyState from "../components/common/EmptyState";

function AllCourses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { courseData } = useSelector((state) => state.course);
  const { tenant } = useTenant();

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all"); // "all" | "free" | "paid"
  const [levelFilter, setLevelFilter] = useState("all"); // "all" | "Beginner" | "Intermediate" | "Advanced"
  const [sortBy, setSortBy] = useState("recent"); // "recent" | "price-asc" | "price-desc"
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Derive organization-defined categories from actual courses
  const orgCategories = useMemo(() => {
    return Array.from(
      new Set((courseData || []).map((c) => c.category?.trim()).filter(Boolean))
    );
  }, [courseData]);

  // Derive available levels present in actual courses
  const availableLevels = useMemo(() => {
    return Array.from(
      new Set((courseData || []).map((c) => c.level?.trim()).filter(Boolean))
    );
  }, [courseData]);

  // Initialize category from URL query params
  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      setSelectedCategory(catParam);
    }
  }, [searchParams]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setPriceFilter("all");
    setLevelFilter("all");
    setSortBy("recent");
    setSearchParams({});
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "all" ||
    priceFilter !== "all" ||
    levelFilter !== "all" ||
    sortBy !== "recent";

  // Filter and sort courses
  const filteredCourses = useMemo(() => {
    if (!Array.isArray(courseData)) return [];

    return courseData
      .filter((course) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = course.title?.toLowerCase().includes(q);
          const matchSub = course.subTitle?.toLowerCase().includes(q);
          const matchDesc = course.description?.toLowerCase().includes(q);
          const matchCat = course.category?.toLowerCase().includes(q);
          if (!matchTitle && !matchSub && !matchDesc && !matchCat) return false;
        }

        // Category filter
        if (selectedCategory !== "all") {
          if (course.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
            return false;
          }
        }

        // Price filter
        if (priceFilter === "free") {
          if (course.price && Number(course.price) > 0) return false;
        } else if (priceFilter === "paid") {
          if (!course.price || Number(course.price) <= 0) return false;
        }

        // Level filter
        if (levelFilter !== "all") {
          if (course.level !== levelFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") {
          return (a.price || 0) - (b.price || 0);
        }
        if (sortBy === "price-desc") {
          return (b.price || 0) - (a.price || 0);
        }
        // default recent
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [courseData, searchQuery, selectedCategory, priceFilter, levelFilter, sortBy]);

  const isLoading = courseData === null;
  const tenantName = tenant?.name || "This Academy";

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f7f4] text-[#1c1917] font-sans">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 space-y-6 pb-28 md:pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e8e5dc]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate("/")}
                className="p-1.5 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer"
                aria-label="Back to home"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                Curriculum Catalog
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#78716c]">
              {tenant?.isPlatform ? (
                <span>Explore accredited courses and study resources across institutions on Skillio</span>
              ) : (
                <span>
                  Explore courses and study resources offered by{" "}
                  <strong className="text-[#1e3a8a]">{tenantName}</strong>
                </span>
              )}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses by topic, title..."
              className="w-full bg-white border border-[#d6d3d1] rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] min-h-[42px] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#1c1917]"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#e8e5dc] p-3.5 sm:p-4 rounded-2xl shadow-xs">
          {/* Left: Organization-Specific Categories (if > 1) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-[#1e3a8a] text-white"
                  : "bg-[#f8f7f4] text-[#44403c] hover:bg-[#f1ede4] border border-[#e8e5dc]"
              }`}
            >
              All Topics
            </button>
            {orgCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? "bg-[#1e3a8a] text-white"
                    : "bg-[#f8f7f4] text-[#44403c] hover:bg-[#f1ede4] border border-[#e8e5dc]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right: Quick Contextual Filters */}
          <div className="flex items-center gap-2.5 ml-auto">
            {/* Price Filter */}
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="bg-[#f8f7f4] border border-[#d6d3d1] text-[#44403c] text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#1e3a8a] cursor-pointer min-h-[36px]"
            >
              <option value="all">Pricing: All</option>
              <option value="free">Free Courses</option>
              <option value="paid">Paid Programs</option>
            </select>

            {/* Level Filter (only if levels exist in this org) */}
            {availableLevels.length > 0 && (
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="bg-[#f8f7f4] border border-[#d6d3d1] text-[#44403c] text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#1e3a8a] cursor-pointer min-h-[36px]"
              >
                <option value="all">Level: All</option>
                {availableLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            )}

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#f8f7f4] border border-[#d6d3d1] text-[#44403c] text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#1e3a8a] cursor-pointer min-h-[36px]"
            >
              <option value="recent">Sort: Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-[#1e3a8a] hover:underline font-semibold px-2 py-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Course Grid */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <CourseCardSkeleton key={n} />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <EmptyState
              type={hasActiveFilters ? "search" : "courses"}
              title={hasActiveFilters ? "No courses match your filters" : `No courses in ${tenantName} yet`}
              description={
                hasActiveFilters
                  ? "Try resetting your search query, level, or pricing filters to explore other courses."
                  : `This academy has not published any live courses yet. Check back soon!`
              }
              actionLabel={hasActiveFilters ? "Reset All Filters" : "Go to Home"}
              onAction={hasActiveFilters ? clearFilters : () => navigate("/")}
            />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-[#78716c] font-medium">
                  Showing {filteredCourses.length}{" "}
                  {filteredCourses.length === 1 ? "course" : "courses"} in {tenantName}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course._id}
                    id={course._id}
                    title={course.title}
                    thumbnail={course.thumbnail}
                    price={course.price}
                    category={course.category}
                    reviews={course.reviews}
                    creator={course.creator}
                    enrolledStudents={course.enrolledStudents}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AllCourses;
