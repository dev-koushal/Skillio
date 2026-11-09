import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import sessionService from "../services/session/sessionService.js";

const isAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required! No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: "Invalid authentication token!" });
    }

    // Attach decoded user info
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.sessionId = decoded.sessionId;

    // Server-side Session Management: Maximum 2 Active Devices Enforcement
    if (decoded.sessionId) {
      const sessionValidation = await sessionService.validateSession(decoded.userId, decoded.sessionId);
      if (sessionValidation.isRevoked) {
        return res.status(401).json({
          success: false,
          code: "SESSION_REVOKED",
          message: "Your account was signed in on another device.",
        });
      }
    }

    // Exempt user profile / account endpoints from cross-tenant restriction
    const requestUrl = req.originalUrl || req.url || "";
    const isAccountEndpoint =
      requestUrl.includes("/api/user/getcurrentuser") ||
      requestUrl.includes("/api/user/profile") ||
      requestUrl.includes("/api/auth/logout") ||
      requestUrl.includes("/api/user/changepassword");

    if (isAccountEndpoint) {
      return next();
    }

    // Multi-tenant context and security check:
    if (decoded.role === "platform_admin") {
      // Platform admin has global access across all tenants
      return next();
    }

    // For educators & tenant admins: their assigned institution is their operating tenant context
    if (decoded.role === "educator" || decoded.role === "tenant_admin") {
      const explicitHeaderSlug = req.headers["x-tenant-slug"]?.toString().trim().toLowerCase();
      const hasExplicitTargetTenant = explicitHeaderSlug && !["platform", "default"].includes(explicitHeaderSlug);

      // If educator didn't explicitly target an alien institution, scope req.tenantId to their owned/assigned institution
      if (!hasExplicitTargetTenant && decoded.tenantId) {
        req.tenantId = decoded.tenantId;
        return next();
      }

      // If educator explicitly targeted another tenant that doesn't match their assigned institution
      if (hasExplicitTargetTenant && decoded.tenantId && req.tenantId &&
          decoded.tenantId.toString() !== req.tenantId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Cross-tenant access forbidden. Please sign in to your assigned organization.",
          code: "CROSS_TENANT_FORBIDDEN",
        });
      }
      return next();
    }

    // For students: students are users who can browse, enroll, and learn across institutions
    if (decoded.role === "student") {
      if (decoded.tenantId && req.tenantId && decoded.tenantId.toString() !== req.tenantId.toString()) {
        const membership = await InstitutionMembership.findOne({
          userId: decoded.userId,
          tenantId: req.tenantId,
          status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
        });

        // Enforce cross-tenant isolation on private student enrolled/management routes
        const isPrivateInstitutionRoute = requestUrl.includes("/enrolled-courses") || requestUrl.includes("/institution-private");
        if (isPrivateInstitutionRoute && !membership) {
          return res.status(403).json({
            success: false,
            message: "Cross-tenant access forbidden. You are not an enrolled member of this institution.",
            code: "CROSS_TENANT_FORBIDDEN",
          });
        }
      }
      return next();
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: `Authentication failed: ${error.message || error}`,
    });
  }
};

export default isAuth;
