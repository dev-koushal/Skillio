import assert from "node:assert/strict";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import sessionService from "../services/session/sessionService.js";
import { createOrganizationByEducator, getMyInstitution, updateMyInstitution } from "../controller/tenantController.js";

const originals = {
  userFindById: User.findById,
  tenantFindOne: Tenant.findOne,
  tenantFindById: Tenant.findById,
  tenantExists: Tenant.exists,
  tenantCreate: Tenant.create,
  tenantDeleteOne: Tenant.deleteOne,
  membershipCreate: InstitutionMembership.create,
  membershipDeleteOne: InstitutionMembership.deleteOne,
  createSession: sessionService.createSession,
  jwtSecret: process.env.JWT_SECRET,
};
const defaultTenant = { _id: "tenant_default", slug: "default", name: "Skillio Academy" };
const createdTenant = {
  _id: "tenant_new",
  name: "Northstar Academy",
  slug: "northstar",
  ownerId: "educator_1",
};
const assignedTenant = {
  _id: "64f000000000000000000004",
  name: "Assigned Academy",
  slug: "assigned",
  ownerId: "64f000000000000000000003",
  title: "Assigned Academy",
  save: async () => { assignedTenant.saved = true; },
};
const educator = {
  _id: "educator_1",
  role: "educator",
  tenantId: defaultTenant._id,
  save: async () => {},
  toObject() { return { _id: this._id, role: this.role, tenantId: this.tenantId }; },
};
const makeResponse = () => ({
  statusCode: 200,
  data: null,
  cookie() {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.data = body; return this; },
});
const makeRequest = () => ({
  body: { name: "Northstar Academy", slug: "northstar" },
  userId: educator._id,
  userRole: "educator",
  tenantId: defaultTenant._id,
  headers: { "user-agent": "institution-create-test" },
  ip: "127.0.0.1",
});

