import assert from "node:assert/strict";
import Resource from "../models/resourceModel.js";
import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import { deleteResource, updateResource } from "../controller/resourceController.js";

const originals = {
  resourceFindOne: Resource.findOne,
  resourceDeleteOne: Resource.deleteOne,
  courseFindOne: Course.findOne,
  lectureFindOne: Lecture.findOne,
};
let saved = false;
let deleted = false;
const resource = {
  _id: "resource_1",
  courseId: "course_1",
  title: "Study notes",
  lectureId: null,
  save: async () => { saved = true; },
};
const makeResponse = () => ({
  statusCode: 200,
  data: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.data = body; return this; },
});

try {
  Resource.findOne = async () => resource;
  Resource.deleteOne = async () => { deleted = true; };
  Course.findOne = async () => null;
  Lecture.findOne = async () => null;

  const orphanUpdate = makeResponse();
  await updateResource({ params: { id: "resource_1" }, body: { title: "Changed" }, tenantId: "tenant_1", userId: "other_educator", userRole: "educator" }, orphanUpdate);
  assert.equal(orphanUpdate.statusCode, 404);
  assert.equal(saved, false, "orphaned resources are not editable");

  const orphanDelete = makeResponse();
  await deleteResource({ params: { id: "resource_1" }, tenantId: "tenant_1", userId: "other_educator", userRole: "educator" }, orphanDelete);
  assert.equal(orphanDelete.statusCode, 404);
  assert.equal(deleted, false, "orphaned resources are not deletable by unrelated educators");

  Course.findOne = async () => ({ creator: "educator_1" });
  const mismatchedLecture = makeResponse();
  await updateResource({
    params: { id: "resource_1" },
    body: { lectureId: "lecture_from_another_course" },
    tenantId: "tenant_1",
    userId: "educator_1",
    userRole: "educator",
  }, mismatchedLecture);
  assert.equal(mismatchedLecture.statusCode, 404, "resource lecture links must point into the same course and tenant");
  assert.equal(saved, false);

  console.log("[PASS] Resource edit/delete require an existing parent course and lecture links remain course-scoped");
} finally {
  Resource.findOne = originals.resourceFindOne;
  Resource.deleteOne = originals.resourceDeleteOne;
  Course.findOne = originals.courseFindOne;
  Lecture.findOne = originals.lectureFindOne;
}
