import Tenant from "../models/tenantModel.js";

// In-memory cache for ultra-fast tenant resolution without repeated DB hits
const tenantCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export const clearTenantCache = (slugOrId) => {
  if (slugOrId) {
    for (const [key, value] of tenantCache.entries()) {
      if (
        key === slugOrId ||
        value?.tenant?.slug === slugOrId ||
        value?.tenant?._id?.toString() === slugOrId.toString()
      ) {
        tenantCache.delete(key);
      }
    }
  } else {
    tenantCache.clear();
  }
};

/**
 * Extracts subdomain / tenant identifier from hostname.
 * Examples:
 *   physics.mylms.com      -> physics
 *   coding.lvh.me          -> coding
 *   abc.localhost          -> abc
 *   mylms.com              -> default
 *   localhost:3000         -> default
 *   skillio-1.onrender.com -> default
 */
export const extractSubdomain = (hostname = "") => {
  const cleanHost = hostname.split(":")[0].toLowerCase().trim();

  // Root or IP addresses fall back to default
  if (
    !cleanHost ||
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost.endsWith(".onrender.com") ||
    cleanHost === "skillio.com" ||
    cleanHost === "www.skillio.com"
  ) {
    return "default";
  }

  // Handle *.lvh.me (e.g., physics.lvh.me)
  if (cleanHost.endsWith(".lvh.me")) {
    const parts = cleanHost.replace(".lvh.me", "").split(".");
    return parts[parts.length - 1] || "default";
  }

  // Handle *.localhost (e.g., physics.localhost)
  if (cleanHost.endsWith(".localhost")) {
    const parts = cleanHost.replace(".localhost", "").split(".");
    return parts[parts.length - 1] || "default";
  }

  // Handle standard multi-level domains (e.g., physics.mylms.com)
  const parts = cleanHost.split(".");
  if (parts.length >= 3) {
    return parts[0];
  }

  return "default";
};

/**
 * Centralized Tenant Resolution Middleware
 */
export const tenantResolver = async (req, res, next) => {
  try {
    // 1. Check explicit headers (useful for API clients, testing, cross-origin)
    let slug = req.headers["x-tenant-slug"]?.toString().trim().toLowerCase();
    const explicitTenantId = req.headers["x-tenant-id"]?.toString().trim();

    // 2. Extract host from forwarded headers or request
    const hostHeader =
      req.headers["x-forwarded-host"] || req.headers.host || req.hostname || "";
    const cleanHost = hostHeader.split(",")[0].trim().split(":")[0].toLowerCase();

    // Query parameter override for testing (e.g. ?tenant=physics)
    if (!slug && req.query?.tenant) {
      slug = req.query.tenant.toString().trim().toLowerCase();
    }

    // 3. Check in-memory cache first
    const cacheKey = explicitTenantId || slug || cleanHost;
    const cached = tenantCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      if (cached.tenant.status === "suspended") {
        return res.status(403).json({
          success: false,
          code: "TENANT_SUSPENDED",
          message: "This organization account has been suspended.",
        });
      }
      req.tenant = cached.tenant;
      req.tenantId = cached.tenant._id;
      req.tenantSlug = cached.tenant.slug;
      return next();
    }

    let tenant = null;

    // 4. Resolve by explicit ID if provided
    if (explicitTenantId) {
      tenant = await Tenant.findById(explicitTenantId);
    }

    // 5. Resolve by slug if present
    if (!tenant && slug) {
      tenant = await Tenant.findOne({ slug });
    }

    // 6. Resolve by custom domain
    if (!tenant && cleanHost && cleanHost !== "localhost" && cleanHost !== "127.0.0.1") {
      tenant = await Tenant.findOne({ customDomain: cleanHost });
    }

    // 7. Resolve by subdomain from host
    if (!tenant) {
      const derivedSlug = extractSubdomain(cleanHost);
      tenant = await Tenant.findOne({ slug: derivedSlug });

      // If derived slug not found and not default, try fallback to default
      if (!tenant && derivedSlug !== "default") {
        tenant = await Tenant.findOne({ slug: "default" });
      }
    }

    // 8. If still no tenant found, ensure default tenant fallback
    if (!tenant) {
      tenant = await Tenant.findOne({ slug: "default" });
      if (!tenant) {
        // Last-resort fallback in dev / freshly deployed database
        tenant = await Tenant.create({
          name: "Skillio Academy",
          slug: "default",
          logo: "/skillio.png",
          favicon: "/skillio.png",
          primaryColor: "#164e63",
          secondaryColor: "#0f172a",
          title: "Learn Without Limits",
          organizationName: "Skillio Academy",
          status: "active",
        });
      }
    }

    // 9. Status verification
    if (tenant.status === "suspended") {
      return res.status(403).json({
        success: false,
        code: "TENANT_SUSPENDED",
        message: "This organization account has been suspended.",
      });
    }

    // 10. Cache the resolved tenant
    tenantCache.set(cacheKey, { tenant, timestamp: Date.now() });
    tenantCache.set(tenant.slug, { tenant, timestamp: Date.now() });
    tenantCache.set(tenant._id.toString(), { tenant, timestamp: Date.now() });

    // 11. Attach to request object
    req.tenant = tenant;
    req.tenantId = tenant._id;
    req.tenantSlug = tenant.slug;

    next();
  } catch (error) {
    console.error("[TenantResolver] Resolution error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during organization resolution",
    });
  }
};

