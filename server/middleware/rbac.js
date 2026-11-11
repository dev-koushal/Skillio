import User from "../models/userModel.js";
import { can, normalizeRole, PERMISSIONS, ROLES } from "../utils/permissions.js";
import { apiError, AUTH_MESSAGES } from "../utils/apiErrors.js";

export const requirePermission = (permission) => async (req, res, next) => {
  try {
    if (!req.userId) return apiError(res, 401, "UNAUTHENTICATED");
    const user = await User.findById(req.userId);
    if (!user) return apiError(res, 401, "UNAUTHENTICATED");

    const userRole = normalizeRole(user.role);
    const allowed = await can({
      permission,
      userId: user._id,
      userRole,
      userTenantId: user.tenantId,
      tenantId: req.tenantId,
    });
    if (!allowed) {
      const institutionPermission = [PERMISSIONS.MANAGE_INSTITUTION, PERMISSIONS.MANAGE_STUDENTS, PERMISSIONS.MANAGE_LIVE_CLASSES].includes(permission);
      console.warn(`[Authorization] permission denied user=${req.userId} permission=${permission} tenant=${req.tenantId}`);
      return apiError(res, 403, institutionPermission ? "INSTITUTION_ACCESS_DENIED" : "FORBIDDEN");
    }

    req.userRole = userRole;
    req.userTenantId = user.tenantId;
    req.isInstitutionOwner = userRole === ROLES.PLATFORM_ADMIN ||
      Boolean(await can({ permission: PERMISSIONS.MANAGE_INSTITUTION, userId: user._id, userRole, userTenantId: user.tenantId, tenantId: req.tenantId }));
    return next();
  } catch (error) {
    console.error("[Authorization] permission check failed", error);
    return apiError(res, 500, "AUTHORIZATION_UNAVAILABLE", "Authorization could not be verified. Please try again.");
  }
};

export const requirePlatformAdmin = requirePermission(PERMISSIONS.MANAGE_PLATFORM);
export const requireEducator = requirePermission(PERMISSIONS.USE_EDUCATOR_WORKSPACE);
export const requireInstitutionOwner = requirePermission(PERMISSIONS.MANAGE_INSTITUTION);
export const requireInstitutionStudentManager = requirePermission(PERMISSIONS.MANAGE_STUDENTS);
export const requireLiveClassManager = requirePermission(PERMISSIONS.MANAGE_LIVE_CLASSES);
export { AUTH_MESSAGES };
