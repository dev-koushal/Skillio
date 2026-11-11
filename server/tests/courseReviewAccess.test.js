import assert from "node:assert/strict";
import Course from "../models/coursesModel.js";
import Review from "../models/reviewModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import { createReview } from "../controller/reviewContoller.js";

const originals = {
  courseFindOne: Course.findOne,
  reviewFindOne: Review.findOne,
  reviewCreate: Review.create,
  accessFindOne: CourseAccess.findOne,
};
let createCalled = false;
const course = {
  _id: "course_1",
  tenantId: "tenant_1",
  creator: "educator_1",
  price: 999,
  enrolledStudents: [],
  reviews: [],
  save: async () => {},
};
const makeResponse = () => ({
  statusCode: 200,
  data: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.data = body; return this; },
});

try {
  Course.findOne = async () => course;
  Review.findOne = async () => null;
  Review.create = async (input) => {
    createCalled = true;
    return { ...input, _id: "review_1", populate: async function () { return this; } };
  };
  CourseAccess.findOne = async () => null;

  const denied = makeResponse();
  await createReview({
    body: { courseId: "course_1", rating: 5, comment: "Good" },
    userId: "student_1",
    userRole: "student",
    tenantId: "tenant_1",
  }, denied);
  assert.equal(denied.statusCode, 403);
  assert.equal(createCalled, false);

  const invalidRating = makeResponse();
  await createReview({
    body: { courseId: "course_1", rating: "NaN" },
    userId: "student_1",
    userRole: "student",
    tenantId: "tenant_1",
  }, invalidRating);
  assert.equal(invalidRating.statusCode, 400);

  CourseAccess.findOne = async () => ({ status: "active", source: "PURCHASED" });
  const allowed = makeResponse();
  await createReview({
    body: { courseId: "course_1", rating: 5, comment: "Excellent" },
    userId: "student_1",
    userRole: "student",
    tenantId: "tenant_1",
  }, allowed);
  assert.equal(allowed.statusCode, 201);
  assert.equal(createCalled, true);
  console.log("[PASS] Only enrolled students can review a course and invalid ratings are rejected");
} finally {
  Course.findOne = originals.courseFindOne;
  Review.findOne = originals.reviewFindOne;
  Review.create = originals.reviewCreate;
  CourseAccess.findOne = originals.accessFindOne;
}
