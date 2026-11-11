import axios from "axios";
import { resolveActiveTenantSlug } from "./tenantContext";
import { clearStoredTenantSlug, getStoredTenantSlug } from "./tenantStorage";
import { friendlyAuthorizationMessage } from "../auth/permissions";

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
  return resolveActiveTenantSlug({
    pathname: window.location.pathname,
    search: window.location.search,
    hostname: window.location.hostname,
    storedTenant: getStoredTenantSlug(),
  });
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
    let token = null;
    try {
      token = typeof window !== "undefined" ? window.localStorage.getItem("skillio_auth_token") : null;
    } catch { /* Cookie auth remains available when browser storage is disabled. */ }
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
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        error.response.data = {
          ...error.response.data,
          message: friendlyAuthorizationMessage(error),
        };
      }
    if (error.response?.data?.code === "SESSION_REVOKED") {
      console.warn("[API] Session revoked by another device login.");
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem("skillio_auth_token");
            window.localStorage.removeItem("skillio_user_data");
          } catch { /* The revoked server session still prevents access. */ }
          clearStoredTenantSlug();
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

