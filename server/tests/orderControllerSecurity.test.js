import assert from "node:assert/strict";
import Course from "../models/coursesModel.js";
import User from "../models/userModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import { RazorpayOrder, verifyPayment } from "../controller/orderController.js";

const originals = {
  courseFindOne: Course.findOne,
  userFindById: User.findById,
  membershipFindOne: InstitutionMembership.findOne,
  courseAccessUpdate: CourseAccess.findOneAndUpdate,
  membershipUpdate: InstitutionMembership.findOneAndUpdate,
  nodeEnv: process.env.NODE_ENV,
};
let accessWritten = false;
let userSaved = false;
let courseSaved = false;
const course = {
  _id: "course_1",
  creator: "educator_1",
  tenantId: "tenant_1",
  price: 999,
  isPublished: true,
  enrolledStudents: [],
  save: async () => { courseSaved = true; },
};
const user = {
  _id: "student_1",
  role: "student",
  enrolledCourses: [],
  save: async () => { userSaved = true; },
};
const response = () => ({
  statusCode: 200,
  data: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.data = body; return this; },
});

try {
  Course.findOne = async () => course;
  User.findById = async () => user;
  InstitutionMembership.findOne = async () => ({ status: "active", role: "student" });
  CourseAccess.findOneAndUpdate = async () => { accessWritten = true; };
  InstitutionMembership.findOneAndUpdate = async () => ({ status: "active" });

  const res = response();
  await verifyPayment({
    body: { courseId: "course_1", razorpay_order_id: "creator_course_1_forged" },
    userId: "student_1",
    tenantId: "tenant_1",
  }, res);

  assert.equal(res.statusCode, 400, "a student cannot claim the creator order bypass");
  assert.equal(accessWritten, false, "failed verification must not create course access");
  assert.equal(userSaved, false, "failed verification must not enroll the student");
  assert.equal(courseSaved, false, "failed verification must not update course enrollment");

  course.enrolledStudents = ["student_1"];
  const duplicateOrder = response();
  await RazorpayOrder({
    body: { courseId: "course_1" },
    userId: "student_1",
    userRole: "student",
    tenantId: "tenant_1",
  }, duplicateOrder);
  assert.equal(duplicateOrder.statusCode, 409, "students with existing access cannot create another paid order");
  assert.equal(duplicateOrder.data.code, "COURSE_ALREADY_ENROLLED");

  process.env.NODE_ENV = "test";
  course.enrolledStudents = [];
  user.enrolledCourses = [];
  accessWritten = false;
  userSaved = false;
  courseSaved = false;
  const successfulPayment = response();
  await verifyPayment({
    body: { courseId: "course_1", razorpay_order_id: "order_mock_success" },
    userId: "student_1",
    tenantId: "tenant_1",
  }, successfulPayment);
  assert.equal(successfulPayment.statusCode, 200);
  assert.ok(successfulPayment.data.user.enrolledCourses.includes("course_1"));
  assert.equal(accessWritten, true, "verified payment must persist the access grant before returning success");
  assert.equal(userSaved, true);
  assert.equal(courseSaved, true);
  console.log("[PASS] Forged creator order IDs cannot enroll a student in a paid course");
  console.log("[PASS] Existing course access prevents duplicate paid orders");
  console.log("[PASS] Successful payment persists course access and enrollment before returning the updated student");
} finally {
  if (originals.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originals.nodeEnv;
  Course.findOne = originals.courseFindOne;
  User.findById = originals.userFindById;
  InstitutionMembership.findOne = originals.membershipFindOne;
  CourseAccess.findOneAndUpdate = originals.courseAccessUpdate;
  InstitutionMembership.findOneAndUpdate = originals.membershipUpdate;
}
