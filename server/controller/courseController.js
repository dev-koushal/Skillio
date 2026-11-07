import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import uploadCloudinary from "../config/cloudinary.js";
import User from "../models/userModel.js";
import Resource from "../models/resourceModel.js";
import jwt from "jsonwebtoken";
import { verifyCourseAccess, sanitizeLecturesForViewer } from "../utils/courseAccess.js";
import { courseService } from "../services/courseService.js";
import { lectureService } from "../services/lectureService.js";

export const createCourse = async (req, res) => {
  try {
    const { title, category, subTitle, description, price, level, isPublished } = req.body;
    const tenantId = req.tenantId;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const course = await courseService.createCourse({
      tenantId,
      userId: req.userId,
      title,
      category: category || "General",
      subTitle,
      description,
      price,
      level,
      isPublished,
    });

    return res.status(201).json(course);
  } catch (error) {
    console.error("[CreateCourse Error]", error);
    return res.status(400).json({ success: false, message: `createCourse error: ${error.message || error}` });
  }
};

export const getPublishedCourses = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const courses = await Course.find({ isPublished: true, tenantId })
      .populate({
        path: "lectures",
        select: "_id title isPreviewFree duration",
      })
      .populate({
        path: "reviews",
        select: "rating",
      })
      .populate({
        path: "creator",
        select: "name profilePicture",
      })
      .select("title subTitle category level price thumbnail creator enrolledStudents isPublished tenantId createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(courses);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Failed to get published courses: ${error.message || error}`,
    });
  }
};

export const getCreatorCourses = async (req, res) => {
  try {
    const userId = req.userId;
    const tenantId = req.tenantId;

    const courses = await Course.find({ creator: userId, tenantId })
      .populate("lectures")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ courses: courses || [] });
  } catch (error) {
    console.error("[GetCreatorCourses Error]", error);
    return res.status(400).json({
      success: false,
      message: `Failed to get creator courses: ${error.message || error}`,
    });
  }
};

export const editCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tenantId = req.tenantId;
    const {
      title,
      subTitle,
      description,
      category,
      level,
      isPublished,
      price,
    } = req.body;

    // Tenant-isolated lookup
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }

    // Authorization: only the creator or an admin can edit
    if (course.creator.toString() !== req.userId.toString() && req.userRole !== "tenant_admin" && req.userRole !== "platform_admin") {
      return res.status(403).json({ success: false, message: "You are not authorized to edit this course" });
    }

    const updateData = {};
    if (typeof title !== "undefined") updateData.title = title;
    if (typeof subTitle !== "undefined") updateData.subTitle = subTitle;
    if (typeof description !== "undefined") updateData.description = description;
    if (typeof category !== "undefined") updateData.category = category;
    if (typeof level !== "undefined") updateData.level = level;
    if (typeof isPublished !== "undefined") updateData.isPublished = isPublished === "true" || isPublished === true;
    if (typeof price !== "undefined") updateData.price = Number(price);

    if (req.file) {
      const thumbnail = await uploadCloudinary(req.file.path);
      if (thumbnail) updateData.thumbnail = thumbnail;
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, updateData, {
      returnDocument: "after",
    }).populate("lectures reviews");

    return res.status(200).json(updatedCourse);
  } catch (error) {
    console.error("[EditCourse Error]", error);
    return res.status(400).json({ success: false, message: `Failed to edit course: ${error.message || error}` });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tenantId = req.tenantId;

    const course = await Course.findOne({ _id: courseId, tenantId })
      .populate("lectures reviews")
      .populate("creator", "name email profilePicture description");

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Try optional auth extraction for viewer from cookie or Authorization header
    let userId = req.userId;
    let userRole = req.userRole;
    if (!userId && (req.cookies?.token || req.headers.authorization)) {
      try {
        let token = req.cookies?.token;
        if (!token && req.headers.authorization?.startsWith("Bearer ")) {
          token = req.headers.authorization.split(" ")[1];
        }
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (
            decoded &&
            (!decoded.tenantId ||
              decoded.tenantId.toString() === tenantId.toString() ||
              decoded.role === "platform_admin")
          ) {
            userId = decoded.userId;
            userRole = decoded.role;
          }
        }
      } catch (e) {
        // Unauthenticated visitor
      }
    }

    const access = await verifyCourseAccess({
      courseId,
      userId,
      userRole,
      tenantId,
    });

    const courseObj = course.toObject();
    // Sanitize lectures if viewer doesn't have full access (scrub locked videoUrl)
    courseObj.lectures = sanitizeLecturesForViewer(courseObj.lectures, access.hasAccess);
    courseObj.hasAccess = access.hasAccess;
    courseObj.isEnrolled = access.isEnrolled;
    courseObj.isFree = access.isFree;

    return res.status(200).json(courseObj);
  } catch (error) {
    console.error("[GetCourseById Error]", error);
    return res.status(400).json({ success: false, message: `Failed to get course: ${error.message || error}` });
  }
};

