import InstitutionMembership from "../models/institutionMembershipModel.js";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import Course from "../models/coursesModel.js";
import { apiError } from "../utils/apiErrors.js";
import { can, normalizeRole, PERMISSIONS, ROLES } from "../utils/permissions.js";

const requireInstitutionMembership = async (req, res, next) => {
  try {
    if (!req.userId) {
      return apiError(res, 401, "UNAUTHENTICATED");
    }
    const user = await User.findById(req.userId).select("tenantId role");
    if (!user) return apiError(res, 401, "UNAUTHENTICATED");
    const userRole = normalizeRole(user?.role);

    // If courseId is in params, verify course association
    const courseId = req.params?.courseId;
    if (courseId) {
      const course = await Course.findById(courseId).select("creator tenantId isPublished");
      if (course) {
        // Educator creator or educator managing this tenant's course
        if (userRole === ROLES.EDUCATOR) {
          if (course.creator?.toString() === req.userId?.toString() ||
              (req.tenantId && course.tenantId?.toString() === req.tenantId?.toString())) {
            if (course.tenantId) req.tenantId = course.tenantId;
            return next();
          }
        }

        // If the course is published, any authenticated user can view its course details / curriculum
        const requestUrl = req.originalUrl || req.url || "";
        const isDetailsView = requestUrl.includes("/getcourse/");
        if (course.isPublished && isDetailsView) {
          if (course.tenantId) req.tenantId = course.tenantId;
          return next();
        }
      }
    }

    if (!req.tenantId) {
      return res.status(400).json({ success: false, message: "Choose an institution to continue." });
    }

    // Institution owners and authorized educators always have workspace access
    if (userRole === ROLES.EDUCATOR) {
      const isOwner = await Tenant.exists({ _id: req.tenantId, ownerId: req.userId });
      if (isOwner) return next();
    }

    if (await can({
      permission: PERMISSIONS.USE_EDUCATOR_WORKSPACE,
      userId: req.userId,
      userRole,
      userTenantId: user?.tenantId,
      tenantId: req.tenantId,
    })) return next();
    if (userRole === ROLES.EDUCATOR || userRole === ROLES.PLATFORM_ADMIN) return apiError(res, 403, "INSTITUTION_ACCESS_DENIED");

    // Allow browsing public published courses of an institution
    const isBrowsePublished = (req.originalUrl || req.url || "").includes("/getpublished") || (req.originalUrl || req.url || "").includes("/by-institution/");
    if (isBrowsePublished) {
      return next();
    }

    // Allow if student's primary tenant matches
    if (user?.tenantId && user.tenantId.toString() === req.tenantId.toString()) {
      return next();
    }

    const membership = await InstitutionMembership.findOne({
      userId: req.userId,
      tenantId: req.tenantId,
      role: "student",
      status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
    }).select("_id");
    if (membership) {
      return next();
    }

    // Check if student is enrolled in any course of this institution
    if (Array.isArray(user?.enrolledCourses) && user.enrolledCourses.length > 0) {
      const hasEnrolled = await Course.exists({
        _id: { $in: user.enrolledCourses },
        tenantId: req.tenantId,
      });
      if (hasEnrolled) return next();
    }

    return apiError(res, 403, "INSTITUTION_ACCESS_DENIED");
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not verify institution access." });
  }
};

export default requireInstitutionMembership;
