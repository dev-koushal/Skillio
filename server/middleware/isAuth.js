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
      if (!sessionValidation.isValid || sessionValidation.isRevoked) {
        return res.status(401).json({
          success: false,
          code: "SESSION_REVOKED",
          message: "Your account was signed in on another device.",
        });
      }
    }

    // Multi-tenant security check:
    // If the token has a tenantId, verify tenant context matches
    if (decoded.tenantId && req.tenantId) {
      if (decoded.tenantId.toString() !== req.tenantId.toString()) {
        if (decoded.role === "platform_admin") {
          // Platform admin has global access across tenants
        } else if (decoded.role === "student") {
          // Students may belong to multiple institutions: verify active membership in req.tenantId
          const membership = await InstitutionMembership.findOne({
            userId: decoded.userId,
            tenantId: req.tenantId,
            status: { $in: ["ACTIVE", "ENROLLED"] },
          });
          if (!membership) {
            return res.status(403).json({
              success: false,
              message: "Cross-tenant access forbidden. You are not an enrolled member of this institution.",
              code: "CROSS_TENANT_FORBIDDEN",
            });
          }
        } else {
          // Educators & admins are strictly bound to their single assigned institution
          return res.status(403).json({
            success: false,
            message: "Cross-tenant access forbidden. Please sign in to your assigned organization.",
            code: "CROSS_TENANT_FORBIDDEN",
          });
        }
      }
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
