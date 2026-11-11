import assert from "node:assert/strict";
import crypto from "node:crypto";
import User from "../models/userModel.js";
import Invitation from "../models/invitationModel.js";
import Course from "../models/coursesModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import { acceptInvitation } from "../controller/invitationController.js";
import { verifyCourseAccess } from "../utils/courseAccess.js";

const originals = {
  userFindById: User.findById,
  invitationFindOne: Invitation.findOne,
  invitationFindOneAndUpdate: Invitation.findOneAndUpdate,
  courseFindOne: Course.findOne,
  courseUpdateOne: Course.updateOne,
  membershipFindOne: InstitutionMembership.findOne,
  membershipFindOneAndUpdate: InstitutionMembership.findOneAndUpdate,
  courseAccessFindOne: CourseAccess.findOne,
  courseAccessFindOneAndUpdate: CourseAccess.findOneAndUpdate,
};

const createResponse = () => ({
  statusCode: 200,
  data: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.data = payload; return this; },
});
const tenant = { _id: "tenant_a", name: "Academy A", slug: "academy-a", status: "active" };
const token = "single_use_test_token";
let acceptedCourseGrant = null;
let invitationWasClaimed = false;
let membershipWasCreated = false;
let courseEnrollment = null;
let userSaveCount = 0;

try {
  User.findById = async () => ({
    _id: "student_1", role: "student", email: "student@example.test", enrolledCourses: [],
    save: async function () { userSaveCount += 1; },
  });
  InstitutionMembership.findOne = async () => null;
  InstitutionMembership.findOneAndUpdate = async (filter) => { membershipWasCreated = filter.tenantId === tenant._id; return {}; };
  Invitation.findOne = () => ({
    _id: "invite_1",
    tenantId: tenant,
    courseId: "course_a",
    invitedEmail: "student@example.test",
    invitedBy: "teacher_1",
    populate: async function () { return this; },
  });
  Course.findOne = async (filter) => {
    assert.deepEqual(filter, { _id: "course_a", tenantId: tenant._id });
    return { _id: "course_a", title: "Assigned course" };
  };
  Invitation.findOneAndUpdate = async (filter, update) => {
    invitationWasClaimed = filter.status === "pending" && update.$set.acceptedBy === "student_1";
    return invitationWasClaimed ? {} : null;
  };
  CourseAccess.findOneAndUpdate = async (filter) => { acceptedCourseGrant = filter.courseId; return {}; };
  Course.updateOne = async (filter) => { courseEnrollment = filter._id; return {}; };

  const res = createResponse();
  await acceptInvitation({ body: { token }, userId: "student_1" }, res);
  assert.equal(crypto.createHash("sha256").update(token).digest("hex").length, 64);
  assert.equal(res.statusCode, 200);
  assert.equal(res.data.courseId, "course_a");
  assert.equal(acceptedCourseGrant, "course_a");
  assert.equal(courseEnrollment, "course_a");
  assert.equal(membershipWasCreated, true);
  assert.equal(invitationWasClaimed, true);
  assert.equal(userSaveCount, 1);

  Course.findOne = async ({ _id }) => ({ _id, creator: "teacher_1", enrolledStudents: [], price: 0 });
  CourseAccess.findOne = async ({ courseId }) => courseId === "course_a" ? { status: "active", source: "INSTITUTION_GRANTED" } : null;
  const assignedAccess = await verifyCourseAccess({ courseId: "course_a", userId: "student_1", userRole: "student", tenantId: tenant._id });
  const otherCourseAccess = await verifyCourseAccess({ courseId: "course_b", userId: "student_1", userRole: "student", tenantId: tenant._id });
  assert.equal(assignedAccess.hasAccess, true);
  assert.equal(otherCourseAccess.hasAccess, false, "membership must not grant unrelated course access");
  console.log("[PASS] Accepted invitation grants only its assigned course; unrelated institutional courses stay locked");

  // A course-less institution invite creates membership only, and cannot be used twice.
  acceptedCourseGrant = null;
  courseEnrollment = null;
  invitationWasClaimed = false;
  membershipWasCreated = false;
  userSaveCount = 0;
  Invitation.findOne = () => ({
    _id: "invite_2", tenantId: tenant, courseId: null,
    invitedEmail: "student@example.test", invitedBy: "teacher_1",
    populate: async function () { return this; },
  });
  Course.findOne = async () => { throw new Error("institution-only invitation must not query/grant a course"); };
  Invitation.findOneAndUpdate = async (_filter, update) => {
    invitationWasClaimed = update.$set.acceptedBy === "student_1";
    return invitationWasClaimed ? {} : null;
  };
  const institutionRes = createResponse();
  await acceptInvitation({ body: { token: "institution_only_token" }, userId: "student_1" }, institutionRes);
  assert.equal(institutionRes.statusCode, 200);
  assert.equal(institutionRes.data.courseId, null);
  assert.equal(acceptedCourseGrant, null);
  assert.equal(courseEnrollment, null);
  assert.equal(membershipWasCreated, true);
  assert.equal(userSaveCount, 0);

  Invitation.findOneAndUpdate = async () => null;
  const replayRes = createResponse();
  await acceptInvitation({ body: { token: "institution_only_token" }, userId: "student_1" }, replayRes);
  assert.equal(replayRes.statusCode, 409, "concurrent or repeated acceptance must fail");
  console.log("[PASS] Institution-only invite creates no course grant; invitation tokens cannot be replayed");
} finally {
  User.findById = originals.userFindById;
  Invitation.findOne = originals.invitationFindOne;
  Invitation.findOneAndUpdate = originals.invitationFindOneAndUpdate;
  Course.findOne = originals.courseFindOne;
  Course.updateOne = originals.courseUpdateOne;
  InstitutionMembership.findOne = originals.membershipFindOne;
  InstitutionMembership.findOneAndUpdate = originals.membershipFindOneAndUpdate;
  CourseAccess.findOne = originals.courseAccessFindOne;
  CourseAccess.findOneAndUpdate = originals.courseAccessFindOneAndUpdate;
}
