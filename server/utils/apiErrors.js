export const AUTH_MESSAGES = Object.freeze({
  UNAUTHENTICATED: "You need to sign in to continue.",
  FORBIDDEN: "You don't have permission to perform this action.",
  INSTITUTION_ACCESS_DENIED: "You don't have permission to manage this institution.",
  RESOURCE_ACCESS_DENIED: "You don't have access to this content.",
  TENANT_SUSPENDED: "This institution is currently unavailable.",
});

export const apiError = (res, status, code, message = AUTH_MESSAGES[code] || "The request could not be completed.") =>
  res.status(status).json({ success: false, code, message });
