import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";

export default function InstitutionRequiredDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("skillio:institution-required", show);
    return () => window.removeEventListener("skillio:institution-required", show);
  }, []);
  if (!open) return null;
  return <div className="fixed inset-0 z-[120] grid place-items-center bg-[#151d19]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="institution-dialog-title"><section className="w-full max-w-md rounded-[24px] border border-[#e8e5dc] bg-[#fffefa] p-6 shadow-2xl sm:p-8"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e4eee8] text-[#254a39]"><Building2 size={22} /></div><h2 id="institution-dialog-title" className="mt-5 text-xl font-bold tracking-tight text-[#202a24]">Create your institution first</h2><p className="mt-2 text-sm leading-6 text-[#666b63]">Your institution is the home for your courses, students, notes and learning content.</p><div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={() => { setOpen(false); navigate("/create-institution"); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#254a39] px-4 text-sm font-semibold text-white hover:bg-[#1c392c]">Create Institution <ArrowRight size={15} /></button><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-[#deddd4] px-4 text-sm font-semibold text-[#4a5049] hover:bg-[#f6f5ef]">Cancel</button></div></section></div>;
}
