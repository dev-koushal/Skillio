import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import Review from "../models/reviewModel.js";
import uploadCloudinary from "../config/cloudinary.js";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import Resource from "../models/resourceModel.js";
import jwt from "jsonwebtoken";
import { verifyCourseAccess, sanitizeLecturesForViewer } from "../utils/courseAccess.js";
import { courseService } from "../services/courseService.js";
import { lectureService } from "../services/lectureService.js";
import videoPlaybackService from "../services/video/videoPlaybackService.js";
import { parseYouTubeVideoUrl } from "../utils/youtubeVideo.js";
import { canManageCourse, isInstitutionOwner } from "../utils/permissions.js";

export const createCourse = async (req, res) => {
  try {
    const { title, category, subTitle, description, price, level, isPublished } = req.body;
    let tenantId = req.tenantId;

    // Guarantee educator courses always bind to their owned or assigned institution
    if (req.userId) {
      const user = await User.findById(req.userId).select("tenantId role");
      if (user?.role === "educator") {
        if (user.tenantId) {
          tenantId = user.tenantId;
        } else {
          const ownedTenant = await Tenant.findOne({ ownerId: user._id, status: "active" });
          if (ownedTenant) tenantId = ownedTenant._id;
        }
      }
    }

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
    const filter = { isPublished: true, tenantId: req.tenantId };

    const courses = await Course.find(filter)
      .populate({
        path: "lectures",
        select: "_id lectureTitle isPreviewFree duration videoProvider processingStatus",
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

/**
 * Get published courses specifically isolated to a particular institution by its slug.
 * Ensures zero cross-tenant course leakage.
 */
export const getPublishedCoursesBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug || slug.toLowerCase().trim() !== req.tenantSlug) {
      return res.status(403).json({ success: false, message: "Select this institution before viewing its courses." });
    }

    const courses = await Course.find({ isPublished: true, tenantId: req.tenantId })
      .populate({
        path: "lectures",
        select: "_id lectureTitle isPreviewFree duration videoProvider processingStatus",
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
      message: `Failed to get institution courses: ${error.message || error}`,
    });
  }
};

export const getCreatorCourses = async (req, res) => {
  try {
    const userId = req.userId;

    const courseFilter = {};
    if (req.userRole !== "platform_admin") courseFilter.tenantId = req.tenantId;
    // The institution owner is still an educator. Ownership grants access to
    // every course in this institution; other educators see their own courses.
    const isAssignedInstitutionEducator = req.userTenantId?.toString() === req.tenantId?.toString();
    if (!isAssignedInstitutionEducator && !(await isInstitutionOwner({ tenantId: req.tenantId, userId, userRole: req.userRole, userTenantId: req.userTenantId }))) {
      courseFilter.creator = userId;
    }
    const courses = await Course.find(courseFilter)
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
    const {
      title,
      subTitle,
      description,
      category,
      level,
      isPublished,
      price,
    } = req.body;

    const courseFilter = { _id: courseId };
    if (req.userRole !== "platform_admin") courseFilter.tenantId = req.tenantId;

    const course = await Course.findOne(courseFilter);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Authorization: only the creator or an admin can edit
    if (!(await canManageCourse({ course, tenantId: req.tenantId, userId: req.userId, userRole: req.userRole }))) {
      return res.status(403).json({ success: false, message: "You are not authorized to edit this course" });
    }

    if (typeof title !== "undefined" && !String(title).trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (typeof price !== "undefined" && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ success: false, message: "Price must be a valid non-negative number" });
    }

    const updateData = {};
    if (typeof title !== "undefined") updateData.title = String(title).trim();
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

    const updatedCourse = await Course.findOneAndUpdate(courseFilter, updateData, {
      returnDocument: "after",
      runValidators: true,
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

    const access = await verifyCourseAccess({
      courseId,
      userId: req.userId,
      userRole: req.userRole,
      tenantId,
    });

    if (req.userRole === "student" && !course.isPublished && !access.isEnrolled) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

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
    if (!(await canManageCourse({ course, tenantId, userId: req.userId, userRole: req.userRole }))) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this course" });
    }

    await courseService.deleteCourse({
      tenantId,
      userId: req.userId,
      userRole: req.userRole,
      courseId,
    });

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
    const { lectureTitle, isPreviewFree, resourceTitle, resourceDescription, resourceType, resourceFileUrl, videoProvider, youtubeUrl } = req.body;
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
      videoProvider,
      youtubeUrl,
      resourceData,
    });

    return res.status(201).json({ lecture: result.lecture, course: result.course, resource: result.resource });
  } catch (error) {
    console.error("[CreateLecture Error]", error);
    return res.status(error.status || (/not authorized/i.test(error.message) ? 403 : /not found/i.test(error.message) ? 404 : 400)).json({ success: false, message: error.message || "Failed to create lecture." });
  }
};

