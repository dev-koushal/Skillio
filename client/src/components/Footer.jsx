import React from "react";
import { Link } from "react-router-dom";
import { useTenant } from "../context/TenantContext";
import { Building2, Globe } from "lucide-react";

function Footer() {
  const { tenant } = useTenant();
  const currentYear = new Date().getFullYear();
  const tenantName = tenant?.name || "Skillio Academy";
  const tenantLogo = tenant?.logo || "/skillio.png";

  return (
    <footer className="bg-white text-[#57534e] border-t border-[#e8e5dc]">
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
                <Link to="/allcourses" className="hover:text-[#1e3a8a] transition">
                  Browse Courses
                </Link>
              </li>
              <li>
                <Link to="/institutions" className="hover:text-[#1e3a8a] transition flex items-center gap-1.5 font-medium text-[#1e3a8a]">
                  <Building2 size={13} />
                  Find Institution
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#1e3a8a] transition">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-[#1e3a8a] transition">
                  Get Started
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
                <Link to="/create-institution" className="hover:text-[#1e3a8a] transition font-semibold text-[#451a03]">
                  Launch Academy
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-[#1e3a8a] transition">
                  Course Studio
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-[#1e3a8a] transition">
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
            <p className="text-xs text-[#78716c]">
              Domain: <span className="font-mono text-[11px] text-[#1e3a8a] font-semibold">{tenant?.slug}.mylms.com</span>
            </p>
            <p className="text-xs text-[#78716c]">
              Status: <span className="text-emerald-700 font-semibold capitalize bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{tenant?.status || "Active"}</span>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[#f2efe9] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#78716c]">
          <p>© {currentYear} {tenantName}. {tenant?.footerText || "All rights reserved."}</p>
          <div className="flex items-center gap-4">
            <Link to="/institutions" className="hover:text-[#1e3a8a]">Institution Directory</Link>
            <span>•</span>
            <span>Powered by Skillio SaaS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
