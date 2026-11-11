import Resource from "../models/resourceModel.js";
import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import { canManageCourse, canManageResource } from "../utils/permissions.js";

/**
 * Shared Resource Service for both REST controllers and the AI Assistant.
 * Fully multi-tenant isolated.
 */
export const resourceService = {
  /**
   * Add a new resource attached to a course or lecture.
   */
  async addResource({
    tenantId,
    userId,
    userRole,
    courseId,
    lectureId = null,
    title,
    description = "",
    topic = "General",
    type = "pdf",
    fileUrl,
    fileName = "resource",
    fileSize = "",
  }) {
    if (!courseId) throw new Error("courseId is required to attach a resource");
    if (!title || !title.trim()) throw new Error("Resource title is required");
    if (!fileUrl) throw new Error("Resource fileUrl or document link is required");

    // Verify course exists in tenant and user has permission
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      throw new Error("Course not found in this organization");
    }

    if (!(await canManageCourse({ course, tenantId, userId, userRole }))) {
      throw new Error("You are not authorized to add resources to this course");
    }

    // Verify lecture if provided
    let finalLectureId = null;
    if (lectureId) {
      const lecture = await Lecture.findOne({ _id: lectureId, courseId, tenantId });
      if (lecture) {
        finalLectureId = lecture._id;
      }
    }

    const resource = await Resource.create({
      tenantId,
      courseId,
      lectureId: finalLectureId,
      title: title.trim(),
      description: description ? description.trim() : "",
      topic: topic ? topic.trim() : "General",
      type: type || "pdf",
      fileUrl,
      fileName,
      fileSize,
      uploadedBy: userId,
    });

    return resource;
  },

  /**
   * List resources for a course and optional lecture.
   */
  async listResources({ tenantId, courseId, lectureId = null }) {
    const filter = { tenantId, courseId };
    if (lectureId) filter.lectureId = lectureId;

    return Resource.find(filter).sort({ createdAt: -1 });
  },

  /**
   * Find a resource by title inside a course.
   */
  async findResourceByTitle({ tenantId, courseId, title }) {
    if (!title) return null;
    return Resource.findOne({
      tenantId,
      courseId,
      title: { $regex: new RegExp(title.trim(), "i") },
    });
  },

  /**
   * Delete a resource with tenant scoping and ownership check.
   */
  async deleteResource({ tenantId, userId, userRole, resourceId }) {
    const resource = await Resource.findOne({ _id: resourceId, tenantId });
    if (!resource) {
      throw new Error("Resource not found");
    }

    const course = await Course.findOne({ _id: resource.courseId, tenantId });
    if (!(await canManageResource({ course, resource, tenantId, userId, userRole }))) {
      throw new Error("You are not authorized to delete this resource");
    }

    await Resource.findByIdAndDelete(resourceId);
    return { success: true, deletedResourceId: resourceId, title: resource.title };
  },
};

