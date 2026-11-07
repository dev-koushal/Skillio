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
 * Returns null when browsing the global Skillio Platform.
 */
export const getActiveTenantSlug = () => {
  if (typeof window === "undefined") return null;

  // 1. Check Path: e.g. /institution/physics or /institution/english
  const pathMatch = window.location.pathname.match(/\/institution\/([^/]+)/);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1].toLowerCase().trim();
  }

  // 2. Check URL search param: e.g. ?tenant=physics
  const params = new URLSearchParams(window.location.search);
  const paramTenant = params.get("tenant");
  if (paramTenant) {
    return paramTenant.toLowerCase().trim();
  }

  // 3. Extract from Subdomain (e.g. physics.mylms.com or physics.lvh.me)
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.endsWith(".lvh.me")) {
    const sub = hostname.replace(".lvh.me", "");
    if (sub && sub !== "www" && sub !== "app") return sub;
  }

  if (hostname.endsWith(".localhost")) {
    const sub = hostname.replace(".localhost", "");
    if (sub && sub !== "www" && sub !== "app") return sub;
  }

  const parts = hostname.split(".");
  if (parts.length >= 3 && !hostname.endsWith(".onrender.com") && !hostname.endsWith(".vercel.app")) {
    const sub = parts[0];
    if (sub && sub !== "www" && sub !== "app") return sub;
  }

  // 4. Stored tenant only when inside specific course views or educator workflows,
  // NOT on root platform "/" or general platform pages
  const isPlatformRoot = window.location.pathname === "/" || window.location.pathname === "/institutions";
  if (!isPlatformRoot) {
    const storedTenant = localStorage.getItem("skillio_active_tenant");
    if (storedTenant) {
      return storedTenant.toLowerCase().trim();
    }
  }

  return null;
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

