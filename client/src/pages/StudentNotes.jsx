import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search, FileText, CheckCircle, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import NoteCover from "../components/notes/NoteCover";
import Navbar from "../components/Navbar";

export default function StudentNotes() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant } = useTenant();
  const { userData } = useSelector((state) => state.user);

  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("All");

  const filterParam = searchParams.get("filter");
  const [activeTab, setActiveTab] = useState(filterParam === "purchased" ? "purchased" : "all");

  const institutionAccent = tenant?.primaryColor || "#5b3cc4";
  const activeSlug = slug || tenant?.slug;

  useEffect(() => {
    const currentFilter = searchParams.get("filter");
    if (currentFilter === "purchased") {
      setActiveTab("purchased");
    } else if (currentFilter === "all" || !currentFilter) {
      setActiveTab("all");
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "purchased") {
      setSearchParams({ filter: "purchased" });
    } else {
      setSearchParams({});
    }
  };

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (search.trim()) queryParams.set("search", search.trim());
        if (selectedTopic !== "All") queryParams.set("topic", selectedTopic);

        const [notesRes, topicsRes] = await Promise.all([
          api.get(`/api/notes/student?${queryParams.toString()}`),
          api.get("/api/notes/topics"),
        ]);

        if (notesRes.data?.success) {
          setNotes(notesRes.data.notes || []);
        }
        if (topicsRes.data?.success) {
          setTopics(topicsRes.data.topics || []);
        }
      } catch (err) {
        console.warn("[StudentNotes] Load error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [search, selectedTopic]);

  const purchasedCount = useMemo(() => {
    return notes.filter((n) => Boolean(n.isPurchased)).length;
  }, [notes]);

  const displayedNotes = useMemo(() => {
    if (activeTab === "purchased") {
      return notes.filter((n) => Boolean(n.isPurchased));
    }
    return notes;
  }, [notes, activeTab]);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c1917] pb-28 md:pb-12">
      <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
      {/* Header Banner */}
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-5 sm:pt-10">
        <div className="text-center max-w-xl mx-auto mb-5 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#e8e5dc] text-[11px] font-bold text-[#5b3cc4] shadow-2xs mb-2.5 sm:mb-3">
            <BookOpen size={13} />
            <span>Digital Study Material</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#1c1917]">
            Study Notes
          </h1>
          <p className="text-xs sm:text-sm text-[#78716c] mt-1">
            Explore study material published by your institution.
          </p>
        </div>

        {/* Section Tabs: All Institution Notes vs Your Paid Notes */}
        <div className="grid grid-cols-2 p-1 bg-[#ede9e1] rounded-2xl text-xs font-bold gap-1 mb-3.5 shadow-2xs">
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-[#1c1917] shadow-xs font-extrabold"
                : "text-[#57534e] hover:text-[#1c1917]"
            }`}
          >
            <BookOpen size={14} className={activeTab === "all" ? "text-[#5b3cc4]" : ""} />
            <span>All Institution Notes</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "all" ? "bg-[#f5f3ff] text-[#5b3cc4] border border-[#ede9fe]" : "bg-black/5 text-[#78716c]"
            }`}>
              {notes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("purchased")}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "purchased"
                ? "bg-white text-[#1c1917] shadow-xs font-extrabold"
                : "text-[#57534e] hover:text-[#1c1917]"
            }`}
          >
            <CheckCircle2 size={14} className={activeTab === "purchased" ? "text-emerald-600" : ""} />
            <span>Your Paid Notes</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "purchased" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-black/5 text-[#78716c]"
            }`}>
              {purchasedCount}
            </span>
          </button>
        </div>

        {/* Search & Topic Filter Section */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#e8e5dc] shadow-xs space-y-2.5 sm:space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search notes by subject, keywords, topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#fcfbf9] border border-[#e8e5dc] rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#5b3cc4] transition-colors"
            />
          </div>

          {/* Topic Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs snap-x">
            <button
              type="button"
              onClick={() => setSelectedTopic("All")}
              className={`snap-start px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${selectedTopic === "All"
                  ? "bg-[#5b3cc4] text-white shadow-2xs"
                  : "bg-[#f8f7f4] text-[#57534e] hover:bg-[#ede9e1]"
                }`}
            >
              All Topics
            </button>
            {topics.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTopic(t)}
                className={`snap-start px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${selectedTopic === t
                    ? "bg-[#5b3cc4] text-white shadow-2xs"
                    : "bg-[#f8f7f4] text-[#57534e] hover:bg-[#ede9e1]"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="mt-5 sm:mt-8">
          {loading ? (
            <div className="py-20 text-center text-xs text-[#78716c]">
              Loading study notes...
            </div>
          ) : displayedNotes.length === 0 ? (
            activeTab === "purchased" ? (
              <div className="bg-white border border-[#e8e5dc] rounded-2xl p-8 sm:p-10 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-base font-bold text-[#1c1917]">No paid notes yet</h3>
                <p className="text-xs text-[#78716c] mt-1.5">
                  You haven't unlocked any notes yet. Browse the institution catalog to unlock study material.
                </p>
                <button
                  type="button"
                  onClick={() => handleTabChange("all")}
                  className="mt-4 px-4 py-2 bg-[#5b3cc4] text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-[#4c31a7] transition cursor-pointer"
                >
                  Browse All Notes
                </button>
              </div>
            ) : (
              <div className="bg-white border border-[#e8e5dc] rounded-2xl p-8 sm:p-10 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#f5f3ff] text-[#5b3cc4] flex items-center justify-center mx-auto mb-3">
                  <FileText size={24} />
                </div>
                <h3 className="text-base font-bold text-[#1c1917]">No study notes found</h3>
                <p className="text-xs text-[#78716c] mt-1.5">
                  {search || selectedTopic !== "All"
                    ? "No notes matched your search criteria."
                    : "There are currently no study notes published in this institution catalog."}
                </p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 items-stretch">
              {displayedNotes.map((note) => {
                const noteDetailUrl = `/institution/${activeSlug}/notes/${note._id}`;
                const noteReadUrl = `/institution/${activeSlug}/notes/${note._id}/read`;

                return (
                  <Link
                    key={note._id}
                    to={note.isPurchased ? noteReadUrl : noteDetailUrl}
                    className="group bg-white border border-[#e8e5dc] hover:border-[#5b3cc4] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs hover:shadow-md sm:hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col justify-between h-full"
                  >
                    <div className="p-2.5 sm:p-3.5 flex flex-col flex-1">
                      {/* Document Cover */}
                      <div className="w-full aspect-[16/10] rounded-lg sm:rounded-xl overflow-hidden mb-2.5 sm:mb-3 bg-[#f8f7f4] shrink-0 relative">
                        <NoteCover
                          thumbnail={note.thumbnail}
                          title={note.title}
                          topic={note.topic}
                          pageCount={note.pageCount}
                          accentColor={institutionAccent}
                          className="w-full h-full object-cover group-hover:scale-103 transition duration-200"
                        />
                      </div>

                      {/* Meta - Strictly uniform heights across all cards */}
                      <div className="flex flex-col flex-1 justify-between">
                        <div>
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#5b3cc4] block truncate">
                            {note.topic || "General"}
                          </span>
                          <h3
                            title={note.title}
                            className="text-xs sm:text-sm font-bold text-[#1c1917] group-hover:text-[#5b3cc4] transition-colors line-clamp-2 leading-snug mt-0.5 min-h-[2.75em]"
                          >
                            {note.title}
                          </h3>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-[#78716c] pt-1.5 truncate">
                          {note.pageCount > 0 ? `${note.pageCount} pages` : "Study Material"}
                          {note.relatedCourseId?.title ? ` • ${note.relatedCourseId.title}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Footer / CTA - Fixed uniform height */}
                    <div className="px-2.5 sm:px-3.5 py-2 sm:py-3 border-t border-[#f1ede4] bg-[#fcfbf9] flex items-center justify-between gap-1 shrink-0 min-h-[38px] sm:min-h-[44px]">
                      <div className="truncate">
                        {note.isPurchased ? (
                          <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-700">
                            <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            <span className="truncate">Purchased</span>
                          </span>
                        ) : note.accessType === "free" ? (
                          <span className="text-[11px] sm:text-xs font-extrabold text-emerald-700">
                            FREE
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm font-extrabold text-[#1c1917]">
                            ₹{note.price}
                          </span>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-semibold text-[#5b3cc4] group-hover:translate-x-0.5 transition-transform shrink-0">
                        <span>{note.isPurchased ? "Read" : "View"}</span>
                        <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}