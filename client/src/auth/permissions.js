export const ROLES = Object.freeze({
  STUDENT: "student",
  EDUCATOR: "educator",
  PLATFORM_ADMIN: "platform_admin",
});

export const PERMISSIONS = Object.freeze({
  USE_EDUCATOR_WORKSPACE: "use_educator_workspace",
  MANAGE_INSTITUTION: "manage_institution",
  MANAGE_COURSES: "manage_courses",
  MANAGE_STUDENTS: "manage_students",
  MANAGE_LIVE_CLASSES: "manage_live_classes",
});

export const hasRole = (user, role) => user?.role === role;
export const getRoleLabel = (user) => {
  if (hasRole(user, ROLES.PLATFORM_ADMIN)) return "Platform Admin";
  if (hasRole(user, ROLES.EDUCATOR)) return "Educator";
  if (hasRole(user, ROLES.STUDENT)) return "Student";
  return "Account";
};
export const canUseEducatorWorkspace = (user) =>
  hasRole(user, ROLES.EDUCATOR) || hasRole(user, ROLES.PLATFORM_ADMIN);
export const canManagePlatform = (user) => hasRole(user, ROLES.PLATFORM_ADMIN);
export const canManageCourse = (user, course) => {
  if (canManagePlatform(user)) return true;
  const courseCreator = typeof course?.creator === "string" ? course.creator : course?.creator?._id;
  if (user?._id && courseCreator?.toString() === user._id.toString()) return true;
  const userTenantId = user?.tenantId?.toString?.() || user?.tenantId;
  const courseTenantId = course?.tenantId?.toString?.() || course?.tenantId;
  return Boolean(user?.role === ROLES.EDUCATOR && user?.isInstitutionOwner && userTenantId && userTenantId === courseTenantId);
};

export const friendlyAuthorizationMessage = (error) => {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  if (code === "SESSION_REVOKED") return "Your account was signed in on another device.";
  if (status === 401 || code === "UNAUTHENTICATED") return "Your session has expired. Sign in to continue.";
  if (code === "INSTITUTION_ACCESS_DENIED") return "You don't have permission to manage this institution.";
  if (code === "RESOURCE_ACCESS_DENIED") return "You don't have access to this content.";
  if (code === "TENANT_SUSPENDED") return "This institution is currently unavailable.";
  if (status === 403 || code === "FORBIDDEN" || code === "ROLE_REQUIRED") return "You don't have permission to perform this action.";
  return error?.response?.data?.message || error?.message || "The request could not be completed.";
};
