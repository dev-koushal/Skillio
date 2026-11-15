import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Plus, Search, Filter, FileText, Edit3, Trash2, Eye, ExternalLink, IndianRupee } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";
import { useTenant } from "../../context/TenantContext";
import { hasEducatorInstitution } from "../../auth/permissions";
import RequireInstitutionModal from "../../components/common/RequireInstitutionModal";
import NoteCover from "../../components/notes/NoteCover";
import Navbar from "../../components/Navbar";

export default function EducatorNotes() {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { userData } = useSelector((state) => state.user);

  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [summary, setSummary] = useState({ total: 0, published: 0, drafts: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [showReqModal, setShowReqModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const institutionAccent = tenant?.primaryColor || "#5b3cc4";

  const fetchNotes = async ({ quiet = false } = {}) => {
    try {
      if (!quiet) setLoading(true);
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set("search", search.trim());
      if (selectedTopic !== "All") queryParams.set("topic", selectedTopic);
      if (selectedStatus !== "all") queryParams.set("status", selectedStatus);
      if (selectedPrice !== "all") queryParams.set("accessType", selectedPrice);

      const [notesRes, topicsRes] = await Promise.all([
        api.get(`/api/notes/educator/list?${queryParams.toString()}`),
        api.get("/api/notes/topics"),
      ]);

      if (notesRes.data?.success) {
        setNotes(notesRes.data.notes || []);
        if (notesRes.data.summary) setSummary(notesRes.data.summary);
      }
      if (topicsRes.data?.success) {
        setTopics(topicsRes.data.topics || []);
      }
    } catch (err) {
      console.error("[EducatorNotes] Error:", err);
      toast.error(err.response?.data?.message || "Failed to load notes.");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [search, selectedTopic, selectedStatus, selectedPrice]);

  useEffect(() => {
    if (!notes.some((note) => note.processingStatus === "processing" || note.replacementProcessing)) return undefined;
    const timer = window.setInterval(() => fetchNotes({ quiet: true }), 5000);
    return () => window.clearInterval(timer);
  }, [notes, search, selectedTopic, selectedStatus, selectedPrice]);

  const handleCreateClick = () => {
    if (!hasEducatorInstitution(userData, tenant)) {
      setShowReqModal(true);
      return;
    }
    navigate("/educator/notes/create");
  };

  const handleDelete = async (noteId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this note? This will revoke access for students.")) {
      return;
    }

    try {
      setDeletingId(noteId);
      const res = await api.delete(`/api/notes/${noteId}`);
      if (res.data?.success) {
        toast.success("Note deleted successfully.");
        setNotes((prev) => prev.filter((n) => n._id !== noteId));
        setSummary((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete note.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c1917] pb-28 md:pb-12">
      <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
      {/* Header Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e8e5dc]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1c1917]">
              Notes
            </h1>
            <p className="text-xs sm:text-sm text-[#78716c] mt-1">
              Publish and sell study material directly to your students.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreateClick}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5b3cc4] hover:bg-[#4a2eb0] text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Create Note</span>
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#78716c]" aria-label="Notes summary">
          <span><strong className="text-[#1c1917]">{summary.published}</strong> published</span>
          <span><strong className="text-[#1c1917]">{summary.drafts}</strong> drafts</span>
          <span><strong className="text-[#1c1917]">{summary.total}</strong> total</span>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-[#e8e5dc] shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] w-4 h-4" />
            <input
              type="text"
              placeholder="Search notes by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#fcfbf9] border border-[#e8e5dc] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#5b3cc4]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Topic Filter */}
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="bg-[#fcfbf9] border border-[#e8e5dc] rounded-xl px-3 py-2 text-xs font-semibold text-[#44403c] focus:outline-none focus:border-[#5b3cc4] cursor-pointer"
            >
              <option value="All">All Topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#fcfbf9] border border-[#e8e5dc] rounded-xl px-3 py-2 text-xs font-semibold text-[#44403c] focus:outline-none focus:border-[#5b3cc4] cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="disabled">Disabled</option>
              <option value="processing">Processing</option>
            </select>

            {/* Price Filter */}
            <select
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="bg-[#fcfbf9] border border-[#e8e5dc] rounded-xl px-3 py-2 text-xs font-semibold text-[#44403c] focus:outline-none focus:border-[#5b3cc4] cursor-pointer"
            >
              <option value="all">All Prices</option>
              <option value="paid">Paid</option>
              <option value="free">Free</option>
            </select>
          </div>
        </div>

        {/* Content Section */}
        <div className="mt-8">
          {loading ? (
            <div className="py-20 text-center text-xs text-[#78716c]">
              Loading notes catalog...
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-white border border-[#e8e5dc] rounded-2xl p-10 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#f5f3ff] text-[#5b3cc4] flex items-center justify-center mx-auto mb-3">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-bold text-[#1c1917]">No notes found</h3>
              <p className="text-xs text-[#78716c] mt-1.5 mb-5 max-w-sm mx-auto">
                {search || selectedTopic !== "All"
                  ? "No notes matched your filters. Try clearing your search query."
                  : "You haven't created any study notes yet. Upload your first PDF to sell or distribute to students."}
              </p>
              <button
                type="button"
                onClick={handleCreateClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5b3cc4] hover:bg-[#4a2eb0] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus size={15} />
                <span>Create Your First Note</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="group bg-white border border-[#e8e5dc] hover:border-[#d6d3c9] rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition flex flex-col justify-between h-full"
                >
                  <div className="p-3.5 flex flex-col flex-1">
                    {/* Note Cover */}
                    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-[#f8f7f4] shrink-0">
                      <NoteCover
                        thumbnail={note.thumbnail}
                        title={note.title}
                        topic={note.topic}
                        pageCount={note.pageCount}
                        accentColor={institutionAccent}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Note Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5b3cc4]">
                          {note.topic}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            note.processingStatus === "processing" || note.replacementProcessing
                              ? "bg-sky-50 text-sky-800 border border-sky-200"
                              : note.status === "published"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : note.status === "disabled"
                                ? "bg-stone-100 text-stone-700 border border-stone-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {note.replacementProcessing
                            ? "Processing replacement"
                            : note.processingStatus === "processing"
                              ? "Processing PDF"
                              : note.status === "published"
                                ? "Published"
                                : note.status === "disabled"
                                  ? "Disabled"
                                  : note.processingStatus === "failed"
                                    ? "Upload failed"
                                    : "Draft"}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#1c1917] line-clamp-2 leading-snug">
                        {note.title}
                      </h3>

                      <p className="text-[11px] text-[#78716c]">
                        {note.pageCount > 0 ? `${note.pageCount} pages` : "PDF document"}
                        {note.relatedCourseId?.title ? ` • ${note.relatedCourseId.title}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom / Actions */}
                  <div className="px-3.5 py-3 border-t border-[#f1ede4] bg-[#fcfbf9] flex items-center justify-between">
                    <div>
                      {note.accessType === "free" ? (
                        <span className="text-xs font-extrabold text-emerald-700">FREE</span>
                      ) : (
                        <span className="text-sm font-extrabold text-[#1c1917]">
                          ₹{note.price}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(note._id, e)}
                        disabled={deletingId === note._id}
                        className="p-1.5 rounded-lg text-[#78716c] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>

                      <Link
                        to={`/educator/notes/${note._id}/edit`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#d6d3c9] text-xs font-semibold text-[#1c1917] hover:bg-[#f5f3ff] hover:text-[#5b3cc4] hover:border-[#5b3cc4] transition shadow-2xs"
                      >
                        <span>Edit</span>
                        <Edit3 size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RequireInstitutionModal
        isOpen={showReqModal}
        onClose={() => setShowReqModal(false)}
      />
    </div>
  );
}
