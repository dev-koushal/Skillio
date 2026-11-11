import assert from "node:assert/strict";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import Course from "../models/coursesModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import { grantCourseAccess, revokeCourseAccess } from "../controller/institutionStudentController.js";

const originals = {
  userFindById: User.findById,
  userFindOne: User.findOne,
  tenantFindOne: Tenant.findOne,
  tenantExists: Tenant.exists,
  courseFindOne: Course.findOne,
  membershipFindOne: InstitutionMembership.findOne,
  accessFindOneAndUpdate: CourseAccess.findOneAndUpdate,
};

const response = () => ({
  statusCode: 200,
  data: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.data = payload; return this; },
});

try {
  const educatorId = "64b000000000000000000001";
  const tenantId = "64b000000000000000000002";
  User.findById = async () => ({ _id: educatorId, role: "educator", tenantId });
  User.findOne = async () => ({
    _id: "64b000000000000000000003",
    role: "student",
    tenantId: "64b000000000000000000004",
    enrolledCourses: [],
    save: async () => {},
  });
  Tenant.findOne = async () => ({ _id: tenantId, name: "Academy A" });
  Tenant.exists = async (query) => query._id === tenantId && query.ownerId === educatorId;
  Course.findOne = async () => ({
    _id: "64b000000000000000000005",
    tenantId,
    creator: educatorId,
    title: "Course A",
    price: 0,
    enrolledStudents: [],
    save: async () => {},
  });
  InstitutionMembership.findOne = async () => null;

  const grantResponse = response();
  await grantCourseAccess({
    params: { studentId: "64b000000000000000000003" },
    body: { courseId: "64b000000000000000000005" },
    userId: educatorId,
  }, grantResponse);
  assert.equal(grantResponse.statusCode, 404);
  assert.equal(grantResponse.data.message, "Student not found");

  const revokeResponse = response();
  await revokeCourseAccess({
    params: { studentId: "64b000000000000000000003", courseId: "64b000000000000000000005" },
    body: {},
    userId: educatorId,
  }, revokeResponse);
  assert.equal(revokeResponse.statusCode, 404);
  assert.equal(revokeResponse.data.message, "Student not found");
  console.log("[PASS] Institution educators cannot grant or revoke course access for another institution's student");
} finally {
  User.findById = originals.userFindById;
  User.findOne = originals.userFindOne;
  Tenant.findOne = originals.tenantFindOne;
  Tenant.exists = originals.tenantExists;
  Course.findOne = originals.courseFindOne;
  InstitutionMembership.findOne = originals.membershipFindOne;
  CourseAccess.findOneAndUpdate = originals.accessFindOneAndUpdate;
}