try {
  process.env.JWT_SECRET = "institution_creation_controller_test_secret";
  let existingTenant = null;
  let createdCount = 0;
  let currentUser = educator;
  User.findById = async () => currentUser;
  Tenant.findOne = async (filter) => {
    if (filter?.slug) return null;
    if (filter && Object.hasOwn(filter, "ownerId")) return null;
    if (filter?.$or) {
      const assignedDefault = filter.$or.find((entry) => entry._id === defaultTenant._id);
      if (assignedDefault) {
        assert.deepEqual(assignedDefault.slug, { $nin: ["default", "platform"] }, "reserved default tenant must not count as an educator-owned institution");
      }
      return existingTenant;
    }
    return null;
  };
  Tenant.findById = async (id) => id === defaultTenant._id ? defaultTenant : id === assignedTenant._id ? assignedTenant : null;
  Tenant.exists = async ({ _id, ownerId }) => _id.toString() === assignedTenant._id && ownerId.toString() === assignedTenant.ownerId;
  Tenant.create = async (input) => {
    createdCount += 1;
    return { ...createdTenant, ...input, _id: input.slug === "northstar" ? createdTenant._id : `tenant_${input.slug}` };
  };
  let deletedTenantId = null;
  let deletedMembership = false;
  let createdMembership = null;
  Tenant.deleteOne = async ({ _id }) => { deletedTenantId = _id; };
  InstitutionMembership.create = async (input) => {
    createdMembership = input;
    return { _id: "membership_owner" };
  };
  InstitutionMembership.deleteOne = async () => { deletedMembership = true; };
  sessionService.createSession = async () => ({ sessionId: "institution_create_test_session" });

  const firstResponse = makeResponse();
  await createOrganizationByEducator(makeRequest(), firstResponse);
  assert.equal(firstResponse.statusCode, 201, "educators on the reserved default tenant can create their first institution");
  assert.equal(createdCount, 1);
  assert.equal(educator.role, "educator", "creating an institution must not change the teacher's educator role");
  assert.equal(firstResponse.data.user.role, "educator", "the returned user must remain an educator");
  assert.equal(createdMembership.role, "educator", "the institution membership must use the educator role");
  assert.equal(educator.tenantId, createdTenant._id);

  existingTenant = { _id: "tenant_existing", name: "Existing Academy" };
  const secondResponse = makeResponse();
  await createOrganizationByEducator(makeRequest(), secondResponse);
  assert.equal(secondResponse.statusCode, 400, "educators already managing an institution remain limited to one");
  assert.equal(createdCount, 1, "a second institution must not be created");

  const rollbackEducator = {
    _id: "educator_rollback",
    role: "educator",
    tenantId: defaultTenant._id,
    save: async () => {},
    toObject() { return { _id: this._id, role: this.role, tenantId: this.tenantId }; },
  };
  currentUser = rollbackEducator;
  existingTenant = null;
  InstitutionMembership.create = async () => { throw new Error("membership store unavailable"); };
  const rollbackResponse = makeResponse();
  await createOrganizationByEducator({
    ...makeRequest(),
    userId: rollbackEducator._id,
    body: { name: "Retry Academy", slug: "retry-academy" },
  }, rollbackResponse);
  assert.equal(rollbackResponse.statusCode, 500);
  assert.equal(rollbackEducator.role, "educator", "failed creation restores the educator role");
  assert.equal(rollbackEducator.tenantId, defaultTenant._id, "failed creation restores the original tenant assignment");
  assert.equal(deletedTenantId, "tenant_retry-academy", "failed setup removes the newly created tenant");
  assert.equal(deletedMembership, true, "failed setup removes any partial membership");

  currentUser = { _id: "legacy_educator", role: "educator", tenantId: defaultTenant._id };
  const defaultLookup = makeResponse();
  await getMyInstitution({ userId: currentUser._id }, defaultLookup);
  assert.equal(defaultLookup.statusCode, 200);
  assert.equal(defaultLookup.data.hasInstitution, false, "the reserved default tenant is not an educator-owned institution");

  const defaultEdit = makeResponse();
  await updateMyInstitution({ userId: currentUser._id, body: { name: "Hijacked Branding" } }, defaultEdit);
  assert.equal(defaultEdit.statusCode, 404, "educators cannot edit the global default tenant through institution settings");

  currentUser = { _id: "educator_member", role: "educator", tenantId: assignedTenant._id };
  const memberEdit = makeResponse();
  await updateMyInstitution({ userId: currentUser._id, body: { title: "Changed" } }, memberEdit);
  assert.equal(memberEdit.statusCode, 403, "an educator member cannot change institution branding");
  assert.notEqual(assignedTenant.title, "Changed");

  assignedTenant.ownerId = "64f000000000000000000003";
  currentUser = { _id: "64f000000000000000000003", role: "educator", tenantId: assignedTenant._id };
  const adminEdit = makeResponse();
  await updateMyInstitution({ userId: currentUser._id, body: { title: "Admin updated title" } }, adminEdit);
  assert.equal(adminEdit.statusCode, 200, "the institution owner keeps settings access while remaining an educator");
  assert.equal(assignedTenant.title, "Admin updated title");

  console.log("[PASS] Default-tenant educators can create their first institution, while the one-institution limit holds");
  console.log("[PASS] Reserved default branding is protected and only institution owners/admins can edit settings");
} finally {
  if (typeof originals.jwtSecret === "undefined") delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originals.jwtSecret;
  User.findById = originals.userFindById;
  Tenant.findOne = originals.tenantFindOne;
  Tenant.findById = originals.tenantFindById;
  Tenant.exists = originals.tenantExists;
  Tenant.create = originals.tenantCreate;
  Tenant.deleteOne = originals.tenantDeleteOne;
  InstitutionMembership.create = originals.membershipCreate;
  InstitutionMembership.deleteOne = originals.membershipDeleteOne;
  sessionService.createSession = originals.createSession;
}
