import assert from "node:assert/strict";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import { joinInstitution, selectInstitution } from "../controller/authController.js";

const originals = {
  userFindById: User.findById,
  tenantFindOne: Tenant.findOne,
  membershipFindOne: InstitutionMembership.findOne,
  membershipFind: InstitutionMembership.find,
  membershipCreate: InstitutionMembership.create,
  jwtSecret: process.env.JWT_SECRET,
};

const user = {
  _id: "student_1",
  role: "student",
  tenantId: "tenant_old",
  save: async () => {},
  toObject() { return { ...this }; },
};
const tenant = {
  _id: "tenant_new",
  name: "New Academy",
  slug: "new-academy",
  logo: "/logo.png",
  institutionType: "College",
  title: "Learn well",
  toObject() { return { ...this }; },
};
const res = () => ({
  statusCode: 200,
  data: null,
  cookie() {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.data = body; return this; },
});

try {
  process.env.JWT_SECRET = "institution_selection_controller_test_secret";
  User.findById = async () => user;
  Tenant.findOne = () => ({
    select: async () => tenant,
  });
  InstitutionMembership.find = () => ({
    populate: async () => [{
      tenantId: tenant,
      joinedAt: new Date("2026-11-01T00:00:00.000Z"),
    }],
  });
  let createdMembershipCount = 0;
  InstitutionMembership.create = async () => { createdMembershipCount += 1; return { status: "active" }; };

  InstitutionMembership.findOne = async (filter) => filter.tenantId === "tenant_new"
    ? null
    : { status: "active" };
  const noMembershipResponse = res();
  await selectInstitution({ body: { institutionSlug: "new-academy" }, userId: "student_1", sessionId: "session_1" }, noMembershipResponse);
  assert.equal(noMembershipResponse.statusCode, 403);
  assert.equal(createdMembershipCount, 0, "selection must not create membership implicitly");
  assert.equal(user.tenantId, "tenant_old", "failed selection must not change the user's tenant");

  InstitutionMembership.findOne = async (filter) => filter.tenantId === "tenant_new"
    ? { status: "active" }
    : null;
  const membershipResponse = res();
  await selectInstitution({ body: { institutionSlug: "new-academy" }, userId: "student_1", sessionId: "session_1" }, membershipResponse);
  assert.equal(membershipResponse.statusCode, 200);
  assert.equal(membershipResponse.data.user.tenant.slug, "new-academy");
  assert.deepEqual(membershipResponse.data.user.memberships.map((entry) => entry.slug), ["new-academy"]);
  assert.equal(createdMembershipCount, 0);

  InstitutionMembership.findOne = async () => null;
  const joinResponse = res();
  await joinInstitution({ body: { institutionSlug: "new-academy" }, userId: "student_1", sessionId: "session_1" }, joinResponse);
  assert.equal(joinResponse.statusCode, 200, "an explicit join action creates membership for a signed-in student");
  assert.equal(createdMembershipCount, 1);
  assert.deepEqual(joinResponse.data.user.memberships.map((entry) => entry.slug), ["new-academy"]);

  InstitutionMembership.findOne = async () => ({ status: "suspended" });
  const suspendedJoinResponse = res();
  await joinInstitution({ body: { institutionSlug: "new-academy" }, userId: "student_1", sessionId: "session_1" }, suspendedJoinResponse);
  assert.equal(suspendedJoinResponse.statusCode, 403, "self-join cannot reactivate a suspended membership");
  assert.equal(createdMembershipCount, 1);
  console.log("[PASS] Institution selection stays membership-only; explicit joins create membership and cannot reactivate suspended users");
} finally {
  User.findById = originals.userFindById;
  Tenant.findOne = originals.tenantFindOne;
  InstitutionMembership.findOne = originals.membershipFindOne;
  InstitutionMembership.find = originals.membershipFind;
  InstitutionMembership.create = originals.membershipCreate;
  if (typeof originals.jwtSecret === "undefined") delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originals.jwtSecret;
}
