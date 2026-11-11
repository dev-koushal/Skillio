import React, { useCallback, useEffect, useState } from "react";
import { CircleDot, Link2, LoaderCircle, Plus, Radio, Trash2, X } from "lucide-react";
import api from "../../services/api";
import { toast } from "react-toastify";

export default function EducatorLiveClassPanel() {
  const [liveClasses, setLiveClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [youtubeLiveUrl, setYoutubeLiveUrl] = useState("");

  const loadLiveClasses = useCallback(async () => {
    try {
      const { data } = await api.get("/api/institution/live");
      setLiveClasses(Array.isArray(data?.liveClasses) ? data.liveClasses : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load live classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveClasses();
    const timer = window.setInterval(loadLiveClasses, 20_000);
    return () => window.clearInterval(timer);
  }, [loadLiveClasses]);

  const resetForm = () => {
    setFormOpen(false);
    setYoutubeLiveUrl("");
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (!youtubeLiveUrl.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/institution/live", { youtubeLiveUrl: youtubeLiveUrl.trim() });
      toast.success("Link saved. Show it to students when your broadcast starts.");
      resetForm();
      await loadLiveClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Enter a supported YouTube Live link.");
    } finally {
      setSaving(false);
    }
  };

  const setLiveState = async (item, action) => {
    setActionId(item._id);
    try {
      if (action === "activate") {
        await api.post(`/api/institution/live/${item._id}/activate`);
        toast.success("Live alert is now visible to your students.");
      } else {
        await api.delete(`/api/institution/live/${item._id}`);
        toast.success(item.isActive ? "Live alert ended and removed from students' home." : "Live link removed.");
      }
      await loadLiveClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update this live link.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="educator-live-panel rounded-2xl border border-[#e8e5dc] bg-white p-4 shadow-xs sm:p-5" aria-labelledby="educator-live-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff1f2] text-rose-600"><Radio size={17} aria-hidden="true" /></span>
          <div>
            <h2 id="educator-live-title" className="text-sm font-bold text-[#1c1917]">Live on YouTube</h2>
            <p className="text-xs text-[#78716c]">Add a broadcast link, then control when students see it.</p>
          </div>
        </div>
        {!formOpen && (
          <button type="button" onClick={() => setFormOpen(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#5b3cc4] px-3 text-xs font-bold text-white transition hover:bg-[#4b2fa8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b3cc4]">
            <Plus size={14} aria-hidden="true" /> Add live link
          </button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={submitForm} className="mt-4 rounded-xl border border-[#eeeae3] bg-[#faf9f6] p-3.5 sm:p-4" aria-label="Add a YouTube live link">
          <label htmlFor="live-youtube-url" className="mb-1.5 block text-xs font-semibold text-[#44403c]">YouTube Live URL</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Link2 size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]" />
              <input id="live-youtube-url" name="youtubeLiveUrl" type="url" inputMode="url" autoComplete="off" spellCheck={false} required value={youtubeLiveUrl} onChange={(event) => setYoutubeLiveUrl(event.target.value)} placeholder="https://youtube.com/live/…" className="min-h-11 w-full rounded-lg border border-[#d6d3c9] bg-white pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#5b3cc4]" />
            </div>
            <button type="submit" disabled={saving || !youtubeLiveUrl.trim()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#5b3cc4] px-4 text-xs font-bold text-white hover:bg-[#4b2fa8] disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Radio size={14} aria-hidden="true" />}
              {saving ? "Saving…" : "Save live link"}
            </button>
            <button type="button" onClick={resetForm} aria-label="Cancel" className="grid min-h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#d6d3c9] bg-white text-[#57534e] hover:bg-[#f2efe9]"><X size={16} aria-hidden="true" /></button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#78716c]">No title or schedule needed. Add the link, then make it visible when the broadcast begins.</p>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {loading ? <p className="text-xs text-[#78716c]">Checking YouTube links…</p> : liveClasses.length === 0 ? (
          <p className="rounded-xl bg-[#faf9f6] px-3 py-3 text-xs text-[#78716c]">No live links added yet.</p>
        ) : liveClasses.map((item) => (
          <article key={item._id} className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${item.isActive ? "border-rose-200 bg-rose-50/60" : "border-[#eeeae3] bg-[#faf9f6]"}`}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="max-w-full truncate text-sm font-semibold text-[#1c1917]">{item.title || "YouTube Live"}</h3>
                <span className={`inline-flex min-h-6 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${item.isActive ? "bg-rose-600 text-white" : "bg-white text-[#57534e]"}`}>
                  {item.isActive ? <><CircleDot size={10} aria-hidden="true" /> LIVE NOW</> : "WAITING TO GO LIVE"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#78716c]">{item.isActive ? "The video is visible on your students' institution home." : "This link is hidden from students until you make it live."}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
              {!item.isActive && <button type="button" disabled={actionId === item._id} onClick={() => setLiveState(item, "activate")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"><Radio size={13} aria-hidden="true" /> Show to students</button>}
              <button type="button" disabled={actionId === item._id} onClick={() => setLiveState(item, "remove")} aria-label={item.isActive ? "End live class and remove alert" : "Remove waiting live link"} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#d6d3c9] bg-white px-3 text-xs font-semibold text-[#57534e] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"><Trash2 size={13} aria-hidden="true" />{item.isActive ? "End & remove alert" : "Remove link"}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
