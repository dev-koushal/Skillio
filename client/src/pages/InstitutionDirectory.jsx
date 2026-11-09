import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, BookOpen, ArrowRight, Sparkles, PlusCircle } from "lucide-react";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import InstitutionCard from "../components/common/InstitutionCard";
import { InstitutionCardSkeleton } from "../components/common/Skeleton";
import EmptyState from "../components/common/EmptyState";

function InstitutionDirectory() {
  const navigate = useNavigate();
  const { tenant: currentTenant } = useTenant();

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

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans selection:bg-[#1e3a8a] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 pb-28 md:pb-12">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f2efe9] border border-[#e8e5dc] text-xs font-bold text-[#451a03]">
            <Building2 size={13} className="text-[#b45309]" />
            <span>Multi-Tenant Education Network</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1c1917] leading-tight">
            Find Your Institution
          </h1>

          <p className="text-xs sm:text-base text-[#57534e] max-w-2xl mx-auto leading-relaxed font-normal">
            Discover accredited academies, competitive coaching centers, and professional bootcamps powered by Skillio. Access courses, verified lectures, and curated notes.
          </p>

          {/* Search Bar */}
          <div className="pt-3 max-w-xl mx-auto relative">
            <div className="relative flex items-center shadow-xs">
              <Search size={18} className="absolute left-4 text-[#78716c]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search academy, teacher or subject (e.g. Physics, Coding)..."
                className="w-full pl-11 pr-14 py-3 bg-white border border-[#d6d3c9] rounded-xl text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-xs text-[#78716c] hover:text-[#1c1917] px-2 py-1 font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Type Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer pressable ${
                  selectedType === t
                    ? "bg-[#1e3a8a] text-white shadow-2xs"
                    : "bg-white border border-[#e8e5dc] text-[#57534e] hover:bg-[#f2efe9]"
                }`}
              >
                {t === "all" ? "All Academies" : t}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <InstitutionCardSkeleton key={n} />
            ))}
          </div>
        ) : institutions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {institutions.map((inst) => (
              <InstitutionCard key={inst.id || inst.slug} institution={inst} />
            ))}
          </div>
        ) : (
          <EmptyState
            type="search"
            title="No institutions found"
            description="We couldn't find any learning institutions matching your criteria. Try adjusting your search query or view all academies."
            actionLabel="Reset Search"
            onAction={() => {
              setSearchQuery("");
              setSelectedType("all");
            }}
          />
        )}

        {/* Bottom Banner for Educators */}
        <div className="rounded-2xl border border-[#e8e5dc] bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-extrabold text-base sm:text-lg text-[#1c1917]">
              Are you an educator or academy founder?
            </h3>
            <p className="text-xs sm:text-sm text-[#78716c]">
              Launch your own private white-labeled academy with custom courses, video streaming, and notes in under 5 minutes.
            </p>
          </div>
          <button
            onClick={() => navigate("/create-institution")}
            className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-xs transition pressable shrink-0 cursor-pointer touch-target"
          >
            <PlusCircle size={16} />
            <span>Create New Academy</span>
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default InstitutionDirectory;
