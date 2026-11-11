import assert from "node:assert/strict";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import sessionService from "../services/session/sessionService.js";
import { signUp } from "../controller/authController.js";

const joinedAt = new Date("2026-11-11T12:00:00.000Z");
const tenant = {
  _id: "tenant_aurora",
  name: "Aurora Learning Centre",
  slug: "aurora",
  logo: "/aurora.png",
  title: "Aurora courses",
  institutionType: "College",
};

const originals = {
  tenantFindOne: Tenant.findOne,
  tenantFindById: Tenant.findById,
  userFindOne: User.findOne,
  userCreate: User.create,
  userDeleteOne: User.deleteOne,
  membershipCreate: InstitutionMembership.create,
  createSession: sessionService.createSession,
  jwtSecret: process.env.JWT_SECRET,
};

const makeTenantQuery = () => ({
  select() { return this; },
  lean: async () => tenant,
  then(resolve, reject) { return Promise.resolve(tenant).then(resolve, reject); },
});

const createResponse = () => ({
  statusCode: 200,
  data: null,
  cookie() {},
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.data = payload; return this; },
});

const createRequest = () => ({
  body: {
    name: "Avery Student",
    email: "avery@example.test",
    password: "password-at-least-eight",
    role: "student",
    institutionSlug: "aurora",
  },
  tenantId: "tenant_default",
  headers: { "user-agent": "institution-signup-test" },
  ip: "127.0.0.1",
});

try {
  process.env.JWT_SECRET = "signup_membership_contract_test_secret";
  Tenant.findOne = async () => tenant;
  Tenant.findById = makeTenantQuery;
  User.findOne = async () => null;
  User.create = async (input) => ({
    ...input,
    _id: "student_1",
    toObject() { return { ...this }; },
  });
  InstitutionMembership.create = async () => ({ joinedAt });
  sessionService.createSession = async () => ({ sessionId: "session_signup_test" });
  User.deleteOne = async () => ({ deletedCount: 1 });

  const response = createResponse();
  await signUp(createRequest(), response);

  assert.equal(response.statusCode, 201);
  assert.equal(response.data.user.password, undefined, "signup response must not expose a password hash");
  assert.equal(response.data.user.tenant.slug, "aurora");
  assert.deepEqual(response.data.user.memberships, [{
    institutionId: "tenant_aurora",
    name: "Aurora Learning Centre",
    slug: "aurora",
    logo: "/aurora.png",
    title: "Aurora courses",
    institutionType: "College",
    joinedAt,
  }], "new student signup must return the membership needed by institution route guards");
  console.log("[PASS] Student signup returns the selected institution membership without exposing the password");

  let rolledBack = false;
  User.create = async (input) => ({ ...input, _id: "student_rollback", toObject() { return { ...this }; } });
  InstitutionMembership.create = async () => { throw new Error("membership store unavailable"); };
  User.deleteOne = async ({ _id }) => { rolledBack = _id === "student_rollback"; return { deletedCount: 1 }; };
  const failedResponse = createResponse();
  await signUp(createRequest(), failedResponse);
  assert.equal(rolledBack, true, "failed membership creation must not leave an account that cannot enter an institution");
  assert.equal(failedResponse.statusCode, 400);
  console.log("[PASS] Failed student membership creation rolls back the incomplete account");
} finally {
  if (typeof originals.jwtSecret === "undefined") delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originals.jwtSecret;
  Tenant.findOne = originals.tenantFindOne;
  Tenant.findById = originals.tenantFindById;
  User.findOne = originals.userFindOne;
  User.create = originals.userCreate;
  User.deleteOne = originals.userDeleteOne;
  InstitutionMembership.create = originals.membershipCreate;
  sessionService.createSession = originals.createSession;
}
