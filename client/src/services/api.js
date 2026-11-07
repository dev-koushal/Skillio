import axios from "axios";

/**
 * Determine API Base URL dynamically based on environment and hostname.
 */
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // If in browser
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    // Local development on localhost or lvh.me
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost")) {
      return "http://localhost:3000";
    }

    if (hostname.endsWith(".lvh.me")) {
      return "http://localhost:3000";
    }

    // Production deployment on Render or custom domain
    // If frontend is deployed on same domain or Render backend
    return "";
  }

  return "http://localhost:3000";
};

export const serverURL = getApiBaseUrl();

/**
 * Extract active tenant slug from window.location
 */
export const getActiveTenantSlug = () => {
  if (typeof window === "undefined") return "default";

  // 1. Check URL search param (e.g. ?tenant=physics for dev testing)
  const params = new URLSearchParams(window.location.search);
  const paramTenant = params.get("tenant");
  if (paramTenant) {
    return paramTenant.toLowerCase().trim();
  }

  // 2. Check localStorage override (useful for testing tenant switcher)
  const storedTenant = localStorage.getItem("skillio_active_tenant");
  if (storedTenant && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return storedTenant.toLowerCase().trim();
  }

  // 3. Extract from subdomain (e.g. physics.mylms.com or physics.lvh.me)
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.endsWith(".lvh.me")) {
    const sub = hostname.replace(".lvh.me", "");
    return sub || "default";
  }

  if (hostname.endsWith(".localhost")) {
    const sub = hostname.replace(".localhost", "");
    return sub || "default";
  }

  const parts = hostname.split(".");
  if (parts.length >= 3 && !hostname.endsWith(".onrender.com")) {
    return parts[0];
  }

  return "default";
};

// Create configured Axios instance
const api = axios.create({
  baseURL: serverURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to inject tenant slug header on every request automatically
api.interceptors.request.use(
  (config) => {
    const tenantSlug = getActiveTenantSlug();
    if (tenantSlug) {
      config.headers["x-tenant-slug"] = tenantSlug;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle cross-tenant 403 or 401 cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.code === "CROSS_TENANT_FORBIDDEN") {
      console.warn("[API] Cross-tenant token detected. Clearing stale session.");
      // Optional: clear local session or alert user
    }
    return Promise.reject(error);
  }
);

export default api;