export const validateYouTubeUrl = async (req, res) => {
  try {
    const result = parseYouTubeVideoUrl(req.body?.youtubeUrl);
    return res.status(200).json({ success: true, videoId: result.videoId, canonicalUrl: result.canonicalUrl });
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message || "Enter a valid YouTube video URL." });
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

    // Secure lecture list: strip permanent raw media URLs; playback is authorized on-demand via /playback endpoint
    if (Array.isArray(courseObj.lectures)) {
      courseObj.lectures = courseObj.lectures.map((l) => ({
        _id: l._id,
        lectureTitle: l.lectureTitle,
        duration: l.duration || 0,
        isPreviewFree: Boolean(l.isPreviewFree),
        videoProvider: l.videoProvider || "cloudinary",
        processingStatus: l.processingStatus || "ready",
        isLocked: false,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      }));
    }

    return res.status(200).json(courseObj);
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed to get lecture: ${error.message}` });
  }
};

export const editLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const tenantId = req.tenantId;
    const { isPreviewFree, lectureTitle, resourceTitle, resourceDescription, resourceType, resourceFileUrl, videoProvider, youtubeUrl } = req.body;

    const lecture = await lectureService.updateLecture({
      tenantId,
      userId: req.userId,
      userRole: req.userRole,
      lectureId,
      lectureTitle,
      isPreviewFree,
      videoFile: req.file,
      videoProvider,
      youtubeUrl,
    });

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
    return res.status(error.status || (/not authorized/i.test(error.message) ? 403 : /not found/i.test(error.message) ? 404 : 400)).json({
      success: false,
      message: error.message || "Failed to edit lecture.",
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

/**
 * Short-lived authorized playback endpoint.
 * Authenticates user, verifies tenant context & course access, and generates tokenized streaming credentials.
 */
export const getLecturePlayback = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const tenantId = req.tenantId;

    let userId = req.userId;
    let userRole = req.userRole;

    // Optional auth extraction from cookie or Authorization header for free previews
    if (!userId && (req.cookies?.token || req.headers.authorization)) {
      try {
        let rawToken = req.cookies?.token;
        if (!rawToken && req.headers.authorization?.startsWith("Bearer ")) {
          rawToken = req.headers.authorization.split(" ")[1];
        }
        if (rawToken) {
          const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
          if (decoded && decoded.userId) {
            userId = decoded.userId;
            userRole = decoded.role;
          }
        }
      } catch (e) {}
    }

    const playbackResult = await videoPlaybackService.getLecturePlayback({
      lectureId,
      userId,
      userRole,
      tenantId,
    });

    if (!playbackResult.authorized) {
      return res.status(playbackResult.status || 403).json({
        success: false,
        accessDenied: true,
        message: playbackResult.message || "You do not have authorization to view this lecture.",
      });
    }

    return res.status(200).json({
      success: true,
      playback: playbackResult,
    });
  } catch (error) {
    console.error("[GetLecturePlayback Error]", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred verifying video authorization.",
    });
  }
};
