import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTenant } from "../context/TenantContext";
import "./Footer.css";

function Footer() {
  const { tenant } = useTenant();
  const { userData } = useSelector((state) => state.user);
  const currentYear = new Date().getFullYear();
  const tenantName = tenant?.name || "Skillio Academy";
  const tenantLogo = tenant?.logo || "/skillio.png";

  return (
    <footer className={`app-footer bg-white text-[#57534e] border-t border-[#e8e5dc] ${userData ? "app-footer-authenticated" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img
                src={tenantLogo}
                alt={tenantName}
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.target.src = "/skillio.png";
                }}
              />
              <span className="font-bold text-base sm:text-lg text-[#1c1917]">{tenantName}</span>
            </div>
            <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">
              {tenant?.subtitle || "A modern multi-tenant learning management platform empowering educators and students worldwide."}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c1917]">
              Platform
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/login" className="hover:text-[#5b3cc4] transition">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-[#5b3cc4] transition">
                  Create an account
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c1917]">
              Educators
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/signup?role=educator" className="hover:text-[#5b3cc4] transition font-semibold text-[#5b3cc4]">
                  Launch Academy
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-[#5b3cc4] transition">
                  Course Studio
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-[#5b3cc4] transition">
                  Instructor Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Organization Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c1917]">
              Organization
            </h4>
            <p className="text-xs sm:text-sm font-semibold text-[#1c1917]">
              {tenant?.organizationName || tenantName}
            </p>
            {tenant?.customDomain && <p className="text-xs text-[#78716c]">Domain: <span className="font-mono text-[11px] text-[#5b3cc4] font-semibold">{tenant.customDomain}</span></p>}
            {tenant?.status && <p className="text-xs text-[#78716c]">Status: <span className="text-emerald-700 font-semibold capitalize bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{tenant.status}</span></p>}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[#f2efe9] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#78716c]">
          <p>© {currentYear} {tenantName}. {tenant?.footerText || "All rights reserved."}</p>
          <div className="flex items-center gap-4">
            <span>Powered by Skillio SaaS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
