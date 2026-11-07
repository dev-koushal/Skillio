import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, BookOpen, ArrowRight, Sparkles, PlusCircle } from "lucide-react";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { optimizeImage } from "../utils/imageOptimizer";

function InstitutionDirectory() {
  const navigate = useNavigate();
  const { tenant: currentTenant, switchTenant } = useTenant();

  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const types = ["all", "Academy", "Coaching Center", "Bootcamp"];

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedType !== "all") params.type = selectedType;

      const res = await api.get("/api/tenant/directory", { params });
      if (res.data?.success) {
        setInstitutions(res.data.institutions || []);
      }
    } catch (err) {
      console.error("[InstitutionDirectory] Error loading institutions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInstitutions();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedType]);

  const handleSelectInstitution = (inst) => {
    localStorage.setItem("skillio_active_tenant", inst.slug);
    navigate(`/institution/${inst.slug}`);
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f2efe9] border border-[#e8e5dc] text-xs font-semibold text-[#451a03]">
            <Building2 size={14} className="text-[#b45309]" />
            <span>Multi-Tenant Education Network</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1c1917] leading-tight">
            Find Your Institution
          </h1>
          <p className="text-sm sm:text-base text-[#57534e] max-w-2xl mx-auto leading-relaxed">
            Discover accredited academies, competitive coaching centers, and professional bootcamps powered by Skillio. Access courses, verified lectures, and curated notes.
          </p>

          {/* Search Bar */}
          <div className="pt-4 max-w-2xl mx-auto relative">
            <div className="relative flex items-center shadow-sm">
              <Search size={20} className="absolute left-4 text-[#78716c]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search academy, coaching center, or subject (e.g. Physics, Coding)..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#d6d3c9] rounded-xl text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-xs text-[#78716c] hover:text-[#1c1917] px-2 py-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Type Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedType === t
                    ? "bg-[#1e3a8a] text-white shadow-sm"
                    : "bg-white border border-[#e8e5dc] text-[#57534e] hover:bg-[#f2efe9]"
                }`}
              >
                {t === "all" ? "All Institutions" : t}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white border border-[#e8e5dc] rounded-2xl p-6 space-y-4 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#f2efe9]" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-[#f2efe9] rounded w-3/4" />
                    <div className="h-3 bg-[#f2efe9] rounded w-1/2" />
                  </div>
                </div>
                <div className="h-12 bg-[#f2efe9] rounded" />
                <div className="h-8 bg-[#f2efe9] rounded" />
              </div>
            ))}
          </div>
        ) : institutions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map((inst) => {
              const isCurrent = inst.slug === currentTenant?.slug;
              return (
                <div
                  key={inst.id}
                  className={`bg-white border rounded-2xl p-6 flex flex-col justify-between transition-all hover:shadow-md hover:border-[#1e3a8a]/40 ${
                    isCurrent ? "ring-2 ring-[#1e3a8a] border-transparent" : "border-[#e8e5dc]"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Logo + Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        {inst.logo ? (
                          <img
                            src={optimizeImage(inst.logo, 100)}
                            alt={inst.name}
                            className="w-12 h-12 rounded-xl object-contain border border-[#e8e5dc] p-1 bg-[#faf9f6]"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#1e3a8a] text-white font-bold text-lg flex items-center justify-center">
                            {inst.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h2 className="text-base font-bold text-[#1c1917] leading-tight">
                            {inst.name}
                          </h2>
                          <span className="text-xs font-mono text-[#78716c]">
                            {inst.slug}.mylms.com
                          </span>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Tag / Type */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#f2efe9] text-[#451a03] font-medium border border-[#e8e5dc]">
                        {inst.institutionType || "Academy"}
                      </span>
                      {inst.domainTags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-md bg-[#f8f7f4] text-[#57534e] border border-[#e8e5dc]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-[#57534e] line-clamp-2 leading-relaxed">
                      {inst.description || inst.title || "Quality education and learning resources."}
                    </p>
                  </div>

                  {/* Footer Meta + Button */}
                  <div className="pt-5 mt-4 border-t border-[#f2efe9] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-[#78716c]">
                      <BookOpen size={14} className="text-[#1e3a8a]" />
                      <span>{inst.courseCount || 0} Courses</span>
                    </div>

                    <button
                      onClick={() => handleSelectInstitution(inst)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isCurrent
                          ? "bg-[#f2efe9] text-[#1c1917] hover:bg-[#ebe7df]"
                          : "bg-[#1e3a8a] text-white hover:bg-[#172554] shadow-sm"
                      }`}
                    >
                      {isCurrent ? "Open Academy" : "View Institution"}
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto">
            <Building2 size={36} className="mx-auto text-[#a8a29e]" />
            <h3 className="text-base font-bold text-[#1c1917]">No institutions found</h3>
            <p className="text-xs sm:text-sm text-[#78716c]">
              We couldn't find any institutions matching "{searchQuery}". Try searching with a different keyword or reset filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedType("all");
              }}
              className="px-4 py-2 bg-[#1e3a8a] text-white text-xs font-semibold rounded-lg hover:bg-[#172554] cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Educator CTA Section */}
        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#172554] text-white rounded-3xl p-8 sm:p-12 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-amber-300">
              <Sparkles size={13} />
              <span>For Teachers, Coaches & Academies</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Want to launch your own branded Academy?
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Create an isolated organization in seconds. Configure custom branding, upload courses, manage video lectures, and publish notes & resources.
            </p>
          </div>

          <button
            onClick={() => navigate("/create-institution")}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#1e3a8a] font-bold text-xs sm:text-sm shadow-md hover:bg-amber-50 transition cursor-pointer shrink-0"
          >
            <PlusCircle size={16} />
            Create Your Institution
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default InstitutionDirectory;