export const removeCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tenantId = req.tenantId;

    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Authorization: only the creator or admin can remove
    if (course.creator.toString() !== req.userId.toString() && req.userRole !== "tenant_admin" && req.userRole !== "platform_admin") {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this course" });
    }

    // Delete associated lectures and resources
    await Lecture.deleteMany({ _id: { $in: course.lectures }, tenantId });
    await Resource.deleteMany({ courseId, tenantId });
    await Course.findByIdAndDelete(courseId);

    return res.status(200).json({ success: true, message: "Course removed successfully!" });
  } catch (error) {
    console.error("[RemoveCourse Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to delete course: ${error.message}`,
    });
  }
};

// ================= Lecture Controllers =================

export const createLecture = async (req, res) => {
  try {
    const { lectureTitle, isPreviewFree, resourceTitle, resourceDescription, resourceType, resourceFileUrl } = req.body;
    const { courseId } = req.params;
    const tenantId = req.tenantId;

    if (!lectureTitle || !courseId) {
      return res.status(400).json({ success: false, message: "lectureTitle and courseId are required" });
    }

    const resourceData = (resourceTitle && resourceFileUrl) ? {
      title: resourceTitle,
      description: resourceDescription,
      type: resourceType,
      fileUrl: resourceFileUrl,
    } : null;

    const result = await lectureService.createLecture({
      tenantId,
      userId: req.userId,
      userRole: req.userRole,
      courseId,
      lectureTitle,
      isPreviewFree,
      videoFile: req.file,
      resourceData,
    });

    return res.status(201).json({ lecture: result.lecture, course: result.course, resource: result.resource });
  } catch (error) {
    console.error("[CreateLecture Error]", error);
    return res.status(500).json({ success: false, message: `Failed to create lecture: ${error.message}` });
  }
};

export const getCourseLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    // Strict Course Access Security Check
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
        message: access.reason || "Payment required: You must be enrolled in this course to access the classroom lectures.",
        isEnrolled: false,
        isFree: access.isFree,
      });
    }

    const course = await Course.findOne({ _id: courseId, tenantId })
      .populate("lectures")
      .populate("creator", "name email profilePicture description");

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found!" });
    }

    const courseObj = course.toObject();
    courseObj.hasAccess = true;
    courseObj.isEnrolled = true;

    return res.status(200).json(courseObj);
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed to get lecture: ${error.message}` });
  }
};

export const editLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const tenantId = req.tenantId;
    const { isPreviewFree, lectureTitle, resourceTitle, resourceDescription, resourceType, resourceFileUrl } = req.body;

    const lecture = await Lecture.findOne({ _id: lectureId, tenantId });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found in this organization!" });
    }

    if (req.file) {
      const videoUrl = await uploadCloudinary(req.file.path);
      if (videoUrl) lecture.videoUrl = videoUrl;
    }

    if (lectureTitle) {
      lecture.lectureTitle = lectureTitle.trim();
    }

    if (typeof isPreviewFree !== "undefined") {
      lecture.isPreviewFree = isPreviewFree === "true" || isPreviewFree === true;
    }

    await lecture.save();

    // Optional: create resource if attached during lecture editing
    let attachedResource = null;
    if (resourceTitle && resourceFileUrl) {
      attachedResource = await Resource.create({
        tenantId,
        courseId: lecture.courseId,
        lectureId: lecture._id,
        title: resourceTitle.trim(),
        description: resourceDescription ? resourceDescription.trim() : "",
        type: resourceType || "pdf",
        fileUrl: resourceFileUrl,
        uploadedBy: req.userId,
      });
    }

    return res.status(200).json({ lecture, resource: attachedResource });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to edit lecture: ${error.message}`,
    });
  }
};

export const removeLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const tenantId = req.tenantId;

    const result = await lectureService.deleteLecture({
      tenantId,
      userId: req.userId,
      userRole: req.userRole,
      lectureId,
    });

    return res.status(200).json({ success: true, message: "Lecture removed successfully!", ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed to remove lecture: ${error.message}` });
  }
};

export const getCreatorById = async (req, res) => {
  try {
    const { userId } = req.body;
    const tenantId = req.tenantId;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const user = await User.findOne({ _id: userId, tenantId }).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "Creator not found in this organization." });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed to get creator: ${error.message}` });
  }
};
