import React, { createContext, useContext, useEffect, useState } from "react";
import api, { getActiveTenantSlug } from "../services/api";

const TenantContext = createContext({
  tenant: null,
  loading: true,
  error: null,
  reloadTenant: () => {},
  switchTenant: (slug) => {},
});

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/api/tenant/current");

      if (res.data?.success && res.data?.tenant) {
        const tenantData = res.data.tenant;
        setTenant(tenantData);

        // Update Page Title
        document.title = `${tenantData.name} — ${tenantData.title || "LMS Platform"}`;

        // Update Favicon dynamically
        const faviconElem = document.getElementById("tenant-favicon");
        if (faviconElem && tenantData.favicon) {
          faviconElem.href = tenantData.favicon;
        }

        // Set CSS custom properties on document root for dynamic white-label theme
        const root = document.documentElement;
        if (tenantData.primaryColor) {
          root.style.setProperty("--tenant-primary", tenantData.primaryColor);
        }
        if (tenantData.secondaryColor) {
          root.style.setProperty("--tenant-secondary", tenantData.secondaryColor);
        }
      }
    } catch (err) {
      console.warn("[TenantContext] Could not fetch tenant, using default fallback:", err.message);
      // Fallback tenant for offline or pre-init state
      const fallback = {
        name: "Skillio Academy",
        slug: getActiveTenantSlug(),
        logo: "/skillio.png",
        favicon: "/skillio.png",
        primaryColor: "#164e63",
        secondaryColor: "#0f172a",
        title: "Learn Without Limits",
        subtitle: "A modern learning platform where educators build powerful courses and students master real skills.",
        heroContent: "Access industry-vetted courses designed to bridge the gap between where you are and where you want to be.",
        organizationName: "Skillio Academy",
        footerText: "Skillio. All rights reserved.",
        features: { quizzes: true, certificates: true, analytics: true, reviews: true },
        settings: { currencySymbol: "₹" },
        status: "active",
      };
      setTenant(fallback);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const switchTenant = (slug) => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname.endsWith(".lvh.me") || hostname === "localhost" || hostname === "127.0.0.1") {
        localStorage.setItem("skillio_active_tenant", slug);
        // If testing on lvh.me, navigate to that subdomain
        if (hostname.includes("lvh.me")) {
          const port = window.location.port ? `:${window.location.port}` : "";
          window.location.href = `${window.location.protocol}//${slug}.lvh.me${port}${window.location.pathname}`;
          return;
        }
        window.location.href = `${window.location.pathname}?tenant=${slug}`;
      } else {
        window.location.href = `${window.location.pathname}?tenant=${slug}`;
      }
    }
  };

  useEffect(() => {
    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        loading,
        error,
        reloadTenant: fetchTenant,
        switchTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
export default TenantContext;

