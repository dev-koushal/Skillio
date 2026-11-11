import Tenant from "../models/tenantModel.js";
import Course from "../models/coursesModel.js";
import User from "../models/userModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import { genToken } from "../config/token.js";
import { clearTenantCache } from "../middleware/tenantResolver.js";
import uploadCloudinary from "../config/cloudinary.js";
import { isInstitutionOwner as canManageInstitution } from "../utils/permissions.js";
import { apiError } from "../utils/apiErrors.js";

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
    const tenant = await Tenant.findOne({ slug: slug.toLowerCase(), status: "active" });
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
 * Public: Institution Directory for student discovery
 * Searchable by name, slug, description, or domain tags
 */
export const getInstitutionDirectory = async (req, res) => {
  try {
    const { q, type } = req.query;

    // Only real institution workspaces belong in discovery; the reserved
    // platform/default tenants are infrastructure, not selectable academies.
    const filter = { status: "active", slug: { $nin: ["default", "platform"] } };

    if (type && type !== "all") {
      filter.institutionType = type;
    }

    if (q && q.trim()) {
      const searchTerm = q.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(searchTerm, "i");
      filter.$or = [
        { name: searchRegex },
        { slug: searchRegex },
        { description: searchRegex },
        { title: searchRegex },
        { domainTags: searchRegex },
      ];
    }

    const tenants = await Tenant.find(filter)
      .select("name slug logo favicon primaryColor secondaryColor title subtitle description institutionType domainTags createdAt")
      .sort({ createdAt: -1 });

    // Aggregate course counts for each institution in parallel
    const institutionsWithCounts = await Promise.all(
      tenants.map(async (t) => {
        const courseCount = await Course.countDocuments({ tenantId: t._id, isPublished: true });
        return {
          id: t._id,
          name: t.name,
          slug: t.slug,
          logo: t.logo || "/skillio.png",
          primaryColor: t.primaryColor,
          secondaryColor: t.secondaryColor,
          title: t.title,
          subtitle: t.subtitle,
          description: t.description || t.subtitle || "",
          institutionType: t.institutionType || "Academy",
          domainTags: t.domainTags || [],
          courseCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: institutionsWithCounts.length,
      institutions: institutionsWithCounts,
    });
  } catch (error) {
    console.error("[GetInstitutionDirectory Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Authenticated: Educator creates their own organization / institution
 * The creating educator owns the institution while keeping the educator role.
 */
export const createOrganizationByEducator = async (req, res) => {
  let tenantCreatedForRollback = null;
  let userForRollback = null;
  let originalUserState = null;
  try {
    const {
      name,
      slug,
      description,
      institutionType,
      domainTags,
      title,
      subtitle,
      primaryColor,
      secondaryColor,
    } = req.body;

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    userForRollback = user;
    originalUserState = { role: user.role, tenantId: user.tenantId };
    const accountRole = user.role === "platform_admin" ? "platform_admin" : "educator";

    // Role check: Students are strictly consumers/members and cannot create institutions
    if (user.role === "student" || req.userRole === "student") {
      return res.status(403).json({
        success: false,
        message: "Students are consumers of institutions and are not permitted to create organizations.",
      });
    }

    // Educator limit rule: Each educator/admin can manage exactly ONE institution
    const existingOwned = await Tenant.findOne({
      $or: [
        { ownerId: userId },
        ...(user.tenantId ? [{ _id: user.tenantId, slug: { $nin: ["default", "platform"] } }] : []),
      ],
    });
    if (existingOwned) {
      return res.status(400).json({
        success: false,
        message: `You already manage '${existingOwned.name}'. Educators are limited to exactly one institution.`,
      });
    }

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "Institution name and subdomain slug are required" });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    if (cleanSlug.length < 3) {
      return res.status(400).json({ success: false, message: "Subdomain slug must be at least 3 alphanumeric characters" });
    }

    // Reserved slugs
    const reserved = ["api", "admin", "dashboard", "auth", "static", "public", "assets", "system", "app", "login", "signup", "help"];
    if (reserved.includes(cleanSlug)) {
      return res.status(400).json({ success: false, message: `The slug '${cleanSlug}' is reserved. Please choose another.` });
    }

    const existing = await Tenant.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(400).json({ success: false, message: `An institution with slug '${cleanSlug}' already exists.` });
    }

    let logo = "/skillio.png";
    if (req.file) {
      const upload = await uploadCloudinary(req.file.path);
      if (upload) logo = upload;
    }

    let parsedTags = [];
    if (domainTags) {
      parsedTags = Array.isArray(domainTags)
        ? domainTags
        : domainTags.split(",").map((s) => s.trim()).filter(Boolean);
    }

    // Create the new tenant
    const newTenant = await Tenant.create({
      name: name.trim(),
      slug: cleanSlug,
      ownerId: userId,
      logo,
      primaryColor: primaryColor || "#1e3a8a",
      secondaryColor: secondaryColor || "#0f172a",
      title: title?.trim() || `Welcome to ${name.trim()}`,
      subtitle: subtitle?.trim() || "",
      description: description?.trim() || "",
      institutionType: institutionType || "Academy",
      domainTags: parsedTags,
      status: "active",
      features: { quizzes: true, certificates: true, analytics: true, reviews: true },
    });
    tenantCreatedForRollback = newTenant;

    // Institution ownership is recorded on Tenant.ownerId. Teachers remain educators.
    user.role = accountRole;
    user.tenantId = newTenant._id;
    await user.save();

    // Register institution owner membership
    await InstitutionMembership.create({
      userId: user._id,
      tenantId: newTenant._id,
      role: "educator",
      status: "active",
      joinedAt: new Date(),
    });

    clearTenantCache();

    // Keep the account role as educator in both the session and token.
    const token = await genToken(user._id, newTenant._id, accountRole);

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(201).json({
      success: true,
      message: `Institution '${newTenant.name}' created successfully!`,
      tenant: newTenant,
      user: safeUser,
      token,
    });
  } catch (error) {
    if (tenantCreatedForRollback) {
      if (userForRollback && originalUserState) {
        try {
          userForRollback.role = originalUserState.role;
          userForRollback.tenantId = originalUserState.tenantId;
          await userForRollback.save();
        } catch (rollbackError) {
          console.error("[CreateOrganizationByEducator] User rollback failed:", rollbackError);
        }
        try {
          await InstitutionMembership.deleteOne({ userId: userForRollback._id, tenantId: tenantCreatedForRollback._id });
        } catch (rollbackError) {
          console.error("[CreateOrganizationByEducator] Membership rollback failed:", rollbackError);
        }
      }
      try {
        await Tenant.deleteOne({ _id: tenantCreatedForRollback._id });
        clearTenantCache();
      } catch (rollbackError) {
        console.error("[CreateOrganizationByEducator] Tenant rollback failed:", rollbackError);
      }
    }
    console.error("[CreateOrganizationByEducator Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Authenticated: Get the institution managed by or connected to this educator.
 */
export const getMyInstitution = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Lookup tenant owned by user or assigned to user
    let tenant = user.role === "platform_admin" && req.tenantId
      ? await Tenant.findById(req.tenantId)
      : await Tenant.findOne({ ownerId: userId });
    if (!tenant && user.tenantId) {
      const assignedTenant = await Tenant.findById(user.tenantId);
      if (assignedTenant && !["default", "platform"].includes(assignedTenant.slug)) tenant = assignedTenant;
    }

    return res.status(200).json({
      success: true,
      hasInstitution: Boolean(tenant),
      tenant: tenant || null,
    });
  } catch (error) {
    console.error("[GetMyInstitution Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Authenticated: Update the institution managed by this educator.
 */
export const updateMyInstitution = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "student") {
      return res.status(403).json({ success: false, message: "Students cannot manage institutions" });
    }

    // Resolve tenant owned by user or assigned to user
    let tenant = user.role === "platform_admin" && req.tenantId
      ? await Tenant.findById(req.tenantId)
      : await Tenant.findOne({ ownerId: userId });
    if (!tenant && user.tenantId) {
      const assignedTenant = await Tenant.findById(user.tenantId);
      if (assignedTenant && !["default", "platform"].includes(assignedTenant.slug)) tenant = assignedTenant;
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "No institution found under your account. Please create one first.",
      });
    }

    if (!(await canManageInstitution({ tenantId: tenant._id, userId, userRole: user.role, userTenantId: user.tenantId }))) {
      return apiError(res, 403, "INSTITUTION_ACCESS_DENIED");
    }

    const {
      name,
      institutionType,
      title,
      subtitle,
      description,
      domainTags,
      primaryColor,
      secondaryColor,
      contactEmail,
    } = req.body;

    if (name && name.trim()) tenant.name = name.trim();
    if (institutionType && institutionType.trim()) tenant.institutionType = institutionType.trim();
    if (title !== undefined) tenant.title = title.trim();
    if (subtitle !== undefined) tenant.subtitle = subtitle.trim();
    if (description !== undefined) tenant.description = description.trim();
    if (primaryColor) tenant.primaryColor = primaryColor;
    if (secondaryColor) tenant.secondaryColor = secondaryColor;

    if (contactEmail !== undefined) {
      if (!tenant.settings) tenant.settings = {};
      tenant.settings.contactEmail = contactEmail.trim();
    }

    if (domainTags !== undefined) {
      tenant.domainTags = Array.isArray(domainTags)
        ? domainTags
        : domainTags.split(",").map((s) => s.trim()).filter(Boolean);
    }

    if (req.file) {
      const upload = await uploadCloudinary(req.file.path);
      if (upload) tenant.logo = upload;
    }

    await tenant.save();

    clearTenantCache(tenant.slug);
    clearTenantCache(tenant._id.toString());

    return res.status(200).json({
      success: true,
      message: `Institution '${tenant.name}' updated successfully!`,
      tenant,
    });
  } catch (error) {
    console.error("[UpdateMyInstitution Error]", error);
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
 * Institution owner / Platform Admin: Update branding and settings
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

