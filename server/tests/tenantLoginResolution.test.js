import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import sessionService from "../services/session/sessionService.js";
import { login } from "../controller/authController.js";

const originals = {
  userFind: User.find,
  userFindOne: User.findOne,
  userFindById: User.findById,
  tenantFindOne: Tenant.findOne,
  tenantFindById: Tenant.findById,
  membershipFind: InstitutionMembership.find,
  membershipFindOne: InstitutionMembership.findOne,
  createSession: sessionService.createSession,
  jwtSecret: process.env.JWT_SECRET,
};

const createResponse = () => ({
  statusCode: 200,
  data: null,
  cookie() {},
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.data = payload; return this; },
});

const query = (value) => ({
  select() { return this; },
  populate() { return this; },
  lean: async () => value,
  limit() { return this; },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});

const primaryStudent = {
  _id: "student_a",
  name: "Mira",
  email: "mira@example.test",
  password: await bcrypt.hash("correct-password", 4),
  role: "student",
  tenantId: "tenant_a",
  enrolledCourses: [],
  toObject() { return { ...this }; },
};
const tenantA = { _id: "tenant_a", name: "Academy A", slug: "academy-a", logo: "/a.png", institutionType: "Academy" };
const tenantB = { _id: "tenant_b", name: "Academy B", slug: "academy-b", logo: "/b.png", institutionType: "College" };
const membershipLookups = [];

try {
  process.env.JWT_SECRET = "tenant_login_resolution_test_secret";
  User.findOne = async (filter) => filter.email === primaryStudent.email && filter.tenantId === "tenant_a"
    ? primaryStudent
    : null;
  User.findById = () => query(primaryStudent);
  User.find = () => query([]);
  Tenant.findOne = async () => null;
  Tenant.findById = () => query(tenantA);
  InstitutionMembership.find = () => ({
    populate: async () => [
      { tenantId: tenantA, joinedAt: new Date("2026-01-01T00:00:00Z") },
      { tenantId: tenantB, joinedAt: new Date("2026-02-01T00:00:00Z") },
    ],
  });
  InstitutionMembership.findOne = async (filter) => {
    membershipLookups.push(filter);
    return { status: "active" };
  };
  sessionService.createSession = async () => ({ sessionId: "session_a" });

  const multiMembershipResponse = createResponse();
  await login({
    body: { email: primaryStudent.email, password: "correct-password", role: "student" },
    tenantId: "tenant_a",
    headers: {},
  }, multiMembershipResponse);
  assert.equal(multiMembershipResponse.statusCode, 200);
  assert.deepEqual(multiMembershipResponse.data.user.memberships.map((entry) => entry.slug), ["academy-a", "academy-b"]);
  console.log("[PASS] Tenant login returns all memberships and resolves the sign-in tenant consistently");

  User.findOne = async () => null;
  User.find = () => query([
    { _id: "student_a", role: "student", tenantId: "tenant_a" },
  ]);
  InstitutionMembership.findOne = async (filter) => {
    membershipLookups.push(filter);
    return filter.tenantId === "tenant_a" && filter.userId === "student_a" ? { status: "active" } : null;
  };
  const duplicateResponse = createResponse();
  await login({
    body: { email: primaryStudent.email, password: "correct-password", role: "student" },
    tenantId: "tenant_a",
    headers: {},
  }, duplicateResponse);
  assert.equal(duplicateResponse.statusCode, 200);
  assert.equal(duplicateResponse.data.success, true);
  assert.equal(duplicateResponse.data.code, undefined);
  assert.ok(duplicateResponse.data.user);
  console.log("[PASS] Student login resolves the account before institution selection");
} finally {
  User.find = originals.userFind;
  User.findOne = originals.userFindOne;
  User.findById = originals.userFindById;
  Tenant.findOne = originals.tenantFindOne;
  Tenant.findById = originals.tenantFindById;
  InstitutionMembership.find = originals.membershipFind;
  InstitutionMembership.findOne = originals.membershipFindOne;
  sessionService.createSession = originals.createSession;
  if (typeof originals.jwtSecret === "undefined") delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originals.jwtSecret;
}
