import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Loader2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import PageHeader from "../components/common/PageHeader";
import Navbar from "../components/Navbar";

export default function StudentNoteReader() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { userData } = useSelector((state) => state.user);

  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageImageUrl, setPageImageUrl] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");

  const activeSlug = slug || tenant?.slug;

  const initializeViewerSession = useCallback(async () => {
    try {
      setError("");
      const res = await api.post(`/api/notes/${id}/viewer-session`);
      if (!res.data?.success || !res.data.viewerSessionId) {
        throw new Error("Could not start the secure viewer.");
      }
      setSession(res.data);
      setTotalPages(Math.max(1, res.data.pageCount || 1));
      return true;
    } catch (err) {
      console.error("[Note Reader Init Error]", err);
      const msg = err.response?.data?.message || err.message || "You do not have access to view this note.";
      setError(msg);
      toast.error(msg);
      return false;
    }
  }, [id]);

  useEffect(() => {
    initializeViewerSession();
  }, [initializeViewerSession]);

  useEffect(() => () => {
    if (pageImageUrl) URL.revokeObjectURL(pageImageUrl);
  }, [pageImageUrl]);

  // 2. Fetch Page Representation as an authenticated Blob
  const loadPage = useCallback(
    async (page) => {
      if (!session?.viewerSessionId) return;
      try {
        setLoadingPage(true);
        setPageError("");
        const res = await api.get(`/api/notes/${id}/pages/${page}`, {
          responseType: "blob",
          headers: { "x-note-viewer-session": session.viewerSessionId },
        });

        if (res.data) {
          const blobUrl = URL.createObjectURL(res.data);
          setPageImageUrl(blobUrl);
        }
      } catch (err) {
        console.error("[Note Reader Page Error]", err);
        const message = err.response?.status === 401
          ? "Your secure reader session expired. Reconnecting…"
          : err.response?.status === 403
            ? "Your access to this note is no longer active."
            : "This page could not be loaded. Please try again.";
        setPageError(message);
        if (err.response?.status === 401) {
          setSession(null);
          await initializeViewerSession();
        }
      } finally {
        setLoadingPage(false);
      }
    },
    [id, session?.viewerSessionId, initializeViewerSession]
  );

  useEffect(() => {
    if (session) {
      loadPage(currentPage);
    }
  }, [session, currentPage, loadPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (currentPage < totalPages) setCurrentPage((p) => p + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (currentPage > 1) setCurrentPage((p) => p - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(200, z + 20));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(70, z - 20));
  const handleZoomReset = () => setZoomLevel(100);

  if (error) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl border border-[#e8e5dc] max-w-sm w-full space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Lock size={22} />
          </div>
          <h2 className="text-base font-bold text-[#1c1917]">Access Restricted</h2>
          <p className="text-xs text-[#78716c] leading-relaxed">{error}</p>
          <Link
            to={`/institution/${activeSlug}/notes/${id}`}
            className="inline-block w-full py-2.5 rounded-xl bg-[#5b3cc4] text-white text-xs font-semibold hover:bg-[#4a2eb0] transition"
          >
            Go to Note Details
          </Link>
        </div>
      </div>
    );
  }

  const watermarkText = session?.watermark || `${userData?.name || "Student"} • Skillio`;

  return (
    <div className="min-h-screen bg-[#1c1917] text-white flex flex-col select-none pb-20 md:pb-0">
      <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
      <header className="border-b border-[#292524] bg-[#1c1917] px-4 py-2 flex flex-wrap items-center justify-between gap-3 z-10">
        <PageHeader title="Secure Document Reader" onBack={() => navigate(`/institution/${activeSlug}/notes/${id}`)} />

      {/* Center: Page Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={handlePrevPage}
            className="p-1.5 rounded-lg text-[#d6d3d1] hover:text-white hover:bg-[#383532] disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-xs font-semibold px-2 py-1 rounded bg-[#383532] text-[#e7e5e4] whitespace-nowrap">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={handleNextPage}
            className="p-1.5 rounded-lg text-[#d6d3d1] hover:text-white hover:bg-[#383532] disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Right: Zoom controls */}
        <div className="hidden sm:flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-[#a8a29e] hover:text-white hover:bg-[#383532] transition"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          <button
            type="button"
            onClick={handleZoomReset}
            className="px-2 py-1 rounded text-[#a8a29e] hover:text-white hover:bg-[#383532] transition font-semibold"
            title="Reset Zoom"
          >
            {zoomLevel}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-[#a8a29e] hover:text-white hover:bg-[#383532] transition"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </header>

      {/* Main Canvas / Page Viewport */}
      <main className="flex-1 overflow-auto bg-[#141210] flex items-center justify-center p-2 sm:p-6 relative">
        {loadingPage ? (
          <div className="flex flex-col items-center justify-center gap-3 text-xs text-[#a8a29e] py-32">
            <Loader2 className="w-8 h-8 animate-spin text-[#5b3cc4]" />
            <span>Loading page {currentPage}...</span>
          </div>
        ) : pageError ? (
          <div className="max-w-sm text-center text-sm text-[#d6d3d1]" role="alert">
            <p>{pageError}</p>
            <button
              type="button"
              onClick={() => loadPage(currentPage)}
              className="mt-4 min-h-10 rounded-lg border border-white/20 px-4 font-semibold hover:bg-white/10"
            >
              Retry page
            </button>
          </div>
        ) : pageImageUrl ? (
          <div
            className="relative shadow-2xl transition-all duration-150 max-w-full flex items-center justify-center"
            style={{ width: `${zoomLevel}%`, maxWidth: zoomLevel === 100 ? "850px" : "1400px" }}
          >
            {/* The Document Page Image */}
            <img
              src={pageImageUrl}
              alt={`Page ${currentPage}`}
              className="w-full h-auto rounded-lg bg-white border border-[#2d2a27] pointer-events-none"
              onContextMenu={(e) => e.preventDefault()}
            />

            {/* Diagonal Watermark Overlay */}
            <div
              className="absolute inset-0 pointer-events-none flex flex-col justify-around items-center overflow-hidden opacity-[0.09]"
              aria-hidden="true"
            >
              <div className="rotate-[-25deg] text-xs sm:text-base font-bold text-black tracking-widest whitespace-nowrap">
                {watermarkText}
              </div>
              <div className="rotate-[-25deg] text-xs sm:text-base font-bold text-black tracking-widest whitespace-nowrap">
                {watermarkText}
              </div>
              <div className="rotate-[-25deg] text-xs sm:text-base font-bold text-black tracking-widest whitespace-nowrap">
                {watermarkText}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#a8a29e]" role="status">Preparing secure reader…</div>
        )}
      </main>

      {/* Mobile Floating Bottom Bar */}
      <footer className="sm:hidden h-12 bg-[#262422] border-t border-[#3b3835] px-4 flex items-center justify-between text-xs z-20">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={handlePrevPage}
          className="flex items-center gap-1 font-semibold disabled:opacity-30"
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>

        <span className="font-bold text-[#e7e5e4]">
          {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={handleNextPage}
          className="flex items-center gap-1 font-semibold disabled:opacity-30"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </footer>
    </div>
  );
}
