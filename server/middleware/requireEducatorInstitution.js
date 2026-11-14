import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import { ROLES } from "../utils/permissions.js";

/** Refuse educator publishing when the account has no real institution. */
export default async function requireEducatorInstitution(req, res, next) {
  if (req.userRole === ROLES.PLATFORM_ADMIN) return next();
  if (req.userRole !== ROLES.EDUCATOR && req.userRole !== "tenant_admin") return next();
  try {
    const user = await User.findById(req.userId).select("tenantId role");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    // Resolve the educator's owned active institution first
    let validTenant = await Tenant.findOne({ ownerId: req.userId, status: "active" });
    if (!validTenant && user.tenantId) {
      const assigned = await Tenant.findById(user.tenantId);
      if (assigned && assigned.status === "active" && !["default", "platform"].includes(assigned.slug)) {
        validTenant = assigned;
      }
    } else if (!validTenant && req.tenantId) {
      const requestTenant = await Tenant.findById(req.tenantId);
      if (requestTenant && requestTenant.status === "active" && !["default", "platform"].includes(requestTenant.slug)) {
        if (requestTenant.ownerId?.toString() === req.userId?.toString()) {
          validTenant = requestTenant;
        }
      }
    }

    if (!validTenant || ["default", "platform"].includes(validTenant.slug)) {
      return res.status(403).json({
        success: false,
        code: "INSTITUTION_REQUIRED",
        message: "Create your institution first. Your institution is the home for your courses, students, notes and learning content.",
      });
    }

    req.tenantId = validTenant._id;
    req.tenant = validTenant;
    next();
  } catch (error) {
    console.error("[Educator institution guard]", error);
    return res.status(500).json({ success: false, message: "Could not verify your institution." });
  }
}
