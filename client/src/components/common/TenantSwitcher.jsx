import React, { useState } from "react";
import { useTenant } from "../../context/TenantContext";
import { Building2, ChevronDown, Check, Globe } from "lucide-react";
import { useSelector } from "react-redux";

export default function TenantSwitcher() {
  const { tenant, switchTenant } = useTenant();
  const { userData } = useSelector((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);

  // In production outside localhost / lvh.me, keep switcher accessible via discrete toggle or hide
  const activeSlug = tenant?.slug || "default";
  const institutions = userData?.role === "student"
    ? (userData.memberships || [])
    : tenant && !tenant.isPlatform && !["default", "platform"].includes(tenant.slug)
      ? [{ slug: tenant.slug, name: tenant.name, logo: tenant.logo }]
      : [];

  return (
    <div className="fixed bottom-4 left-4 z-50 font-sans">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-gray-900/90 hover:bg-gray-800 text-white text-xs px-3 py-2 rounded-full border border-gray-700 shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer"
          title="Switch Tenant Organization"
        >
          <Building2 size={14} className="text-cyan-400" />
          <span className="font-medium max-w-[130px] truncate">
            {tenant?.name || "Organization"}
          </span>
          <span className="bg-gray-800 text-[10px] text-gray-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
            {activeSlug}
          </span>
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="absolute bottom-12 left-0 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 z-50 text-white animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-2 border-b border-gray-800">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe size={12} /> Active Organization
              </p>
              <p className="text-xs text-gray-200 font-medium truncate mt-0.5">
                {tenant?.name}
              </p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                {typeof window !== "undefined" ? window.location.host : ""}
              </p>
            </div>

            <div className="py-1">
              <p className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Your institutions
              </p>
              {institutions.map((t) => {
                const isActive = activeSlug === t.slug;
                return (
                  <button
                    key={t.slug}
                    onClick={() => {
                      switchTenant(t.slug);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left ${
                      isActive
                        ? "bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-800/60"
                        : "hover:bg-gray-800 text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {t.logo ? <img src={t.logo} alt="" className="h-5 w-5 rounded object-contain bg-white" /> : <span className="w-2 h-2 rounded-full bg-[var(--tenant-primary,#5b3cc4)]" />}
                      <span className="truncate">{t.name}</span>
                    </div>
                    {isActive && <Check size={14} className="text-cyan-400" />}
                  </button>
                );
              })}
              {institutions.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No institution memberships found.</p>}
            </div>
            <div className="px-3 py-1.5 border-t border-gray-800 text-[10px] text-gray-400">
              Switch between institutions linked to this account.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

