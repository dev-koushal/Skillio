import Resource from "../models/resourceModel.js";
import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import uploadCloudinary from "../config/cloudinary.js";
import { verifyCourseAccess } from "../utils/courseAccess.js";
import fs from "fs";
import path from "path";

/**
 * Upload a new resource (either course-level or associated with a specific lecture)
 */
export const uploadResource = async (req, res) => {
  try {
    const { courseId, lectureId, title, description, topic, type } = req.body;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    if (!courseId || !title) {
      return res.status(400).json({ success: false, message: "courseId and title are required" });
    }

    // Tenant-isolated course lookup & ownership check
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }

    if (
      course.creator.toString() !== userId.toString() &&
      userRole !== "tenant_admin" &&
      userRole !== "platform_admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized to upload resources to this course" });
    }

    // Verify lecture belongs to this course if lectureId provided
    if (lectureId) {
      const lecture = await Lecture.findOne({ _id: lectureId, courseId, tenantId });
      if (!lecture) {
        return res.status(404).json({ success: false, message: "Specified lecture not found in this course" });
      }
    }

    let fileUrl = req.body.fileUrl;
    let fileName = req.file?.originalname || "Resource";
    let fileSize = "";

    if (req.file) {
      const sizeBytes = req.file.size || 0;
      fileSize = sizeBytes > 1048576
        ? `${(sizeBytes / 1048576).toFixed(2)} MB`
        : `${(sizeBytes / 1024).toFixed(1)} KB`;

      // Try Cloudinary upload, fallback to local file URL
      try {
        const cloudUrl = await uploadCloudinary(req.file.path);
        if (cloudUrl) {
          fileUrl = cloudUrl;
        } else {
          fileUrl = `/public/${req.file.filename}`;
        }
      } catch (err) {
        console.warn("[Resource Cloudinary Warning, fallback to local path]", err);
        fileUrl = `/public/${req.file.filename}`;
      }
    }

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: "Resource file or fileUrl is required" });
    }

    const resource = await Resource.create({
      tenantId,
      courseId,
      lectureId: lectureId || null,
      title: title.trim(),
      description: description ? description.trim() : "",
      topic: topic ? topic.trim() : "General",
      type: type || "pdf",
      fileUrl,
      fileName,
      fileSize,
      uploadedBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: "Resource uploaded successfully",
      resource,
    });
  } catch (error) {
    console.error("[UploadResource Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to upload resource: ${error.message}`,
    });
  }
};

/**
 * Get all resources belonging to a course (course-level and all lecture resources)
 * Requires course access (enrolled or creator/admin or preview)
 */
export const getCourseResources = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    const access = await verifyCourseAccess({
      courseId,
      userId,
      userRole,
      tenantId,
    });

    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        accessDenied: true,
        message: access.reason || "You must be enrolled to access course notes and resources.",
      });
    }

    const resources = await Resource.find({ courseId, tenantId })
      .populate("lectureId", "lectureTitle")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error("[GetCourseResources Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to fetch resources: ${error.message}`,
    });
  }
};

/**
 * Get resources specifically attached to a lecture
 */
export const getLectureResources = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    const lecture = await Lecture.findOne({ _id: lectureId, tenantId });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    const access = await verifyCourseAccess({
      courseId: lecture.courseId,
      userId,
      userRole,
      tenantId,
    });

    if (!access.hasAccess && !lecture.isPreviewFree) {
      return res.status(403).json({
        success: false,
        accessDenied: true,
        message: access.reason || "Enrolled access required for lecture resources.",
      });
    }

    const resources = await Resource.find({ lectureId, tenantId })
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error("[GetLectureResources Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to fetch lecture resources: ${error.message}`,
    });
  }
};

/**
 * Update resource metadata (title, description, topic, type)
 */
export const updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;
    const { title, description, topic, type, lectureId } = req.body;

    const resource = await Resource.findOne({ _id: id, tenantId });
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const course = await Course.findOne({ _id: resource.courseId, tenantId });
    if (
      course &&
      course.creator.toString() !== userId.toString() &&
      userRole !== "tenant_admin" &&
      userRole !== "platform_admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized to update this resource" });
    }

    if (title) resource.title = title.trim();
    if (typeof description !== "undefined") resource.description = description.trim();
    if (topic) resource.topic = topic.trim();
    if (type) resource.type = type;
    if (typeof lectureId !== "undefined") resource.lectureId = lectureId || null;

    if (req.file) {
      const upload = await uploadCloudinary(req.file.path);
      if (upload) resource.fileUrl = upload;
      resource.fileName = req.file.originalname;
    }

    await resource.save();

    return res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      resource,
    });
  } catch (error) {
    console.error("[UpdateResource Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to update resource: ${error.message}`,
    });
  }
};

/**
 * Delete a resource
 */
export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    const resource = await Resource.findOne({ _id: id, tenantId });
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const course = await Course.findOne({ _id: resource.courseId, tenantId });
    if (
      course &&
      course.creator.toString() !== userId.toString() &&
      userRole !== "tenant_admin" &&
      userRole !== "platform_admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this resource" });
    }

    await Resource.deleteOne({ _id: id, tenantId });

    return res.status(200).json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("[DeleteResource Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to delete resource: ${error.message}`,
    });
  }
};
