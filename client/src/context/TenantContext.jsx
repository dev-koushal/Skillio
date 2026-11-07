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
      const slug = getActiveTenantSlug();

      // If no specific tenant slug is present (browsing Platform homepage "/")
      if (!slug || slug === "platform") {
        const platformTenant = {
          isPlatform: true,
          name: "Skillio",
          slug: "platform",
          logo: "/skillio.png",
          favicon: "/skillio.png",
          title: "Learning Infrastructure for Modern Educators",
          subtitle: "The platform for educators to build, manage, and grow their own online learning business.",
          institutionType: "Platform",
        };
        setTenant(platformTenant);
        document.title = "Skillio — Platform for Educators & Online Academies";
        setLoading(false);
        return;
      }

      const res = await api.get(`/api/tenant/by-slug/${slug}`);

      if (res.data?.success && res.data?.tenant) {
        const tenantData = res.data.tenant;
        setTenant(tenantData);

        // Update Page Title
        document.title = `${tenantData.name} — ${tenantData.title || "Academy"}`;

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
      } else {
        // Fallback for specified slug
        setTenant({
          name: slug.charAt(0).toUpperCase() + slug.slice(1) + " Academy",
          slug,
          logo: "/skillio.png",
          institutionType: "Academy",
        });
      }
    } catch (err) {
      console.warn("[TenantContext] Could not fetch tenant:", err.message);
      // Fallback
      const slug = getActiveTenantSlug() || "platform";
      if (slug === "platform") {
        setTenant({
          isPlatform: true,
          name: "Skillio",
          slug: "platform",
          logo: "/skillio.png",
          title: "Learning Infrastructure for Modern Educators",
          institutionType: "Platform",
        });
      } else {
        setTenant({
          name: slug.charAt(0).toUpperCase() + slug.slice(1) + " Academy",
          slug,
          logo: "/skillio.png",
          institutionType: "Academy",
        });
      }
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const switchTenant = (slug) => {
    if (typeof window !== "undefined") {
      if (!slug || slug === "platform") {
        localStorage.removeItem("skillio_active_tenant");
        window.location.href = "/";
        return;
      }

      localStorage.setItem("skillio_active_tenant", slug);
      const hostname = window.location.hostname;
      if (hostname.endsWith(".lvh.me")) {
        const port = window.location.port ? `:${window.location.port}` : "";
        window.location.href = `${window.location.protocol}//${slug}.lvh.me${port}/institution/${slug}`;
        return;
      }
      window.location.href = `/institution/${slug}`;
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

