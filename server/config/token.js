import jwt from "jsonwebtoken";

export const genToken = async (userId, tenantId = null, role = "student", sessionId = null) => {
  try {
    const payload = { userId };
    if (tenantId) {
      payload.tenantId = tenantId.toString();
    }
    if (role) {
      payload.role = role;
    }
    if (sessionId) {
      payload.sessionId = sessionId;
    }
    const token = await jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
    return token;
  } catch (error) {
    console.error("[TokenGen] Error signing token:", error);
    throw error;
  }
};
