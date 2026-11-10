import api from "./api";

const TOKEN_KEY = "skillio_auth_token";
const USER_KEY = "skillio_user_data";
const TENANT_KEY = "skillio_active_tenant";

/**
 * Persist authentication session to localStorage for Fortune-500 MNC resilience.
 */
export const setAuthSession = (token, user) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.warn("[AuthStorage] Could not write to localStorage:", e);
  }
};

/**
 * Retrieve cached token.
 */
export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch (e) {
    return null;
  }
};

/**
 * Retrieve cached user payload instantly on boot/refresh.
 */
export const getCachedUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Update cached user data.
 */
export const updateCachedUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (e) { }
};

/**
 * Cleanly clear all authentication and tenant states.
 */
export const clearAuthSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TENANT_KEY);
    sessionStorage.clear();
  } catch (e) { }
};

/**
 * Centralized, production-grade Logout:
 * 1. Notifies backend to revoke device session and clear cookie.
 * 2. Purges all localStorage and sessionStorage keys (including selected institution).
 * 3. Redirects cleanly to "/" so no stale institution remains selected.
 */
export const performLogout = async () => {
  try {
    await api.get("/api/auth/logout");
  } catch (e) {
    // Proceed with client wipe even if network is offline
  }

  clearAuthSession();

  // Force clean reload at platform root
  if (typeof window !== "undefined") {
    window.location.replace("/");
  }
};
