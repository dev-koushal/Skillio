import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search, FileText, CheckCircle, ArrowRight, BookOpen } from "lucide-react";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import NoteCover from "../components/notes/NoteCover";
import Navbar from "../components/Navbar";

export default function StudentNotes() {
  const { slug } = useParams();
  const { tenant } = useTenant();
  const { userData } = useSelector((state) => state.user);

  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("All");

  const institutionAccent = tenant?.primaryColor || "#5b3cc4";
  const activeSlug = slug || tenant?.slug;

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

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c1917] pb-28 md:pb-12">
      <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
      {/* Header Banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#e8e5dc] text-[11px] font-bold text-[#5b3cc4] shadow-2xs mb-3">
            <BookOpen size={13} />
            <span>Digital Study Material</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1c1917]">
            Study Notes
          </h1>
          <p className="text-xs sm:text-sm text-[#78716c] mt-1.5">
            Explore study material published by your institution.
          </p>
        </div>

        {/* Search & Topic Filter Section */}
        <div className="bg-white p-4 rounded-2xl border border-[#e8e5dc] shadow-xs space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
            <input
              type="text"
              placeholder="Search notes by subject, keywords, topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#fcfbf9] border border-[#e8e5dc] rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#5b3cc4]"
            />
          </div>

          {/* Topic Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedTopic("All")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                selectedTopic === "All"
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
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedTopic === t
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
        <div className="mt-8">
          {loading ? (
            <div className="py-20 text-center text-xs text-[#78716c]">
              Loading study notes...
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-10 text-center max-w-md mx-auto">
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {notes.map((note) => {
                const noteDetailUrl = `/institution/${activeSlug}/notes/${note._id}`;
                const noteReadUrl = `/institution/${activeSlug}/notes/${note._id}/read`;

                return (
                  <Link
                    key={note._id}
                    to={note.isPurchased ? noteReadUrl : noteDetailUrl}
                    className="group bg-white border border-[#e8e5dc] hover:border-[#5b3cc4] rounded-2xl overflow-hidden shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between h-full"
                  >
                    <div className="p-3.5 flex flex-col flex-1">
                      {/* Document Cover */}
                      <div className="w-full aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-[#f8f7f4] shrink-0">
                        <NoteCover
                          thumbnail={note.thumbnail}
                          title={note.title}
                          topic={note.topic}
                          pageCount={note.pageCount}
                          accentColor={institutionAccent}
                          className="w-full h-full object-cover group-hover:scale-103 transition duration-200"
                        />
                      </div>

                      {/* Meta */}
                      <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5b3cc4] block truncate">
                            {note.topic || "General"}
                          </span>
                          <h3 className="text-sm font-bold text-[#1c1917] group-hover:text-[#5b3cc4] transition-colors line-clamp-2 leading-snug mt-0.5">
                            {note.title}
                          </h3>
                        </div>
                        <p className="text-[11px] text-[#78716c] pt-1">
                          {note.pageCount > 0 ? `${note.pageCount} pages` : "Study Material"}
                          {note.relatedCourseId?.title ? ` • ${note.relatedCourseId.title}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Footer / CTA */}
                    <div className="px-3.5 py-3 border-t border-[#f1ede4] bg-[#fcfbf9] flex items-center justify-between">
                      <div>
                        {note.isPurchased ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle size={13} />
                            <span>Purchased</span>
                          </span>
                        ) : note.accessType === "free" ? (
                          <span className="text-xs font-extrabold text-emerald-700">FREE</span>
                        ) : (
                          <span className="text-sm font-extrabold text-[#1c1917]">
                            ₹{note.price}
                          </span>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5b3cc4] group-hover:translate-x-0.5 transition-transform">
                        <span>{note.isPurchased ? "Read Notes" : "View"}</span>
                        <ArrowRight size={13} />
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
