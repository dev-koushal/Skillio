import Tenant from "../models/tenantModel.js";
import { clearTenantCache } from "../middleware/tenantResolver.js";

/**
 * Shared Tenant/Institution Service for both REST controllers and the AI Assistant.
 * Multi-tenant safe.
 */
export const tenantService = {
  /**
   * Get public or administrative tenant branding and metadata.
   */
  async getTenantDetails({ tenantId }) {
    if (!tenantId) throw new Error("tenantId is required");
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error("Institution not found");
    return tenant;
  },

  /**
   * Update institution branding, colors, title, subtitle, or description.
   */
  async updateTenantBranding({ tenantId, userId, userRole, updateData = {} }) {
    if (!tenantId) throw new Error("tenantId is required");

    // Only tenant_admin or platform_admin can change institution settings
    if (userRole !== "tenant_admin" && userRole !== "platform_admin") {
      throw new Error("Only an academy administrator can change institution branding or settings");
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error("Institution not found");

    const fieldsToUpdate = {};
    if (updateData.name && updateData.name.trim()) fieldsToUpdate.name = updateData.name.trim();
    if (updateData.title && updateData.title.trim()) fieldsToUpdate.title = updateData.title.trim();
    if (updateData.subtitle !== undefined) fieldsToUpdate.subtitle = updateData.subtitle.trim();
    if (updateData.description !== undefined) fieldsToUpdate.description = updateData.description.trim();
    if (updateData.primaryColor) fieldsToUpdate.primaryColor = updateData.primaryColor.trim();
    if (updateData.secondaryColor) fieldsToUpdate.secondaryColor = updateData.secondaryColor.trim();
    if (updateData.heroContent !== undefined) fieldsToUpdate.heroContent = updateData.heroContent.trim();
    if (updateData.footerText !== undefined) fieldsToUpdate.footerText = updateData.footerText.trim();
    if (updateData.logo) fieldsToUpdate.logo = updateData.logo;

    const updated = await Tenant.findByIdAndUpdate(tenantId, fieldsToUpdate, {
      returnDocument: "after",
    });

    // Invalidate cached tenant data
    clearTenantCache(tenant.slug);
    clearTenantCache(tenant._id.toString());

    return updated;
  },
};

