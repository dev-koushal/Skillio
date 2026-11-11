import assert from "node:assert/strict";
import Course from "../models/coursesModel.js";
import { editCourse } from "../controller/courseController.js";

const foreignCourse = {
  _id: "course_tenant_b",
  tenantId: "tenant_b",
  creator: "educator_b",
  title: "Tenant B course",
  lectures: [],
};
const originals = {
  findById: Course.findById,
  findOne: Course.findOne,
  findOneAndUpdate: Course.findOneAndUpdate,
};

const createResponse = () => ({
  statusCode: 200,
  data: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.data = payload; return this; },
});

try {
  let updateCalled = false;
  let lastFilter = null;
  Course.findById = async () => foreignCourse;
  Course.findOne = async (filter) => {
    lastFilter = filter;
    return filter.tenantId === "tenant_b" ? foreignCourse : null;
  };
  Course.findOneAndUpdate = () => {
    updateCalled = true;
    return { populate: async () => foreignCourse };
  };

  const educatorResponse = createResponse();
  await editCourse({
    params: { courseId: foreignCourse._id },
    body: { title: "Unauthorized edit" },
    userId: "educator_a",
    userRole: "educator",
    tenantId: "tenant_a",
  }, educatorResponse);

  assert.deepEqual(lastFilter, { _id: foreignCourse._id, tenantId: "tenant_a" });
  assert.equal(educatorResponse.statusCode, 404);
  assert.equal(updateCalled, false, "an educator must not update another institution's course");
  console.log("[PASS] Educator course edits are scoped to their own institution");

  Course.findOne = async (filter) => {
    lastFilter = filter;
    return foreignCourse;
  };
  const platformAdminResponse = createResponse();
  await editCourse({
    params: { courseId: foreignCourse._id },
    body: { title: "Platform managed title" },
    userId: "platform_admin",
    userRole: "platform_admin",
    tenantId: "tenant_a",
  }, platformAdminResponse);

  assert.deepEqual(lastFilter, { _id: foreignCourse._id });
  assert.equal(platformAdminResponse.statusCode, 200);
  assert.equal(updateCalled, true);
  console.log("[PASS] Platform admin course edits retain cross-institution access");

  Course.findOne = async () => ({ ...foreignCourse, tenantId: "tenant_a", creator: "educator_a" });
  updateCalled = false;
  const invalidTitleResponse = createResponse();
  await editCourse({
    params: { courseId: foreignCourse._id },
    body: { title: "  " },
    userId: "educator_a",
    userRole: "educator",
    tenantId: "tenant_a",
  }, invalidTitleResponse);
  assert.equal(invalidTitleResponse.statusCode, 400);
  assert.equal(updateCalled, false, "blank titles must not be persisted");

  const invalidPriceResponse = createResponse();
  await editCourse({
    params: { courseId: foreignCourse._id },
    body: { price: -1 },
    userId: "educator_a",
    userRole: "educator",
    tenantId: "tenant_a",
  }, invalidPriceResponse);
  assert.equal(invalidPriceResponse.statusCode, 400);
  assert.equal(updateCalled, false, "negative prices must not be persisted");
  console.log("[PASS] Course updates reject blank titles and negative prices");
} finally {
  Course.findById = originals.findById;
  Course.findOne = originals.findOne;
  Course.findOneAndUpdate = originals.findOneAndUpdate;
}
