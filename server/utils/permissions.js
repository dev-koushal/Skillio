import mongoose from "mongoose";
import Tenant from "../models/tenantModel.js";

export const ROLES = Object.freeze({
  STUDENT: "student",
  EDUCATOR: "educator",
  PLATFORM_ADMIN: "platform_admin",
});
export const isEducatorRole = (role) => role === ROLES.EDUCATOR || role === ROLES.PLATFORM_ADMIN;
export const normalizeRole = (role) => role === "tenant_admin" ? ROLES.EDUCATOR : role;

export const PERMISSIONS = Object.freeze({
  USE_EDUCATOR_WORKSPACE: "use_educator_workspace",
  MANAGE_INSTITUTION: "manage_institution",
  CREATE_COURSE: "create_course",
  MANAGE_COURSE: "manage_course",
  MANAGE_STUDENTS: "manage_students",
  MANAGE_LIVE_CLASSES: "manage_live_classes",
  MANAGE_PLATFORM: "manage_platform",
});

const idString = (value) => value?.toString?.() || "";

/** The single backend policy for role and institution-owner permissions. */
export async function can({ permission, userId, userRole, userTenantId = null, tenantId, resource = null }) {
  if (userRole === ROLES.PLATFORM_ADMIN) return true;
  if (permission === PERMISSIONS.MANAGE_PLATFORM) return false;
  if (userRole !== ROLES.EDUCATOR || !userId) return false;

  if (permission === PERMISSIONS.USE_EDUCATOR_WORKSPACE) {
    if (tenantId && idString(userTenantId) === idString(tenantId)) return true;
    if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId) || !mongoose.Types.ObjectId.isValid(userId)) return false;
    return Boolean(await Tenant.exists({ _id: tenantId, ownerId: userId }));
  }

  if (permission === PERMISSIONS.MANAGE_COURSE && resource?.creator) {
    if (idString(resource.creator) === idString(userId)) return true;
  }

  const ownerPermissions = [
    PERMISSIONS.MANAGE_INSTITUTION,
    PERMISSIONS.CREATE_COURSE,
    PERMISSIONS.MANAGE_COURSE,
    PERMISSIONS.MANAGE_STUDENTS,
    PERMISSIONS.MANAGE_LIVE_CLASSES,
  ];
  if (!ownerPermissions.includes(permission)) return false;

  // An educator's institution assignment is stored on the authenticated user.
  // It grants teaching operations within that tenant, while institution-wide
  // branding/settings remain restricted to the institution owner.
  const assignedTeachingPermissions = [
    PERMISSIONS.CREATE_COURSE,
    PERMISSIONS.MANAGE_COURSE,
    PERMISSIONS.MANAGE_STUDENTS,
    PERMISSIONS.MANAGE_LIVE_CLASSES,
  ];
  if (assignedTeachingPermissions.includes(permission) && tenantId && idString(userTenantId) === idString(tenantId)) return true;

  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId) || !mongoose.Types.ObjectId.isValid(userId)) return false;
  return Boolean(await Tenant.exists({ _id: tenantId, ownerId: userId }));
}

export const isInstitutionOwner = (context) => can({
  ...context,
  permission: PERMISSIONS.MANAGE_INSTITUTION,
});


export const canManageResource = async ({ course, resource = null, ...context }) => {
  if (resource?.uploadedBy && idString(resource.uploadedBy) === idString(context.userId)) return true;
  return canManageCourse({ course, ...context });
};

export const canManageCourse = ({ course, ...context }) => can({
  ...context,
  permission: PERMISSIONS.MANAGE_COURSE,
  resource: course,
});
