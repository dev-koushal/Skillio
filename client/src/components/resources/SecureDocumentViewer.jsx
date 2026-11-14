import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X, ZoomIn, ZoomOut, Maximize2, RotateCcw, ShieldCheck } from "lucide-react";
import api from "../../services/api";
import "./SecureDocumentViewer.css";

export default function SecureDocumentViewer({ resource, user, tenantName, onClose }) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [src, setSrc] = useState("");
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const imageUrl = useRef("");
  const pageCount = Number(resource.pageCount) || 1;

  const loadPage = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await api.get(`/api/resource/${resource._id}/pages/${page}`, { responseType: "blob", headers: { Accept: "image/jpeg" } });
      const objectUrl = URL.createObjectURL(response.data);
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
      imageUrl.current = objectUrl;
      setSrc(objectUrl);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [resource._id, page, attempt]);

  useEffect(() => { loadPage(); }, [loadPage]);
  useEffect(() => () => { if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); }, []);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") event.preventDefault();
      if (event.key === "ArrowRight") setPage((current) => Math.min(pageCount, current + 1));
      if (event.key === "ArrowLeft") setPage((current) => Math.max(1, current - 1));
    };
    const onPrint = (event) => event.preventDefault();
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeprint", onPrint);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeprint", onPrint); };
  }, [onClose, pageCount]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#15191c] text-white" role="dialog" aria-modal="true" aria-label={`Secure notes: ${resource.title}`} onContextMenu={(event) => event.preventDefault()}>
      <header className="flex min-h-14 items-center justify-between gap-2 border-b border-white/10 bg-[#1c2226] px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#2a3537] text-[#9bd0bd]"><ShieldCheck size={17} /></span>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{resource.title}</p><p className="text-[10px] text-white/50">Secure course notes</p></div>
        </div>
        <button onClick={onClose} aria-label="Close viewer" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/70 hover:bg-white/10"><X size={19} /></button>
      </header>
      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#252b2f] p-2 sm:p-6" onContextMenu={(event) => event.preventDefault()}>
        {status === "loading" && <div role="status" className="absolute z-10 rounded-2xl border border-white/10 bg-[#1c2226] px-5 py-3 text-sm text-white/75">Loading page {page}…</div>}
        {status === "error" && <div className="relative z-10 max-w-xs rounded-2xl border border-white/10 bg-[#1c2226] p-5 text-center"><p className="text-sm font-semibold">This page didn’t load</p><p className="mt-1 text-xs text-white/55">Check your connection and try again.</p><button onClick={() => setAttempt((n) => n + 1)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#d8eee5] px-4 text-sm font-semibold text-[#17372e]"><RotateCcw size={15} /> Retry</button></div>}
        {src && <div className="relative my-auto select-none" style={{ width: `${82 * zoom}%`, maxWidth: "none" }} onContextMenu={(event) => event.preventDefault()}><img src={src} alt={`Page ${page} of ${pageCount}`} draggable="false" onLoad={() => setStatus("ready")} className="block h-auto max-h-[calc(100dvh-150px)] w-full object-contain shadow-[0_16px_65px_rgba(0,0,0,.38)]" style={{ visibility: status === "loading" ? "hidden" : "visible" }} /><div aria-hidden="true" className="pointer-events-none absolute inset-0 grid select-none place-items-center overflow-hidden"><div className="secure-document-watermark max-w-full whitespace-nowrap px-6 text-center text-[clamp(11px,2vw,17px)] font-semibold tracking-[0.16em] text-[#17372e]/[0.24]">{user?.email || user?.name || "Skillio learner"} · {tenantName || "Skillio"} · PERSONAL USE</div></div></div>}
      </main>
      <footer className="flex min-h-16 items-center justify-between gap-2 border-t border-white/10 bg-[#1c2226] px-3 sm:px-5">
        <div className="flex items-center gap-1.5"><button disabled={page <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))} aria-label="Previous page" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/10 disabled:opacity-30"><ArrowLeft size={18} /></button><span className="min-w-[76px] text-center text-xs tabular-nums text-white/75">{page} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((n) => Math.min(pageCount, n + 1))} aria-label="Next page" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/10 disabled:opacity-30"><ArrowRight size={18} /></button></div>
        <div className="flex items-center gap-1.5"><button onClick={() => setZoom((n) => Math.max(0.65, n - 0.15))} aria-label="Zoom out" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/10"><ZoomOut size={17} /></button><button onClick={() => setZoom(1)} aria-label="Fit width" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/10"><Maximize2 size={16} /></button><button onClick={() => setZoom((n) => Math.min(1.5, n + 0.15))} aria-label="Zoom in" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/10"><ZoomIn size={17} /></button></div>
      </footer>
    </div>
  );
}
