import assert from "node:assert/strict";
import { mergeEnrollmentUser } from "./enrollmentUser.js";

const membership = { slug: "north-academy", institutionId: "tenant-1" };
const current = { _id: "student-1", role: "student", memberships: [membership], tenantId: "tenant-1" };
const updated = mergeEnrollmentUser(current, { _id: "student-1", enrolledCourses: ["course-1"] });
assert.deepEqual(updated.memberships, [membership], "partial payment response must preserve student memberships");
assert.equal(updated.tenantId, "tenant-1");
assert.deepEqual(updated.enrolledCourses, ["course-1"]);
assert.deepEqual(mergeEnrollmentUser(current, { memberships: [] }).memberships, [membership], "an empty partial membership field must not erase the active institution");
console.log("[PASS] Payment enrollment updates retain institution context and avoid returning students to institution selection");
