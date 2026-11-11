import assert from "node:assert/strict";
import Course from "../models/coursesModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import { getCourseById } from "../controller/courseController.js";

const originals = {
  courseFindOne: Course.findOne,
  accessFindOne: CourseAccess.findOne,
};
const course = {
  _id: "course_draft",
  tenantId: "tenant_1",
  title: "Draft course",
  creator: "educator_1",
  isPublished: false,
  price: 999,
  enrolledStudents: [],
  toObject() { return { ...this }; },
};
const makeResponse = () => ({
  statusCode: 200,
  data: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.data = body; return this; },
});

try {
  Course.findOne = () => ({
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve(course).then(resolve, reject); },
  });
  CourseAccess.findOne = async () => null;

  const studentResponse = makeResponse();
  await getCourseById({
    params: { courseId: "course_draft" },
    userId: "student_1",
    userRole: "student",
    tenantId: "tenant_1",
  }, studentResponse);
  assert.equal(studentResponse.statusCode, 404, "unpublished course details must not be visible to un-enrolled students");

  const educatorResponse = makeResponse();
  await getCourseById({
    params: { courseId: "course_draft" },
    userId: "educator_1",
    userRole: "educator",
    tenantId: "tenant_1",
  }, educatorResponse);
  assert.equal(educatorResponse.statusCode, 200, "educators retain access to their draft course");
  console.log("[PASS] Draft course details are hidden from students while remaining available to educators");
} finally {
  Course.findOne = originals.courseFindOne;
  CourseAccess.findOne = originals.accessFindOne;
}
