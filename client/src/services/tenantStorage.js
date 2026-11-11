const ACTIVE_TENANT_KEY = "skillio_active_tenant";

export const getStoredTenantSlug = () => {
  try {
    return window.localStorage.getItem(ACTIVE_TENANT_KEY);
  } catch {
    return null;
  }
};

export const setStoredTenantSlug = (slug) => {
  try {
    if (!slug) return false;
    window.localStorage.setItem(ACTIVE_TENANT_KEY, slug);
    return true;
  } catch {
    return false;
  }
};

export const clearStoredTenantSlug = () => {
  try {
    window.localStorage.removeItem(ACTIVE_TENANT_KEY);
  } catch {
    // Tenant context can still be resolved from the URL if storage is unavailable.
  }
};
