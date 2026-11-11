import { verifyCourseAccess } from "../utils/courseAccess.js";
import { AUTH_MESSAGES } from "../utils/apiErrors.js";

/**
 * Middleware that strictly verifies course access before granting route execution.
 * Checks that the user is authenticated, belongs to the tenant, and is enrolled / paid / creator / admin.
 */
export const requireCourseAccess = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId || req.query.courseId;
    const userId = req.userId;
    const userRole = req.userRole;
    const tenantId = req.tenantId;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required" });
    }

    const access = await verifyCourseAccess({
      courseId,
      userId,
      userRole,
      tenantId,
    });

    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        code: "RESOURCE_ACCESS_DENIED",
        message: AUTH_MESSAGES.RESOURCE_ACCESS_DENIED,
        accessDenied: true,
        isEnrolled: false,
        isFree: access.isFree,
      });
    }

    // Attach course to req for downstream controllers to avoid redundant DB queries
    req.course = access.course;
    req.courseAccess = access;
    next();
  } catch (error) {
    console.error("[RequireCourseAccess Middleware Error]", error);
    return res.status(500).json({
      success: false,
      message: `Course authorization check failed: ${error.message}`,
    });
  }
};

export default requireCourseAccess;

