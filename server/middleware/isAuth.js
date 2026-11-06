import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const isAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required! No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: "Invalid authentication token!" });
    }

    // Attach decoded user info
    req.userId = decoded.userId;

    // Multi-tenant security check:
    // If the token has a tenantId, verify it matches the current request tenant (unless user is platform_admin)
    if (decoded.tenantId && req.tenantId) {
      if (decoded.tenantId.toString() !== req.tenantId.toString()) {
        if (decoded.role !== "platform_admin") {
          return res.status(403).json({
            success: false,
            message: "Cross-tenant access forbidden. Please sign in to this organization.",
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
