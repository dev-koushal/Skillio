import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import Resource from "../models/resourceModel.js";
import uploadCloudinary from "../config/cloudinary.js";

/**
 * Service to manage lecture business logic.
 * Used by both normal REST controllers and the AI tool execution engine.
 */
export const lectureService = {
  /**
   * Create a new lecture inside a course.
   */
  async createLecture({
    tenantId,
    userId,
    userRole,
    courseId,
    lectureTitle,
    isPreviewFree = false,
    videoFile = null,
    videoUrl = null,
    resourceData = null,
  }) {
    if (!lectureTitle || !lectureTitle.trim()) {
      throw new Error("Lecture title is required");
    }
    if (!courseId) {
      throw new Error("courseId is required");
    }

    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      throw new Error("Course not found in this organization");
    }

    // Verify ownership
    if (
      course.creator.toString() !== userId.toString() &&
      userRole !== "tenant_admin" &&
      userRole !== "platform_admin"
    ) {
      throw new Error("Not authorized to add lectures to this course");
    }

    let finalVideoUrl = videoUrl || "";
    if (videoFile) {
      const uploaded = await uploadCloudinary(videoFile.path);
      if (uploaded) finalVideoUrl = uploaded;
    }

    const lecture = await Lecture.create({
      tenantId,
      courseId,
      lectureTitle: lectureTitle.trim(),
      isPreviewFree: Boolean(isPreviewFree),
      videoUrl: finalVideoUrl,
    });

    course.lectures.push(lecture._id);
    await course.save();

    // Attach optional study note / PDF resource if provided
    let attachedResource = null;
    if (resourceData?.title && resourceData?.fileUrl) {
      attachedResource = await Resource.create({
        tenantId,
        courseId,
        lectureId: lecture._id,
        title: resourceData.title.trim(),
        description: resourceData.description || "",
        type: resourceData.type || "pdf",
        fileUrl: resourceData.fileUrl,
        uploadedBy: userId,
      });
    }

    return { lecture, course, resource: attachedResource };
  },

  /**
   * Update lecture title, preview flag, or video.
   */
  async updateLecture({
    tenantId,
    userId,
    userRole,
    lectureId,
    lectureTitle,
    isPreviewFree,
    videoFile = null,
    videoUrl = null,
  }) {
    const lecture = await Lecture.findOne({ _id: lectureId, tenantId });
    if (!lecture) {
      throw new Error("Lecture not found in this organization");
    }

    const course = await Course.findOne({ _id: lecture.courseId, tenantId });
    if (course && course.creator.toString() !== userId.toString() && userRole !== "tenant_admin" && userRole !== "platform_admin") {
      throw new Error("Not authorized to modify this lecture");
    }

    if (videoFile) {
      const uploaded = await uploadCloudinary(videoFile.path);
      if (uploaded) lecture.videoUrl = uploaded;
    } else if (typeof videoUrl !== "undefined" && videoUrl !== null) {
      lecture.videoUrl = videoUrl;
    }

    if (typeof lectureTitle !== "undefined") {
      lecture.lectureTitle = lectureTitle.trim();
    }

    if (typeof isPreviewFree !== "undefined") {
      lecture.isPreviewFree = isPreviewFree === "true" || isPreviewFree === true;
    }

    await lecture.save();
    return lecture;
  },

  /**
   * Delete a lecture and cleanup course reference and resources.
   */
  async deleteLecture({ tenantId, userId, userRole, lectureId }) {
    const lecture = await Lecture.findOne({ _id: lectureId, tenantId });
    if (!lecture) {
      throw new Error("Lecture not found");
    }

    const course = await Course.findOne({ _id: lecture.courseId, tenantId });
    if (course && course.creator.toString() !== userId.toString() && userRole !== "tenant_admin" && userRole !== "platform_admin") {
      throw new Error("Not authorized to delete this lecture");
    }

    // Delete associated resources
    await Resource.deleteMany({ lectureId, tenantId });

    // Remove lecture from course array
    await Course.updateOne(
      { _id: lecture.courseId, tenantId },
      { $pull: { lectures: lectureId } }
    );

    await Lecture.findByIdAndDelete(lectureId);

    return { success: true, deletedLectureId: lectureId, lectureTitle: lecture.lectureTitle };
  },
};

