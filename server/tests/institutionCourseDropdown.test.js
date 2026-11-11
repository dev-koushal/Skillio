import assert from "node:assert/strict";
import Course from "../models/coursesModel.js";
import { getCreatorCourses } from "../controller/courseController.js";

const originalFind = Course.find;
const tenantId = "assigned_tenant_1";
const expectedCourses = [
  { _id: "course_1", title: "First institution course" },
  { _id: "course_2", title: "Second institution course" },
];
let capturedFilter = null;
const response = {
  statusCode: 200,
  data: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.data = payload; return this; },
};

try {
  Course.find = (filter) => {
    capturedFilter = filter;
    return {
      populate() { return this; },
      sort() { return this; },
      lean: async () => expectedCourses,
    };
  };

  await getCreatorCourses({ userId: "educator_1", userRole: "educator", userTenantId: tenantId, tenantId }, response);
  assert.deepEqual(capturedFilter, { tenantId }, "assigned educators must see the whole institution course list");
  assert.deepEqual(response.data.courses, expectedCourses);
  console.log("[PASS] Institution course picker returns all courses for the authenticated educator's assigned institution");
} finally {
  Course.find = originalFind;
}
