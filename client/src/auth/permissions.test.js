import assert from "node:assert/strict";
import { canManageCourse, canUseEducatorWorkspace, friendlyAuthorizationMessage, getRoleLabel, ROLES } from "./permissions.js";

assert.equal(canUseEducatorWorkspace({ role: ROLES.EDUCATOR }), true);
assert.equal(canUseEducatorWorkspace({ role: ROLES.PLATFORM_ADMIN }), true);
assert.equal(canUseEducatorWorkspace({ role: ROLES.STUDENT }), false);
assert.equal(getRoleLabel({ role: ROLES.EDUCATOR }), "Educator");
assert.equal(getRoleLabel({ role: ROLES.PLATFORM_ADMIN }), "Platform Admin");
assert.equal(canManageCourse({ role: ROLES.EDUCATOR, _id: "u1" }, { creator: "u1", tenantId: "t1" }), true);
assert.equal(canManageCourse({ role: ROLES.EDUCATOR, _id: "u1", tenantId: "t1", isInstitutionOwner: true }, { creator: "u2", tenantId: "t1" }), true);
assert.equal(canManageCourse({ role: ROLES.EDUCATOR, _id: "u1", tenantId: "t1", isInstitutionOwner: true }, { creator: "u2", tenantId: "t2" }), false);
assert.equal(canManageCourse({ role: ROLES.STUDENT, _id: "u1", tenantId: "t1", isInstitutionOwner: true }, { creator: "u2", tenantId: "t1" }), false);
assert.equal(friendlyAuthorizationMessage({ response: { status: 403, data: { message: "requires one of [educator]" } } }), "You don't have permission to perform this action.");
console.log("[PASS] Frontend role, owner-context, and authorization messaging follow the canonical policy");
