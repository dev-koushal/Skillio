import React, { useEffect, useMemo, useState } from "react";
import { Building2, Check, ChevronDown, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import { setAuthSession } from "../../services/authStorage";
import { setStoredTenantSlug } from "../../services/tenantStorage";
import { setUserData } from "../../redux/userSlice";

export default function StudentInstitutionSwitcher({ compact = false, appBar = false }) {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState("");

  const memberships = useMemo(
    () => (Array.isArray(userData?.memberships) ? userData.memberships.filter((item) => item?.slug) : []),
    [userData?.memberships],
  );
  const activeSlug = memberships.find((item) => item.slug === location.pathname.split("/")[2])?.slug
    || memberships.find((item) => item.slug === userData?.tenant?.slug)?.slug
    || memberships.find((item) => item.institutionId?.toString?.() === userData?.tenantId?.toString?.())?.slug;
  const activeInstitution = memberships.find((item) => item.slug === activeSlug);

  useEffect(() => setOpen(false), [location.pathname]);

  if (userData?.role !== "student") return null;

  const selectInstitution = async (slug) => {
    if (!slug || slug === activeSlug || switchingTo) return;
    setSwitchingTo(slug);
    try {
      const { data } = await api.post("/api/auth/select-institution", { institutionSlug: slug });
      const hasMembership = Array.isArray(data?.user?.memberships)
        && data.user.memberships.some((membership) => membership.slug === slug);
      if (!data?.success || !data?.token || !data?.user || !hasMembership) {
        throw new Error(data?.message || "We couldn't confirm your access to that institution.");
      }
      setAuthSession(data.token, data.user);
      dispatch(setUserData(data.user));
      setStoredTenantSlug(slug);
      setOpen(false);
      navigate(`/institution/${encodeURIComponent(slug)}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Could not switch institutions.");
    } finally {
      setSwitchingTo("");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className={appBar ? "institution-app-switcher" : `inline-flex max-w-full items-center gap-2 rounded-xl border border-[#e8e5dc] bg-white text-[#292524] hover:bg-[#faf9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b3cc4] ${compact ? "h-10 px-2.5 text-[11px]" : "min-h-10 px-3 text-xs font-semibold"}`}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Choose institution. Current institution: ${activeInstitution?.name || "none selected"}`}
      >
        {activeInstitution?.logo && <img src={activeInstitution.logo} alt="" width="34" height="34" className="institution-app-switcher-logo" />}
        <span className="max-w-[130px] truncate">{activeInstitution?.name || "Choose institution"}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[70] w-[min(20rem,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[#e8e5dc] bg-white p-2 shadow-xl" role="menu" aria-label="Your institutions">
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#78716c]">Your institutions</p>
          {memberships.length ? memberships.map((institution) => (
            <button
              key={institution.slug}
              type="button"
              role="menuitem"
              onClick={() => selectInstitution(institution.slug)}
              disabled={Boolean(switchingTo)}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-[#292524] hover:bg-[#f8f7f4] disabled:opacity-60"
            >
              {institution.logo
                ? <img src={institution.logo} alt="" className="h-7 w-7 shrink-0 rounded-lg border border-[#eeeae3] object-contain" />
                : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f1edff] text-[#5b3cc4]"><Building2 size={14} /></span>}
              <span className="min-w-0 flex-1 truncate">{institution.name || "Institution"}</span>
              {switchingTo === institution.slug ? <span className="text-xs text-[#78716c]">Switching…</span> : institution.slug === activeSlug ? <Check size={16} className="text-[#5b3cc4]" /> : null}
            </button>
          )) : (
            <p className="px-3 py-2 text-xs text-[#78716c]">No institution memberships yet.</p>
          )}
          <div className="mt-1 border-t border-[#eeeae3] pt-1">
            <button
              type="button"
              role="menuitem"
              className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#5b3cc4] hover:bg-[#f8f7ff]"
              onClick={() => { setOpen(false); navigate("/institutions"); }}
            >
              <Search size={15} /> Find an institution
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
