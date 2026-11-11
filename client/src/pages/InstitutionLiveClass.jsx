import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CircleDot, Radio } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SecureVideoPlayer from "../components/video/SecureVideoPlayer";
import { useTenant } from "../context/TenantContext";
import api from "../services/api";

export default function InstitutionLiveClass() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [liveClass, setLiveClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const accent = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(tenant?.primaryColor || "") ? tenant.primaryColor : "#5b3cc4";
  const tenantStyle = { "--institution-accent": accent };

  const loadCurrent = useCallback(async () => {
    try {
      const { data } = await api.get("/api/institution/live/current");
      setLiveClass(data?.liveClass || null);
      setMessage("");
    } catch (error) {
      setLiveClass(null);
      setMessage(error.response?.data?.message || "This institution’s live class is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCurrent(); }, [loadCurrent]);
  useEffect(() => {
    if (!liveClass?.isActive) return undefined;
    const timer = window.setInterval(loadCurrent, 20000);
    return () => window.clearInterval(timer);
  }, [liveClass?.isActive, loadCurrent]);

  const institutionPath = `/institution/${encodeURIComponent(slug || tenant?.slug || "")}`;

  return (
    <div className="institution-student-page min-h-screen text-[#1c1917]" style={tenantStyle}>
      <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 pb-24 sm:px-6 sm:py-6 md:pb-12">
        <Link to={institutionPath} className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#57534e] hover:bg-white hover:text-[#1c1917] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b3cc4]"><ArrowLeft size={15} aria-hidden="true" /> Back to institution</Link>
        {loading ? (
          <div role="status" className="grid aspect-video place-items-center rounded-2xl border border-[#e8e5dc] bg-white text-sm text-[#78716c]">Loading live class…</div>
        ) : liveClass ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2"><span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-rose-50 px-2.5 text-xs font-bold text-rose-700"><CircleDot size={13} aria-hidden="true" /> LIVE NOW</span><span className="text-xs text-[#78716c]">Hosted by {liveClass.createdBy?.name || "your educator"}</span></div>
            <SecureVideoPlayer liveClassId={liveClass._id} lectureTitle={liveClass.title} />
            <section className="rounded-xl border border-[#e8e5dc] bg-white p-4 sm:p-5" aria-labelledby="live-title">
              <h1 id="live-title" className="text-lg font-bold tracking-tight text-[#1c1917] sm:text-xl">{liveClass.title}</h1>
              {liveClass.description && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#57534e]">{liveClass.description}</p>}
            </section>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e8e5dc] bg-white px-5 py-10 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#f5f2ff] text-[#5b3cc4]"><Radio size={19} aria-hidden="true" /></span>
            <h1 className="mt-3 text-base font-bold text-[#1c1917]">No live class right now</h1>
            <p role="status" className="mt-1 text-sm text-[#78716c]">{message || "Check back when your educator starts a session."}</p>
            <button type="button" onClick={() => navigate(institutionPath)} className="mt-4 min-h-10 rounded-lg bg-[#5b3cc4] px-4 text-xs font-bold text-white hover:bg-[#4b2fa8]">Return to institution</button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
