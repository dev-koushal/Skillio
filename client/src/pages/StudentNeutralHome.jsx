import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Building2, Search, ArrowRight, Sparkles, School, CheckCircle2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import Button from "../components/common/Button";

export default function StudentNeutralHome() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchInstitutions = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/tenant/directory");
        if (isMounted && data.success && Array.isArray(data.institutions)) {
          setInstitutions(data.institutions);
        }
      } catch (err) {
        console.warn("[StudentNeutralHome] Failed to load directory:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInstitutions();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectInstitution = (slug) => {
    if (!slug) return;
    localStorage.setItem("skillio_active_tenant", slug);
    navigate(`/institution/${slug}`);
  };

  const studentName = userData?.name ? userData.name.split(" ")[0] : "Learner";

  const filteredInstitutions = institutions.filter((inst) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      inst.name?.toLowerCase().includes(q) ||
      inst.title?.toLowerCase().includes(q) ||
      inst.description?.toLowerCase().includes(q) ||
      inst.institutionType?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans selection:bg-[#1e3a8a] selection:text-white pb-20 md:pb-0">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] text-xs font-bold shadow-2xs mx-auto">
            <Sparkles size={14} className="text-[#1e3a8a]" />
            <span>Welcome, {studentName}</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black text-[#1c1917] tracking-tight leading-tight">
              Choose an institution to start learning.
            </h1>
            <p className="text-[#57534e] text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              Skillio connects you directly with accredited educators and dedicated academies. Select your institution to access its courses, curriculum, and lectures.
            </p>
          </div>

          {/* Primary Action Button */}
          {!showSelector ? (
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                type="button"
                onClick={() => setShowSelector(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer min-h-[48px]"
              >
                <Building2 size={18} />
                <span>Find Institution</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            /* Institution Picker */
            <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 text-left animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#f2efe9]">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#1c1917]">
                    Select Your Institution
                  </h2>
                  <p className="text-xs text-[#78716c]">
                    Choose an academy to enter its dedicated learning space
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSelector(false)}
                  className="text-xs text-[#78716c] hover:text-[#1c1917] font-semibold underline cursor-pointer"
                >
                  Hide
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by academy name or topic..."
                  className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition"
                  autoFocus
                />
              </div>

              {/* Institution List */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {loading ? (
                  <div className="py-8 text-center text-xs text-[#78716c]">
                    Loading institutions...
                  </div>
                ) : filteredInstitutions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#78716c]">
                    No institutions match your search.
                  </div>
                ) : (
                  filteredInstitutions.map((inst) => (
                    <button
                      key={inst._id || inst.slug}
                      type="button"
                      onClick={() => handleSelectInstitution(inst.slug)}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-[#e8e5dc] hover:border-[#1e3a8a] hover:bg-[#eff6ff]/60 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white border border-[#e8e5dc] flex items-center justify-center p-1.5 shrink-0 shadow-2xs">
                          <img
                            src={inst.logo || "/skillio.png"}
                            alt={inst.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.src = "/skillio.png";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1c1917] group-hover:text-[#1e3a8a] transition truncate">
                            {inst.name}
                          </p>
                          <p className="text-xs text-[#78716c] truncate">
                            {inst.institutionType || "Academy"} • {inst.title || "Curriculum & courses"}
                          </p>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 text-xs font-bold text-[#1e3a8a] group-hover:translate-x-0.5 transition-transform shrink-0 pl-2">
                        <span>Enter</span>
                        <ArrowRight size={14} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Verified guarantees */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[#78716c]">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={15} className="text-emerald-700" />
              <span>Independent Academies</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={15} className="text-emerald-700" />
              <span>Accredited Curriculum</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={15} className="text-emerald-700" />
              <span>Verified Video Lectures</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

