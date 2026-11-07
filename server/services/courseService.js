import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import Resource from "../models/resourceModel.js";
import uploadCloudinary from "../config/cloudinary.js";

/**
 * Service to manage course business logic.
 * Used by both normal REST controllers and the AI tool execution engine.
 */
export const courseService = {
  /**
   * Create a new course scoped to tenant and creator.
   */
  async createCourse({ tenantId, userId, title, category, subTitle = "", description = "", price = 0, level = "Beginner", isPublished = false }) {
    if (!title || !title.trim()) {
      throw new Error("Course title is required");
    }

    const course = await Course.create({
      tenantId,
      creator: userId,
      title: title.trim(),
      category: category ? category.trim() : "General",
      subTitle: subTitle ? subTitle.trim() : "",
      description: description ? description.trim() : "",
      price: Number(price) || 0,
      level: level || "Beginner",
      isPublished: Boolean(isPublished),
      lectures: [],
      enrolledStudents: [],
    });

    return course;
  },

  /**
   * Update course details.
   */
  async updateCourse({ tenantId, userId, userRole, courseId, updateData = {}, file = null }) {
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      throw new Error("Course not found in this organization");
    }

    // Check authorization: only creator or tenant/platform admin
    if (
      course.creator.toString() !== userId.toString() &&
      userRole !== "tenant_admin" &&
      userRole !== "platform_admin"
    ) {
      throw new Error("You are not authorized to edit this course");
    }

    const fieldsToUpdate = {};
    if (typeof updateData.title !== "undefined") fieldsToUpdate.title = updateData.title.trim();
    if (typeof updateData.subTitle !== "undefined") fieldsToUpdate.subTitle = updateData.subTitle.trim();
    if (typeof updateData.description !== "undefined") fieldsToUpdate.description = updateData.description.trim();
    if (typeof updateData.category !== "undefined") fieldsToUpdate.category = updateData.category.trim();
    if (typeof updateData.level !== "undefined") fieldsToUpdate.level = updateData.level;
    if (typeof updateData.price !== "undefined") fieldsToUpdate.price = Number(updateData.price);
    if (typeof updateData.isPublished !== "undefined") {
      fieldsToUpdate.isPublished = updateData.isPublished === true || updateData.isPublished === "true";
    }

    if (file) {
      const thumbnail = await uploadCloudinary(file.path);
      if (thumbnail) fieldsToUpdate.thumbnail = thumbnail;
    } else if (updateData.thumbnailUrl) {
      fieldsToUpdate.thumbnail = updateData.thumbnailUrl;
    }

    const updated = await Course.findByIdAndUpdate(courseId, fieldsToUpdate, {
      returnDocument: "after",
    }).populate("lectures reviews");

    return updated;
  },

  /**
   * Get single course details with tenant scoping.
   */
  async getCourse({ tenantId, courseId }) {
    const course = await Course.findOne({ _id: courseId, tenantId })
      .populate("lectures")
      .populate("creator", "name email profilePicture description");
    return course;
  },

  /**
   * List courses created by this user in this organization.
   */
  async listCreatorCourses({ tenantId, userId }) {
    const courses = await Course.find({ creator: userId, tenantId })
      .populate("lectures")
      .sort({ createdAt: -1 });
    return courses;
  },

  /**
   * Find course by title inside the current tenant (useful for AI fuzzy lookup).
   */
  async findCourseByTitle({ tenantId, userId, title }) {
    if (!title) return null;
    const cleanTitle = title.trim();

    // Exact match first
    let course = await Course.findOne({
      tenantId,
      creator: userId,
      title: { $regex: new RegExp(`^${cleanTitle}$`, "i") },
    }).populate("lectures");

    // Partial match fallback
    if (!course) {
      course = await Course.findOne({
        tenantId,
        creator: userId,
        title: { $regex: new RegExp(cleanTitle, "i") },
      }).populate("lectures");
    }

    return course;
  },

  /**
   * Delete course and cascade its lectures and resources.
   */
  async deleteCourse({ tenantId, userId, userRole, courseId }) {
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      throw new Error("Course not found");
    }

    if (
      course.creator.toString() !== userId.toString() &&
      userRole !== "tenant_admin" &&
      userRole !== "platform_admin"
    ) {
      throw new Error("You are not authorized to delete this course");
    }

    // Delete associated lectures and resources
    await Lecture.deleteMany({ _id: { $in: course.lectures }, tenantId });
    await Resource.deleteMany({ courseId, tenantId });
    await Course.findByIdAndDelete(courseId);

    return { success: true, deletedCourseId: courseId, title: course.title };
  },

  /**
   * Toggle or set publish status.
   */
  async setPublishStatus({ tenantId, userId, userRole, courseId, isPublished }) {
    return this.updateCourse({
      tenantId,
      userId,
      userRole,
      courseId,
      updateData: { isPublished },
    });
  },
};

