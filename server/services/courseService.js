import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import Resource from "../models/resourceModel.js";
import Review from "../models/reviewModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import User from "../models/userModel.js";
import Invitation from "../models/invitationModel.js";
import uploadCloudinary from "../config/cloudinary.js";
import { canManageCourse } from "../utils/permissions.js";

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

    const normalizedPrice = Number(price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      throw new Error("Course price must be a valid non-negative number");
    }
    if (!["Beginner", "Intermediate", "Advanced"].includes(level || "Beginner")) {
      throw new Error("Course level is invalid");
    }

    const course = await Course.create({
      tenantId,
      creator: userId,
      title: title.trim(),
      category: category ? category.trim() : "General",
      subTitle: subTitle ? subTitle.trim() : "",
      description: description ? description.trim() : "",
      price: normalizedPrice,
      level: level || "Beginner",
      isPublished: isPublished === true || isPublished === "true",
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

    // The course creator or institution owner may edit it.
    if (!(await canManageCourse({ course, tenantId, userId, userRole }))) {
      throw new Error("You are not authorized to edit this course");
    }

    const fieldsToUpdate = {};
    if (typeof updateData.title !== "undefined") {
      if (typeof updateData.title !== "string" || !updateData.title.trim()) {
        throw new Error("Course title is required");
      }
      fieldsToUpdate.title = updateData.title.trim();
    }
    if (typeof updateData.subTitle !== "undefined") fieldsToUpdate.subTitle = String(updateData.subTitle ?? "").trim();
    if (typeof updateData.description !== "undefined") fieldsToUpdate.description = String(updateData.description ?? "").trim();
    if (typeof updateData.category !== "undefined") {
      const category = String(updateData.category ?? "").trim();
      if (!category) throw new Error("Course category is required");
      fieldsToUpdate.category = category;
    }
    if (typeof updateData.level !== "undefined") fieldsToUpdate.level = updateData.level;
    if (typeof updateData.price !== "undefined") {
      const price = Number(updateData.price);
      if (!Number.isFinite(price) || price < 0) throw new Error("Course price must be a valid non-negative number");
      fieldsToUpdate.price = price;
    }
    if (typeof updateData.level !== "undefined" && !["Beginner", "Intermediate", "Advanced"].includes(updateData.level)) {
      throw new Error("Course level is invalid");
    }
    if (typeof updateData.isPublished !== "undefined") {
      fieldsToUpdate.isPublished = updateData.isPublished === true || updateData.isPublished === "true";
    }

    if (file) {
      const thumbnail = await uploadCloudinary(file.path);
      if (thumbnail) fieldsToUpdate.thumbnail = thumbnail;
    } else if (updateData.thumbnailUrl) {
      fieldsToUpdate.thumbnail = updateData.thumbnailUrl;
    }

    const courseFilter = { _id: courseId };
    if (userRole !== "platform_admin") courseFilter.tenantId = tenantId;
    const updated = await Course.findOneAndUpdate(courseFilter, fieldsToUpdate, {
      returnDocument: "after",
      runValidators: true,
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

    if (!(await canManageCourse({ course, tenantId, userId, userRole }))) {
      throw new Error("You are not authorized to delete this course");
    }

    // Remove dependent learning content, but retain access grants as an audit trail.
    await Lecture.deleteMany({ _id: { $in: course.lectures }, tenantId });
    await Resource.deleteMany({ courseId, tenantId });
    await Review.deleteMany({ course: courseId, tenantId });
    await CourseAccess.updateMany(
      { courseId, tenantId, status: "active" },
      {
        $set: {
          status: "revoked",
          revokedAt: new Date(),
          revokedBy: userId,
          revocationReason: "Course deleted",
        },
      }
    );
    await Invitation.updateMany(
      { courseId, tenantId, status: "pending" },
      { $set: { status: "revoked" } }
    );
    // Course IDs are globally unique, while a student's primary tenant may differ from
    // another institution they joined. Remove the course reference from every user record.
    await User.updateMany({ enrolledCourses: courseId }, { $pull: { enrolledCourses: courseId } });
    await Course.deleteOne({ _id: courseId, tenantId });

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

  /**
   * Reorder lectures in a course.
   */
  async reorderLectures({ tenantId, userId, userRole, courseId, lectureIds = [] }) {
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      throw new Error("Course not found");
    }

    if (!(await canManageCourse({ course, tenantId, userId, userRole }))) {
      throw new Error("You are not authorized to reorder lectures in this course");
    }

    course.lectures = lectureIds;
    await course.save();

    return course.populate("lectures");
  },
};


