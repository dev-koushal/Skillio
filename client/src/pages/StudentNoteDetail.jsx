import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  BookOpen,
  Lock,
  Play,
  IndianRupee,
  Share2,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { useTenant } from "../context/TenantContext";
import NoteCover from "../components/notes/NoteCover";
import Navbar from "../components/Navbar";

export default function StudentNoteDetail() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { userData } = useSelector((state) => state.user);

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const institutionAccent = tenant?.primaryColor || "#5b3cc4";
  const activeSlug = slug || tenant?.slug;

  const fetchNoteDetails = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/notes/${id}`);
      if (data?.success && data.note) {
        setNote(data.note);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load note details.");
      navigate(`/institution/${activeSlug}/notes`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNoteDetails();
  }, [id, activeSlug]);

  const handleBuyNote = async () => {
    if (!userData) {
      toast.info("Please sign in to purchase study material.");
      navigate(`/login?returnUrl=/institution/${activeSlug}/notes/${id}`);
      return;
    }

    try {
      setBuying(true);

      // 1. If note is free, claim directly
      if (note.accessType === "free" || Number(note.price) === 0) {
        const { data } = await api.post(`/api/notes/${id}/claim-free`);
        if (data?.success) {
          toast.success("Study note unlocked!");
          setNote((prev) => ({ ...prev, isPurchased: true }));
          navigate(`/institution/${activeSlug}/notes/${id}/read`);
        }
        return;
      }

      // 2. Paid note: Create Razorpay order
      const orderRes = await api.post(`/api/notes/${id}/order`);
      const order = orderRes.data;

      if (!order?.id || !order?.key) {
        toast.error("Could not initiate order. Please try again.");
        return;
      }

      // Check if Razorpay SDK is loaded
      if (typeof window.Razorpay === "undefined") {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: tenant?.name || "Skillio",
        description: note.title,
        order_id: order.id,
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/api/notes/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data?.success) {
              toast.success("Payment successful! Access granted.");
              setNote((prev) => ({ ...prev, isPurchased: true }));
              navigate(`/institution/${activeSlug}/notes/${id}/read`);
            }
          } catch (vErr) {
            toast.error(vErr.response?.data?.message || "Payment verification failed.");
          }
        },
        prefill: {
          name: userData?.name || "",
          email: userData?.email || "",
          contact: userData?.phoneNumber || "",
        },
        theme: {
          color: institutionAccent,
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err) {
      console.error("[StudentNoteDetail Buy Error]", err);
      toast.error(err.response?.data?.message || "Could not complete purchase.");
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col text-xs text-[#78716c]">
        <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
        <div className="flex-1 flex items-center justify-center">Loading note details...</div>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c1917] pb-28 md:pb-12">
      <Navbar currentInstitution={tenant?.isPlatform ? null : tenant} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Back Link */}
        <Link
          to={`/institution/${activeSlug}/notes`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#78716c] hover:text-[#1c1917] mb-6 transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Notes Catalog</span>
        </Link>

        {/* Main Product Card */}
        <div className="bg-white rounded-3xl border border-[#e8e5dc] p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Cover Column */}
            <div className="md:col-span-5 max-w-xs mx-auto w-full">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-xs border border-[#e8e5dc]">
                <NoteCover
                  thumbnail={note.thumbnail}
                  title={note.title}
                  topic={note.topic}
                  pageCount={note.pageCount}
                  accentColor={institutionAccent}
                  className="w-full h-full"
                />
              </div>

              {/* Document Specs */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-[#faf8f5] p-2.5 rounded-xl border border-[#e8e5dc]">
                  <p className="text-[10px] text-[#78716c] uppercase font-bold">Length</p>
                  <p className="font-extrabold text-[#1c1917] mt-0.5">
                    {note.pageCount > 0 ? `${note.pageCount} pages` : "Document"}
                  </p>
                </div>
                <div className="bg-[#faf8f5] p-2.5 rounded-xl border border-[#e8e5dc]">
                  <p className="text-[10px] text-[#78716c] uppercase font-bold">Format</p>
                  <p className="font-extrabold text-[#1c1917] mt-0.5">Secure PDF</p>
                </div>
              </div>
            </div>

            {/* Info & Purchase Column */}
            <div className="md:col-span-7 space-y-6">
              <div>
                <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-[#5b3cc4] bg-[#f5f3ff] mb-2.5">
                  {note.topic}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1c1917] leading-tight">
                  {note.title}
                </h1>
                <p className="text-xs text-[#78716c] mt-1">
                  Published by {tenant?.name || "Institution"}
                </p>
              </div>

              {/* Description */}
              {note.description && (
                <div className="prose prose-sm text-[#44403c] text-xs sm:text-sm leading-relaxed">
                  <p>{note.description}</p>
                </div>
              )}

              {/* Price & Action Box */}
              <div className="p-5 rounded-2xl bg-[#faf8f5] border border-[#e8e5dc] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-[#78716c] uppercase tracking-wider">
                      Access Type
                    </p>
                    <div className="mt-0.5">
                      {note.isPurchased ? (
                        <span className="inline-flex items-center gap-1.5 text-base font-extrabold text-emerald-700">
                          <CheckCircle size={18} />
                          <span>Purchased & Unlocked</span>
                        </span>
                      ) : note.accessType === "free" ? (
                        <span className="text-xl font-extrabold text-emerald-700">FREE</span>
                      ) : (
                        <span className="text-2xl font-extrabold text-[#1c1917]">
                          ₹{note.price}
                        </span>
                      )}
                    </div>
                  </div>

                  {!note.isPurchased && note.accessType === "paid" && (
                    <span className="text-[11px] text-[#78716c] bg-white px-2.5 py-1 rounded-lg border border-[#e8e5dc]">
                      Lifetime digital access
                    </span>
                  )}
                </div>

                {/* Primary CTA */}
                {note.isPurchased ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/institution/${activeSlug}/notes/${id}/read`)}
                    className="w-full py-3 px-4 rounded-xl bg-[#5b3cc4] hover:bg-[#4a2eb0] text-white text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen size={16} />
                    <span>Read Notes Securely</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={buying}
                    onClick={handleBuyNote}
                    className="w-full py-3 px-4 rounded-xl bg-[#5b3cc4] hover:bg-[#4a2eb0] text-white text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {buying ? (
                      <span>Processing...</span>
                    ) : note.accessType === "free" ? (
                      <>
                        <BookOpen size={16} />
                        <span>Unlock Free Notes</span>
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        <span>Buy Notes for ₹{note.price}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Optional Reference Video Box */}
              {note.referenceVideo?.videoId && (
                <div className="p-4 rounded-2xl bg-white border border-[#e8e5dc] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1c1917]">
                    <Play size={14} className="text-[#5b3cc4]" />
                    <span>Reference Video Lecture</span>
                  </div>
                  <p className="text-[11px] text-[#78716c]">
                    This note includes an accompanying video session:
                  </p>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/5 mt-2">
                    {note.referenceVideo.provider === "youtube" ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${note.referenceVideo.videoId}`}
                        title="Reference Video"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#78716c]">
                        Video Reference: {note.referenceVideo.videoId}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Optional Related Course */}
              {note.relatedCourseId && (
                <div className="p-4 rounded-2xl bg-white border border-[#e8e5dc] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {note.relatedCourseId.thumbnail && (
                      <img
                        src={note.relatedCourseId.thumbnail}
                        alt=""
                        className="w-12 h-10 rounded-lg object-cover border border-[#e8e5dc] shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-[#78716c]">Related Course</p>
                      <p className="text-xs font-bold text-[#1c1917] truncate">
                        {note.relatedCourseId.title}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/course/${note.relatedCourseId._id}`}
                    className="shrink-0 text-xs font-bold text-[#5b3cc4] hover:underline flex items-center gap-1"
                  >
                    <span>View Course</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
