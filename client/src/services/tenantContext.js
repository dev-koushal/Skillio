const excludedSubdomains = new Set(["www", "app"]);

const getHostTenant = (hostname = "") => {
  const host = hostname.toLowerCase();
  if (host.endsWith(".lvh.me") || host.endsWith(".localhost")) {
    const subdomain = host.replace(/\.(lvh\.me|localhost)$/, "");
    return excludedSubdomains.has(subdomain) ? null : subdomain || null;
  }

  const parts = host.split(".");
  if (parts.length >= 3 && !host.endsWith(".onrender.com") && !host.endsWith(".vercel.app")) {
    const subdomain = parts[0];
    return excludedSubdomains.has(subdomain) ? null : subdomain || null;
  }

  return null;
};

export const resolveActiveTenantSlug = ({ pathname = "/", search = "", hostname = "", storedTenant = null } = {}) => {
  const path = pathname;
  const authPath = /^\/(login|signup|forget|reset-password)(\/|$)/i.test(path);
  const params = new URLSearchParams(search);

  if (authPath) {
    const explicitTenant = params.get("tenant");
    return explicitTenant?.trim().toLowerCase() || getHostTenant(hostname);
  }

  const institutionPath = path.match(/\/institution\/([^/]+)/);
  if (institutionPath?.[1]) return institutionPath[1].toLowerCase().trim();

  const explicitTenant = params.get("tenant");
  if (explicitTenant) return explicitTenant.toLowerCase().trim();

  const hostTenant = getHostTenant(hostname);
  if (hostTenant) return hostTenant;

  const stored = storedTenant?.toLowerCase().trim();
  return stored && !["platform", "default"].includes(stored) ? stored : null;
};
