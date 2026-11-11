import { AUTH_MESSAGES } from "../utils/apiErrors.js";

const canonicalForbiddenCode = (body = {}) => {
  if (body.code === "TENANT_SUSPENDED") return "TENANT_SUSPENDED";
  if (body.code === "INSTITUTION_ACCESS_DENIED" || body.code === "INSTITUTION_MEMBERSHIP_REQUIRED" || body.code === "CROSS_TENANT_FORBIDDEN") {
    return "INSTITUTION_ACCESS_DENIED";
  }
  if (body.code === "RESOURCE_ACCESS_DENIED" || body.accessDenied) return "RESOURCE_ACCESS_DENIED";
  return "FORBIDDEN";
};

/** Normalize every controller/middleware 401 and 403 at the HTTP boundary. */
export default function standardizeAuthorizationResponses(req, res, next) {
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 401) {
      const revoked = body?.code === "SESSION_REVOKED";
      return sendJson({
        success: false,
        code: revoked ? "SESSION_REVOKED" : "UNAUTHENTICATED",
        message: revoked ? "Your account was signed in on another device." : AUTH_MESSAGES.UNAUTHENTICATED,
      });
    }
    if (res.statusCode === 403) {
      const code = canonicalForbiddenCode(body);
      return sendJson({
        success: false,
        code,
        message: AUTH_MESSAGES[code] || AUTH_MESSAGES.FORBIDDEN,
      });
    }
    return sendJson(body);
  };
  next();
}
