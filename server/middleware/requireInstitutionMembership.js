import InstitutionMembership from "../models/institutionMembershipModel.js";
import User from "../models/userModel.js";
import { apiError } from "../utils/apiErrors.js";
import { can, normalizeRole, PERMISSIONS, ROLES } from "../utils/permissions.js";

const requireInstitutionMembership = async (req, res, next) => {
  try {
    if (!req.userId) {
      return apiError(res, 401, "UNAUTHENTICATED");
    }
    if (!req.tenantId) {
      return res.status(400).json({ success: false, message: "Choose an institution to continue." });
    }
    const user = await User.findById(req.userId).select("tenantId role");
    if (!user) return apiError(res, 401, "UNAUTHENTICATED");
    const userRole = normalizeRole(user?.role);
    if (await can({
      permission: PERMISSIONS.USE_EDUCATOR_WORKSPACE,
      userId: req.userId,
      userRole,
      userTenantId: user?.tenantId,
      tenantId: req.tenantId,
    })) return next();
    if (userRole === ROLES.EDUCATOR || userRole === ROLES.PLATFORM_ADMIN) return apiError(res, 403, "INSTITUTION_ACCESS_DENIED");

    const membership = await InstitutionMembership.findOne({
      userId: req.userId,
      tenantId: req.tenantId,
      role: "student",
      status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
    }).select("_id");
    if (!membership) {
      return apiError(res, 403, "INSTITUTION_ACCESS_DENIED");
    }
    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not verify institution access." });
  }
};

export default requireInstitutionMembership;
