import React from "react";
import { Link } from "react-router-dom";
import { useTenant } from "../context/TenantContext";

function Footer() {
  const { tenant } = useTenant();
  const currentYear = new Date().getFullYear();
  const tenantName = tenant?.name || "Skillio";
  const tenantLogo = tenant?.logo || "/skillio.png";

  return (
    <footer className="bg-black text-gray-400 border-t border-gray-800/80">
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
              <span className="font-bold text-lg text-white">{tenantName}</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              {tenant?.subtitle || "A modern multi-tenant learning management platform empowering educators and students worldwide."}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-200">
              Platform
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/allcourses" className="hover:text-white transition">
                  Browse Courses
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-200">
              Educators
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/courses" className="hover:text-white transition">
                  Course Studio
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition">
                  Instructor Dashboard
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition">
                  Become a Teacher
                </Link>
              </li>
            </ul>
          </div>

          {/* Organization Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-200">
              Organization
            </h4>
            <p className="text-xs sm:text-sm text-gray-400">
              {tenant?.organizationName || tenantName}
            </p>
            <p className="text-xs text-gray-500">
              Status: <span className="text-emerald-400 font-medium capitalize">{tenant?.status || "Active"}</span>
            </p>
            <p className="text-xs text-gray-500">
              Tenant ID: <span className="font-mono text-[11px] text-gray-400">{tenant?.slug}</span>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-gray-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© {currentYear} {tenantName}. {tenant?.footerText || "All rights reserved."}</p>
          <div className="flex gap-6">
            <span className="hover:text-gray-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-400 cursor-pointer">Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
