import assert from "node:assert/strict";
import Tenant from "../models/tenantModel.js";
import User from "../models/userModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import { can, PERMISSIONS, ROLES } from "../utils/permissions.js";

const originalExists = Tenant.exists;
const ownedTenantId = "64f000000000000000000001";
const otherTenantId = "64f000000000000000000002";
const educatorId = "64f000000000000000000003";
Tenant.exists = async ({ _id, ownerId }) => _id.toString() === ownedTenantId && ownerId.toString() === educatorId;

try {
  assert.deepEqual(User.schema.path("role").enumValues.sort(), ["educator", "platform_admin", "student"]);
  assert.deepEqual(InstitutionMembership.schema.path("role").enumValues.sort(), ["educator", "student"]);
  assert.equal(await can({ permission: PERMISSIONS.MANAGE_INSTITUTION, userId: educatorId, userRole: ROLES.EDUCATOR, tenantId: ownedTenantId }), true);
  assert.equal(await can({ permission: PERMISSIONS.MANAGE_LIVE_CLASSES, userId: educatorId, userRole: ROLES.EDUCATOR, userTenantId: otherTenantId, tenantId: otherTenantId }), true, "an educator assigned to this tenant can manage its live classes");
  assert.equal(await can({ permission: PERMISSIONS.MANAGE_INSTITUTION, userId: educatorId, userRole: ROLES.EDUCATOR, userTenantId: otherTenantId, tenantId: otherTenantId }), false, "an assigned educator does not inherit owner-only branding access");
  assert.equal(await can({ permission: PERMISSIONS.MANAGE_STUDENTS, userId: educatorId, userRole: ROLES.EDUCATOR, userTenantId: ownedTenantId, tenantId: otherTenantId }), false, "an educator assignment cannot cross tenants");
  assert.equal(await can({ permission: PERMISSIONS.MANAGE_INSTITUTION, userId: educatorId, userRole: ROLES.EDUCATOR, tenantId: otherTenantId }), false);
  assert.equal(await can({ permission: PERMISSIONS.MANAGE_INSTITUTION, userId: educatorId, userRole: ROLES.STUDENT, tenantId: ownedTenantId }), false);
  assert.equal(await can({ permission: PERMISSIONS.MANAGE_LIVE_CLASSES, userId: educatorId, userRole: ROLES.PLATFORM_ADMIN, tenantId: otherTenantId }), true);
  assert.equal(await can({ permission: PERMISSIONS.MANAGE_COURSE, userId: educatorId, userRole: ROLES.EDUCATOR, tenantId: otherTenantId, resource: { creator: educatorId } }), true);
  console.log("[PASS] Canonical roles and owner-scoped permissions preserve student, educator, platform, and cross-tenant boundaries");
} finally {
  Tenant.exists = originalExists;
}
