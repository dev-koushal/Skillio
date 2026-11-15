import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import sessionService from "../services/session/sessionService.js";
import { apiError } from "../utils/apiErrors.js";
import { normalizeRole, ROLES } from "../utils/permissions.js";

const isAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return apiError(res, 401, "UNAUTHENTICATED");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return apiError(res, 401, "UNAUTHENTICATED");
    }

    // Attach decoded user info
    req.userId = decoded.userId;
    // Allow sessions issued before the educator/ownership permission migration to
    // continue with the canonical educator role until the next sign-in.
    req.userRole = normalizeRole(decoded.role);
    req.sessionId = decoded.sessionId;

    // Server-side Session Management: Maximum 2 Active Devices Enforcement
    if (decoded.sessionId) {
      const sessionValidation = await sessionService.validateSession(decoded.userId, decoded.sessionId);
      if (sessionValidation.isRevoked) {
        return apiError(res, 401, "SESSION_REVOKED", "Your account was signed in on another device.");
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
    if (req.userRole === ROLES.PLATFORM_ADMIN) {
      // Platform admin has global access across all tenants
      return next();
    }

    // Educators operate within their assigned institution context.
    if (req.userRole === ROLES.EDUCATOR) {
      let educatorTenant = null;
      try {
        educatorTenant = await Tenant.findOne({ ownerId: req.userId, status: "active" });
      } catch (err) {
        console.warn("[isAuth] error finding owned tenant:", err.message);
      }

      if (!educatorTenant) {
        try {
          const userDoc = await User.findById(req.userId).select("tenantId");
          if (userDoc?.tenantId) {
            const assigned = await Tenant.findById(userDoc.tenantId);
            if (assigned && assigned.status === "active" && !["default", "platform"].includes(assigned.slug)) {
              educatorTenant = assigned;
            }
          }
        } catch (err) {
          console.warn("[isAuth] error finding assigned tenant:", err.message);
        }
      }

      if (!educatorTenant && decoded.tenantId) {
        try {
          const assigned = await Tenant.findById(decoded.tenantId);
          if (assigned && assigned.status === "active" && !["default", "platform"].includes(assigned.slug)) {
            educatorTenant = assigned;
          }
        } catch (err) {
          console.warn("[isAuth] error finding decoded tenant:", err.message);
        }
      }

      if (educatorTenant) {
        req.tenantId = educatorTenant._id;
        req.tenant = educatorTenant;
        req.userTenantId = educatorTenant._id;
        return next();
      }

      if (decoded.tenantId) {
        req.tenantId = decoded.tenantId;
        req.userTenantId = decoded.tenantId;
      }
      return next();
    }

    // For students: students are users who can browse, enroll, and learn across institutions
    if (req.userRole === ROLES.STUDENT) {
      if (decoded.tenantId && req.tenantId && decoded.tenantId.toString() !== req.tenantId.toString()) {
        const membership = await InstitutionMembership.findOne({
          userId: decoded.userId,
          tenantId: req.tenantId,
          status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
        });

        // Enforce cross-tenant isolation on private student enrolled/management routes
        const isPrivateInstitutionRoute = requestUrl.includes("/enrolled-courses") || requestUrl.includes("/institution-private");
        if (isPrivateInstitutionRoute && !membership) {
          console.warn(`[Authorization] student membership denied user=${req.userId} tenant=${req.tenantId}`);
          return apiError(res, 403, "INSTITUTION_ACCESS_DENIED");
        }
      }
      return next();
    }

    next();
  } catch (error) {
    console.warn("[Authentication] token/session verification failed", error.message);
    return apiError(res, 401, "UNAUTHENTICATED");
  }
};

export default isAuth;
