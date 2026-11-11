import assert from "node:assert/strict";
import crypto from "node:crypto";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import Course from "../models/coursesModel.js";
import Invitation from "../models/invitationModel.js";
import { inviteStudent } from "../controller/institutionStudentController.js";

const originals = {
  nodeEnv: process.env.NODE_ENV,
  userFindById: User.findById,
  userFindOne: User.findOne,
  tenantFindOne: Tenant.findOne,
  courseFindOne: Course.findOne,
  invitationCreate: Invitation.create,
};
const tenant = { _id: "tenant_test", name: "North Academy" };
let createdInvitation = null;
let queriedCourse = null;
const response = () => ({
  statusCode: 200,
  data: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.data = payload; return this; },
});

try {
  process.env.NODE_ENV = "test";
  User.findById = async () => ({ _id: "platform_admin_1", role: "platform_admin", tenantId: null });
  User.findOne = async () => { throw new Error("invite must not create/find accounts or touch reset-password state"); };
  Tenant.findOne = async () => tenant;
  Course.findOne = async (filter) => {
    queriedCourse = filter;
    return filter._id === "course_a" ? { _id: "course_a", title: "Assigned course" } : null;
  };
  Invitation.create = async (doc) => {
    createdInvitation = doc;
    return { _id: "invite_1", expiresAt: doc.expiresAt };
  };

  const res = response();
  await inviteStudent({
    userId: "platform_admin_1",
    tenantId: tenant._id,
    headers: { origin: "https://north.example" },
    body: { name: "Learner One", email: "Learner@Example.test", courseId: "course_a" },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(queriedCourse, { _id: "course_a", tenantId: tenant._id });
  assert.equal(createdInvitation.tenantId, tenant._id);
  assert.equal(createdInvitation.courseId, "course_a");
  assert.equal(createdInvitation.invitedEmail, "learner@example.test");
  assert.equal(crypto.createHash("sha256").update(new URL(res.data.inviteUrl).searchParams.get("token")).digest("hex"), createdInvitation.tokenHash);
  assert.equal(res.data.emailDelivered, false, "test mode must not send real email");
  assert.equal(res.data.student.id, undefined, "inviting must not create a premature student account");
  console.log("[PASS] Teacher invite creates a hashed, course-scoped acceptance link and never invokes password reset/account creation");

  createdInvitation = null;
  const invalidRes = response();
  await inviteStudent({
    userId: "platform_admin_1",
    tenantId: tenant._id,
    headers: { origin: "https://north.example" },
    body: { name: "Learner Two", email: "learner2@example.test", courseId: "foreign_or_missing_course" },
  }, invalidRes);
  assert.equal(invalidRes.statusCode, 404);
  assert.equal(createdInvitation, null, "invalid course must not result in an invitation");
  console.log("[PASS] Teacher cannot create an invitation for a course outside the resolved institution");
} finally {
  if (originals.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originals.nodeEnv;
  User.findById = originals.userFindById;
  User.findOne = originals.userFindOne;
  Tenant.findOne = originals.tenantFindOne;
  Course.findOne = originals.courseFindOne;
  Invitation.create = originals.invitationCreate;
}
