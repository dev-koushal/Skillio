import User from "../models/userModel.js";

/**
 * Middleware to require specific roles.
 * Must be used after isAuth middleware (req.userId and req.tenantId present).
 */
export const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      // Check user role from DB if not already attached, scoping to tenant
      // Note: platform_admin can access across tenants if needed, but otherwise scoped to tenant
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      // Allow platform_admin anywhere
      if (user.role === "platform_admin") {
        req.userRole = user.role;
        return next();
      }

      // Strict tenant check: user must belong to active tenant
      if (user.tenantId.toString() !== req.tenantId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: user does not belong to this organization",
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: requires one of [${allowedRoles.join(", ")}] roles`,
        });
      }

      req.userRole = user.role;
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };
};

export const requirePlatformAdmin = requireRole(["platform_admin"]);
export const requireTenantAdmin = requireRole(["tenant_admin", "platform_admin"]);
export const requireEducator = requireRole(["educator", "tenant_admin", "platform_admin"]);
