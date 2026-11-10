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

  // 4. Stored active institution (persists active academy across pages)
  const storedTenant = localStorage.getItem("skillio_active_tenant");
  if (storedTenant && storedTenant !== "platform" && storedTenant !== "default") {
    return storedTenant.toLowerCase().trim();
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

// Interceptor to inject token and tenant slug headers on every request automatically
api.interceptors.request.use(
  (config) => {
    // 1. Inject Authorization header if stored token exists (resilient MNC dual-layer persistence)
    const token = typeof window !== "undefined" ? localStorage.getItem("skillio_auth_token") : null;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Inject active tenant slug
    const tenantSlug = getActiveTenantSlug();
    if (tenantSlug) {
      config.headers["x-tenant-slug"] = tenantSlug;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle cross-tenant 403 or 401 cleanly, and session revocation
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.code === "SESSION_REVOKED") {
      console.warn("[API] Session revoked by another device login.");
      if (typeof window !== "undefined") {
        localStorage.removeItem("skillio_auth_token");
        localStorage.removeItem("skillio_user_data");
        localStorage.removeItem("skillio_active_tenant");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login?revoked=true";
        }
      }
    }
    if (error.response?.data?.code === "CROSS_TENANT_FORBIDDEN") {
      console.warn("[API] Cross-tenant token detected. Clearing stale session.");
    }
    return Promise.reject(error);
  }
);

export default api;

