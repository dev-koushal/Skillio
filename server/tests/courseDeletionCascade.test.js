import assert from "node:assert/strict";
import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import Resource from "../models/resourceModel.js";
import Review from "../models/reviewModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import User from "../models/userModel.js";
import Invitation from "../models/invitationModel.js";
import { courseService } from "../services/courseService.js";

const course = {
  _id: "course_1",
  tenantId: "tenant_1",
  creator: "educator_1",
  title: "Algebra",
  lectures: ["lecture_1"],
};
const originals = {
  findOne: Course.findOne,
  deleteOne: Course.deleteOne,
  lectureDeleteMany: Lecture.deleteMany,
  resourceDeleteMany: Resource.deleteMany,
  reviewDeleteMany: Review.deleteMany,
  accessUpdateMany: CourseAccess.updateMany,
  invitationUpdateMany: Invitation.updateMany,
  userUpdateMany: User.updateMany,
};
const calls = [];

try {
  Course.findOne = async (filter) => {
    assert.deepEqual(filter, { _id: "course_1", tenantId: "tenant_1" });
    return course;
  };
  Lecture.deleteMany = async (filter) => calls.push(["lectures", filter]);
  Resource.deleteMany = async (filter) => calls.push(["resources", filter]);
  Review.deleteMany = async (filter) => calls.push(["reviews", filter]);
  CourseAccess.updateMany = async (filter, update) => calls.push(["access", filter, update]);
  Invitation.updateMany = async (filter, update) => calls.push(["invitations", filter, update]);
  User.updateMany = async (filter, update) => calls.push(["users", filter, update]);
  Course.deleteOne = async (filter) => calls.push(["course", filter]);

  const result = await courseService.deleteCourse({
    tenantId: "tenant_1",
    userId: "educator_1",
    userRole: "educator",
    courseId: "course_1",
  });

  assert.equal(result.success, true);
  assert.deepEqual(calls.map(([name]) => name), ["lectures", "resources", "reviews", "access", "invitations", "users", "course"]);
  assert.deepEqual(calls.find(([name]) => name === "users").slice(1), [
    { enrolledCourses: "course_1" },
    { $pull: { enrolledCourses: "course_1" } },
  ]);
  assert.deepEqual(calls.find(([name]) => name === "invitations").slice(1), [
    { courseId: "course_1", tenantId: "tenant_1", status: "pending" },
    { $set: { status: "revoked" } },
  ]);
  const [, accessFilter, accessUpdate] = calls.find(([name]) => name === "access");
  assert.deepEqual(accessFilter, { courseId: "course_1", tenantId: "tenant_1", status: "active" });
  assert.equal(accessUpdate.$set.status, "revoked");
  assert.equal(accessUpdate.$set.revokedBy, "educator_1");
  console.log("[PASS] Course deletion removes dependent records, clears enrollment, and retains revoked access history");
} finally {
  Course.findOne = originals.findOne;
  Course.deleteOne = originals.deleteOne;
  Lecture.deleteMany = originals.lectureDeleteMany;
  Resource.deleteMany = originals.resourceDeleteMany;
  Review.deleteMany = originals.reviewDeleteMany;
  CourseAccess.updateMany = originals.accessUpdateMany;
  Invitation.updateMany = originals.invitationUpdateMany;
  User.updateMany = originals.userUpdateMany;
}
