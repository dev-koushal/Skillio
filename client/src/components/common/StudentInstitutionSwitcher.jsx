import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import { setAuthSession } from "../../services/authStorage";
import { setStoredTenantSlug } from "../../services/tenantStorage";
import { setUserData } from "../../redux/userSlice";
import { getInstitutionTheme } from "../../utils/institutionTheme";
import "./StudentInstitutionSwitcher.css";

export default function StudentInstitutionSwitcher({ compact = false, appBar = false, currentInstitution = null }) {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState("");
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = "student-institution-switcher-menu";

  const memberships = useMemo(
    () => (Array.isArray(userData?.memberships) ? userData.memberships.filter((item) => item?.slug) : []),
    [userData?.memberships],
  );
  const activeSlug = memberships.find((item) => item.slug === location.pathname.split("/")[2])?.slug
    || memberships.find((item) => item.slug === userData?.tenant?.slug)?.slug
    || memberships.find((item) => item.institutionId?.toString?.() === userData?.tenantId?.toString?.())?.slug;
  const activeInstitution = memberships.find((item) => item.slug === activeSlug);
  const menuTheme = getInstitutionTheme(currentInstitution || activeInstitution);
  const menuStyle = {
    "--primary": menuTheme.primary,
    "--surface": "#ffffff",
    "--text": menuTheme.text,
    "--muted": menuTheme.muted,
    "--border": menuTheme.border,
  };

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePress = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (userData?.role !== "student") return null;

  if (memberships.length === 1) {
    if (!appBar) return null;
    const institution = memberships[0];
    return (
      <div className="institution-app-identity" aria-label={institution.name || currentInstitution?.name || "Institution"}>
        {institution.logo && <img src={institution.logo} alt="" width="34" height="34" className="institution-app-switcher-logo" />}
        <span>{institution.name || currentInstitution?.name || "Your Academy"}</span>
      </div>
    );
  }

  const selectInstitution = async (slug) => {
    if (!slug || switchingTo) return;
    if (slug === activeSlug) {
      setOpen(false);
      return;
    }
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
        ref={triggerRef}
        type="button"
        className={appBar ? "institution-app-switcher" : `inline-flex max-w-full items-center gap-2 rounded-xl border border-[#e8e5dc] bg-white text-[#292524] hover:bg-[#faf9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b3cc4] ${compact ? "h-10 px-2.5 text-[11px]" : "min-h-10 px-3 text-xs font-semibold"}`}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Choose institution. Current institution: ${activeInstitution?.name || "none selected"}`}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            window.setTimeout(() => menuRef.current?.querySelector('[role="menuitem"]')?.focus(), 0);
          }
        }}
      >
        {activeInstitution?.logo && <img src={activeInstitution.logo} alt="" width="34" height="34" className="institution-app-switcher-logo" />}
        <span className="max-w-[130px] truncate">{activeInstitution?.name || "Choose institution"}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (() => {
        const menu = (
        <div
          ref={menuRef}
          id={menuId}
          className={appBar ? "institution-switcher-viewport-menu" : "absolute right-0 top-[calc(100%+8px)] z-[70] w-[min(20rem,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[#e8e5dc] bg-white p-2 shadow-xl"}
          style={appBar ? menuStyle : undefined}
          role="menu"
          aria-label="Your institutions"
          onKeyDown={(event) => {
            const items = [...event.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')];
            const index = items.indexOf(document.activeElement);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const direction = event.key === "ArrowDown" ? 1 : -1;
              items[(index + direction + items.length) % items.length]?.focus();
            } else if (event.key === "Home") {
              event.preventDefault();
              items[0]?.focus();
            } else if (event.key === "End") {
              event.preventDefault();
              items.at(-1)?.focus();
            }
          }}
        >
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
              {institution.logo && <img src={institution.logo} alt="" width="28" height="28" className="h-7 w-7 shrink-0 rounded-md object-contain" />}
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
        );
        return appBar
          ? createPortal(<div className="institution-switcher-layer">{menu}</div>, document.body)
          : menu;
      })()}
    </div>
  );
}
