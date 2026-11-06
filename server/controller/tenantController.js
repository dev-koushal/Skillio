import Tenant from "../models/tenantModel.js";
import { clearTenantCache } from "../middleware/tenantResolver.js";
import uploadCloudinary from "../config/cloudinary.js";

/**
 * Returns the public branding & features of the active tenant
 */
export const getCurrentTenant = async (req, res) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    return res.status(200).json({
      success: true,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        customDomain: tenant.customDomain || null,
        logo: tenant.logo || "/skillio.png",
        favicon: tenant.favicon || "/skillio.png",
        primaryColor: tenant.primaryColor || "#164e63",
        secondaryColor: tenant.secondaryColor || "#0f172a",
        title: tenant.title || "Learn Without Limits",
        subtitle: tenant.subtitle || "",
        heroContent: tenant.heroContent || "",
        heroImage: tenant.heroImage || "",
        footerText: tenant.footerText || "All rights reserved.",
        organizationName: tenant.organizationName || tenant.name,
        features: tenant.features || {},
        settings: tenant.settings || {},
        status: tenant.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Public lookup by slug (for frontend tenant previews / switcher)
 */
export const getTenantBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }
    return res.status(200).json({
      success: true,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.logo,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        title: tenant.title,
        status: tenant.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Platform Admin: List all tenants
 */
export const getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: tenants.length, tenants });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Platform Admin: Create a new tenant
 */
export const createTenant = async (req, res) => {
  try {
    const {
      name,
      slug,
      customDomain,
      primaryColor,
      secondaryColor,
      title,
      subtitle,
      features,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "Name and slug are required" });
    }

    const cleanSlug = slug.toLowerCase().trim();
    const existing = await Tenant.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(400).json({ success: false, message: "Subdomain slug already in use" });
    }

    let logo = "/skillio.png";
    if (req.file) {
      const upload = await uploadCloudinary(req.file.path);
      if (upload) logo = upload;
    }

    const tenant = await Tenant.create({
      name,
      slug: cleanSlug,
      customDomain: customDomain ? customDomain.toLowerCase().trim() : undefined,
      logo,
      primaryColor: primaryColor || "#164e63",
      secondaryColor: secondaryColor || "#0f172a",
      title: title || `Welcome to ${name}`,
      subtitle: subtitle || "",
      features: features || { quizzes: true, certificates: true, analytics: true, reviews: true },
      status: "active",
    });

    clearTenantCache();
    return res.status(201).json({ success: true, message: "Tenant created successfully", tenant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Tenant Admin / Platform Admin: Update branding and settings
 */
export const updateTenantBranding = async (req, res) => {
  try {
    const tenantId = req.params.id || req.tenantId;
    const {
      name,
      primaryColor,
      secondaryColor,
      title,
      subtitle,
      heroContent,
      footerText,
      organizationName,
      features,
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (primaryColor) updateData.primaryColor = primaryColor;
    if (secondaryColor) updateData.secondaryColor = secondaryColor;
    if (title) updateData.title = title;
    if (subtitle) updateData.subtitle = subtitle;
    if (heroContent) updateData.heroContent = heroContent;
    if (footerText) updateData.footerText = footerText;
    if (organizationName) updateData.organizationName = organizationName;
    if (features) updateData.features = typeof features === "string" ? JSON.parse(features) : features;

    if (req.file) {
      const logoUrl = await uploadCloudinary(req.file.path);
      if (logoUrl) updateData.logo = logoUrl;
    }

    const updated = await Tenant.findByIdAndUpdate(tenantId, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    clearTenantCache(updated.slug);
    clearTenantCache(updated._id.toString());

    return res.status(200).json({
      success: true,
      message: "Branding updated successfully",
      tenant: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Platform Admin: Update tenant status (active, suspended)
 */
export const updateTenantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const tenant = await Tenant.findByIdAndUpdate(id, { status }, { new: true });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    clearTenantCache(tenant.slug);
    clearTenantCache(tenant._id.toString());

    return res.status(200).json({ success: true, message: `Tenant status set to ${status}`, tenant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
