import Course from "../models/coursesModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import { isInstitutionOwner } from "./permissions.js";

/**
 * Verifies whether a given user has full access to view course lectures and protected resources.
 * 
 * Access is granted if:
 * 1. The user is the creator of the course
 * 2. The user owns the institution or is a platform administrator
 * 3. The user is enrolled in the course (either paid or free enrollment)
 * 4. The course is free AND public free-view is enabled
 * 
 * Returns an object: { hasAccess: boolean, isCreator: boolean, isEnrolled: boolean, isFree: boolean, reason?: string }
 */
export const verifyCourseAccess = async ({ courseId, userId, userRole, tenantId }) => {
  if (!courseId || !tenantId) {
    return { hasAccess: false, reason: "Missing course or tenant parameters" };
  }

  const course = await Course.findOne({ _id: courseId, tenantId });
  if (!course) {
    return { hasAccess: false, reason: "Course not found in this organization" };
  }

  // Creator or Admin always has full access
  const isCreator = userId && course.creator.toString() === userId.toString();
  const isAdmin = await isInstitutionOwner({ tenantId, userId, userRole });

  if (isCreator || isAdmin) {
    return {
      hasAccess: true,
      course,
      isCreator,
      isAdmin,
      isEnrolled: true,
    };
  }

  // Check formal CourseAccess grant (supports PURCHASED, INSTITUTION_GRANTED, etc.)
  if (userId) {
    const grant = await CourseAccess.findOne({ userId, courseId, tenantId });
    if (grant) {
      if (grant.status === "active") {
        return {
          hasAccess: true,
          course,
          isEnrolled: true,
          isFree: !course.price || Number(course.price) === 0,
          accessSource: grant.source,
        };
      }
      if (grant.status === "revoked") {
        return {
          hasAccess: false,
          course,
          isEnrolled: false,
          isFree: false,
          reason: "Access to this course was revoked by the institution administrator.",
        };
      }
    }
  }

  // Check enrollment array
  const isEnrolled =
    Boolean(userId) &&
    Array.isArray(course.enrolledStudents) &&
    course.enrolledStudents.some((id) => id.toString() === userId.toString());

  if (isEnrolled) {
    return {
      hasAccess: true,
      course,
      isEnrolled: true,
      isFree: !course.price || Number(course.price) === 0,
    };
  }

  const isFree = !course.price || Number(course.price) === 0;

  return {
    hasAccess: false,
    course,
    isEnrolled: false,
    isFree,
    reason: isFree
      ? "Please click 'Enroll for Free' to join this course and access lectures."
      : "Payment required: Please purchase this course to access the complete video curriculum and resources.",
  };
};

/**
 * Sanitizes lecture list for users without full course access.
 * Non-preview lectures will have their videoUrl and protected fields stripped.
 */
export const sanitizeLecturesForViewer = (lectures, hasFullAccess) => {
  if (!lectures || !Array.isArray(lectures)) return [];

  return lectures.map((lecture) => {
    const raw = typeof lecture.toObject === "function" ? lecture.toObject() : { ...lecture };

    if (hasFullAccess || raw.isPreviewFree) {
      return {
        ...raw,
        isLocked: false,
      };
    }

    // Locked lecture: strip protected videoUrl
    return {
      _id: raw._id,
      lectureTitle: raw.lectureTitle,
      isPreviewFree: false,
      isLocked: true,
      videoUrl: null, // Scrubbed to prevent unauthorized watching
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  });
};

