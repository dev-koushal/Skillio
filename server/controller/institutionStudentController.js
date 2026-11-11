import Course from "../models/coursesModel.js";
import User from "../models/userModel.js";
import Invitation from "../models/invitationModel.js";
import Tenant from "../models/tenantModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import { sendInvitationEmail } from "../config/sendMail.js";
import crypto from "crypto";
import { can, PERMISSIONS, ROLES } from "../utils/permissions.js";

/**
 * Resolves the authenticated educator's institution.
 * Strictly resolves server-side from authenticated identity (never trusts body/query).
 */
const resolveEducatorTenant = async (req) => {
  const userId = req.userId;
  if (!userId) return null;

  const educator = await User.findById(userId);
  if (!educator) return null;

  // Institution access is derived from the educator's tenant/ownership context.
  if (![ROLES.EDUCATOR, ROLES.PLATFORM_ADMIN].includes(educator.role)) {
    return null;
  }

  // Platform admins operate on the server-resolved request tenant. Educators
  // resolve their own institution relationship from the database.
  let tenant = educator.role === ROLES.PLATFORM_ADMIN && req.tenantId
    ? await Tenant.findOne({ _id: req.tenantId, status: "active" })
    : await Tenant.findOne({ ownerId: userId, status: "active" });

  // 2. Fall back to user's assigned tenantId
  if (!tenant && educator.tenantId) {
    tenant = await Tenant.findOne({ _id: educator.tenantId, status: "active" });
  }

  if (!tenant || !(await can({
    permission: PERMISSIONS.MANAGE_STUDENTS,
    userId,
    userRole: educator.role,
    userTenantId: educator.tenantId,
    tenantId: tenant._id,
  }))) return null;

  return { educator, tenant };
};

const isStudentInTenant = async (student, tenantId) => {
  if (!student || student.role !== "student") return false;
  if (student.tenantId?.toString() === tenantId.toString()) return true;
  const membership = await InstitutionMembership.findOne({
    userId: student._id,
    tenantId,
    role: "student",
    status: "active",
  });
  return Boolean(membership);
};

/**
 * GET /api/institutions/me/stats
 * Real-time database metrics for the educator's institution
 */
export const getInstitutionStats = async (req, res) => {
  try {
    const authData = await resolveEducatorTenant(req);
    if (!authData || !authData.tenant) {
      return res.status(403).json({
        success: false,
        message: "You must be an authenticated educator associated with an active institution.",
      });
    }

    const tenantId = authData.tenant._id;

    // 1. Courses metrics
    const totalCourses = await Course.countDocuments({ tenantId });
    const publishedCourses = await Course.countDocuments({ tenantId, isPublished: true });

    // 2. Student metrics (scoped strictly to this institution)
    // Distinct students across CourseAccess and InstitutionMembership
    const membershipStudentIds = await InstitutionMembership.distinct("userId", {
      tenantId,
      role: "student",
      status: "active",
    });

    const accessStudentIds = await CourseAccess.distinct("userId", {
      tenantId,
      status: "active",
    });

    // Also include enrolledStudents in course documents for existing legacy data
    const courseStudentIdsArrays = await Course.find({ tenantId }).distinct("enrolledStudents");

    // Merge and deduplicate student IDs
    const allStudentIdSet = new Set([
      ...membershipStudentIds.map((id) => id.toString()),
      ...accessStudentIds.map((id) => id.toString()),
      ...courseStudentIdsArrays.map((id) => id.toString()),
    ]);

    const totalStudents = allStudentIdSet.size;

    // Students with at least 1 active course in this institution
    const activeCourseStudentSet = new Set([
      ...accessStudentIds.map((id) => id.toString()),
      ...courseStudentIdsArrays.map((id) => id.toString()),
    ]);
    const studentsWithCourses = activeCourseStudentSet.size;

    // Students joined or active in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newStudentsCount = await InstitutionMembership.countDocuments({
      tenantId,
      role: "student",
      joinedAt: { $gte: thirtyDaysAgo },
    });

    // Active access grants count
    const activeAccessGrants = await CourseAccess.countDocuments({
      tenantId,
      status: "active",
    });

    return res.status(200).json({
      success: true,
      institution: {
        id: authData.tenant._id,
        name: authData.tenant.name,
        slug: authData.tenant.slug,
      },
      stats: {
        totalStudents,
        studentsWithCourses,
        newStudents: newStudentsCount,
        totalCourses,
        publishedCourses,
        activeAccessGrants,
      },
    });
  } catch (error) {
    console.error("[GetInstitutionStats Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/institutions/me/overview
 * Lightweight, aggregated educator overview answering "How is my institution doing?" at a glance.
 * Returns:
 * - stats (students, active students, courses, revenue)
 * - recentCourses (3-4 max)
 * - recentStudents (3-5 max)
 * - recentActivity (5-6 actual events max)
 * - trend (compact 6-month enrollment trend)
 */
export const getInstitutionOverview = async (req, res) => {
  try {
    const authData = await resolveEducatorTenant(req);
    if (!authData || !authData.tenant) {
      return res.status(403).json({
        success: false,
        message: "You must be an authenticated educator associated with an active institution.",
      });
    }

    const tenantId = authData.tenant._id;

    // 1. All courses for this tenant (compact projection)
    const courses = await Course.find({ tenantId })
      .select("title thumbnail price isPublished enrolledStudents category updatedAt createdAt")
      .sort({ updatedAt: -1 });

    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c) => c.isPublished).length;

    // Compute total revenue from course enrollments
    let totalRevenue = 0;
    courses.forEach((c) => {
      const studentCount = (c.enrolledStudents || []).length;
      if (c.price && studentCount > 0) {
        totalRevenue += c.price * studentCount;
      }
    });

    // 2. Student metrics & deduplication
    const membershipStudentIds = await InstitutionMembership.distinct("userId", {
      tenantId,
      role: "student",
      status: "active",
    });

    const accessStudentIds = await CourseAccess.distinct("userId", {
      tenantId,
      status: "active",
    });

    const courseStudentIdsArrays = courses.flatMap((c) =>
      (c.enrolledStudents || []).map((id) => id.toString())
    );

    const allStudentIdSet = new Set([
      ...membershipStudentIds.map((id) => id.toString()),
      ...accessStudentIds.map((id) => id.toString()),
      ...courseStudentIdsArrays,
    ]);

    const totalStudents = allStudentIdSet.size;

    // Active students: students with active access or enrollment
    const activeStudentIdSet = new Set([
      ...accessStudentIds.map((id) => id.toString()),
      ...courseStudentIdsArrays,
    ]);
    const activeStudents = activeStudentIdSet.size || totalStudents;

    // 3. Recent 3-4 courses
    const recentCourses = courses.slice(0, 4).map((c) => ({
      _id: c._id,
      title: c.title,
      thumbnail: c.thumbnail,
      isPublished: c.isPublished,
      price: c.price,
      category: c.category,
      studentCount: (c.enrolledStudents || []).length,
      updatedAt: c.updatedAt,
    }));

    // 4. Recent 3-5 students
    const recentStudentIds = Array.from(allStudentIdSet).slice(0, 10);
    const recentUserDocs = await User.find({ _id: { $in: recentStudentIds } })
      .select("name email profilePicture createdAt")
      .sort({ createdAt: -1 })
      .limit(5);

    // Map each recent student with their course
    const recentStudents = recentUserDocs.map((u) => {
      const studentCourse = courses.find((c) =>
        (c.enrolledStudents || []).some((id) => id.toString() === u._id.toString())
      );
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        profilePicture: u.profilePicture,
        courseName: studentCourse?.title || "Enrolled Learner",
        createdAt: u.createdAt,
      };
    });

    // 5. Recent Activity (max 5-6 events)
    const recentAccessDocs = await CourseAccess.find({ tenantId })
      .populate("userId", "name")
      .populate("courseId", "title")
      .sort({ grantedAt: -1 })
      .limit(4);

    const activities = [];

    recentAccessDocs.forEach((a) => {
      const studentName = a.userId?.name || "Student";
      const courseTitle = a.courseId?.title || "Course";
      const actionText =
        a.source === "INSTITUTION_GRANTED"
          ? `was granted direct access to "${courseTitle}"`
          : a.source === "PURCHASED"
          ? `enrolled in "${courseTitle}"`
          : `joined "${courseTitle}"`;

      activities.push({
        id: a._id.toString(),
        type: "access_grant",
        title: `${studentName} ${actionText}`,
        timestamp: a.grantedAt,
      });
    });

    // Add recent course publications/updates if any
    courses.slice(0, 3).forEach((c) => {
      if (c.isPublished) {
        activities.push({
          id: `course_${c._id.toString()}`,
          type: "course_publish",
          title: `Course published: "${c.title}"`,
          timestamp: c.updatedAt || c.createdAt,
        });
      }
    });

    // Sort all activities by timestamp desc and take top 5
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivity = activities.slice(0, 5);

    // 6. Compact 6-month enrollment trend
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await CourseAccess.countDocuments({
        tenantId,
        grantedAt: { $gte: d, $lt: nextD },
      });
      trend.push({
        month: months[d.getMonth()],
        students: count,
      });
    }

    // Baseline fallback if trend is all zeros but totalStudents exists
    const totalTrendStudents = trend.reduce((sum, t) => sum + t.students, 0);
    if (totalTrendStudents === 0 && totalStudents > 0) {
      trend[trend.length - 1].students = totalStudents;
    }

    return res.status(200).json({
      success: true,
      institution: {
        id: authData.tenant._id,
        name: authData.tenant.name,
        slug: authData.tenant.slug,
        institutionType: authData.tenant.institutionType || "Academy",
        logo: authData.tenant.logo,
      },
      stats: {
        totalStudents,
        activeStudents,
        totalCourses,
        publishedCourses,
        totalRevenue,
      },
      recentCourses,
      recentStudents,
      recentActivity,
      trend,
    });
  } catch (error) {
    console.error("[GetInstitutionOverview Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/institutions/me/students
 * Paginated, searchable, filterable list of students belonging ONLY to educator's institution
 */
export const getInstitutionStudents = async (req, res) => {
  try {
    const authData = await resolveEducatorTenant(req);
    if (!authData || !authData.tenant) {
      return res.status(403).json({
        success: false,
        message: "You must be an authenticated educator associated with an active institution.",
      });
    }

    const tenantId = authData.tenant._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = req.query.search ? req.query.search.trim() : "";
    const filter = req.query.filter || "all"; // 'all', 'active', 'withCourses'
    const courseId = req.query.courseId ? req.query.courseId.trim() : "";

    // 1. Collect all valid courses belonging to this institution
    const institutionCourses = await Course.find({ tenantId }).select("_id title price");
    const institutionCourseIds = institutionCourses.map((c) => c._id);
    const courseMap = new Map(institutionCourses.map((c) => [c._id.toString(), c]));

    // 2. Identify all students associated with this institution
    let targetUserIds = new Set();

    if (courseId) {
      // Filter by specific course
      const course = courseMap.get(courseId);
      if (course) {
        const directAccess = await CourseAccess.find({
          tenantId,
          courseId,
          status: "active",
        }).distinct("userId");
        const docCourse = await Course.findById(courseId).select("enrolledStudents");
        [...directAccess, ...(docCourse?.enrolledStudents || [])].forEach((id) =>
          targetUserIds.add(id.toString())
        );
      }
    } else {
      // All students associated with institution
      const memberships = await InstitutionMembership.find({
        tenantId,
        role: "student",
      }).distinct("userId");
      memberships.forEach((id) => targetUserIds.add(id.toString()));

      const accessGrants = await CourseAccess.find({
        tenantId,
        status: "active",
      }).distinct("userId");
      accessGrants.forEach((id) => targetUserIds.add(id.toString()));

      // Direct enrolled students on courses
      institutionCourses.forEach((c) => {
        if (c.enrolledStudents && Array.isArray(c.enrolledStudents)) {
          c.enrolledStudents.forEach((id) => targetUserIds.add(id.toString()));
        }
      });

      // Also include users directly scoped to tenantId with student role
      const tenantStudents = await User.find({ tenantId, role: "student" }).distinct("_id");
      tenantStudents.forEach((id) => targetUserIds.add(id.toString()));
    }

    const studentIdArray = Array.from(targetUserIds);

    // 3. Build user query with search & pagination
    const userQuery = {
      _id: { $in: studentIdArray },
    };

    if (search) {
      const searchRegex = new RegExp(search, "i");
      userQuery.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const totalStudents = await User.countDocuments(userQuery);
    const users = await User.find(userQuery)
      .select("name email profilePicture createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // 4. Enrich students with institution-scoped course access details
    const studentList = await Promise.all(
      users.map(async (u) => {
        // Find course access records in THIS institution
        const accessRecords = await CourseAccess.find({
          userId: u._id,
          tenantId,
          status: "active",
        });

        // Also check course.enrolledStudents fallback
        const enrolledCourseDocs = await Course.find({
          tenantId,
          enrolledStudents: u._id,
        }).select("_id title price");

        const courseDetails = [];
        const seenCourseIds = new Set();

        accessRecords.forEach((ar) => {
          const c = courseMap.get(ar.courseId.toString());
          if (c && !seenCourseIds.has(c._id.toString())) {
            seenCourseIds.add(c._id.toString());
            courseDetails.push({
              courseId: c._id,
              title: c.title,
              source: ar.source,
              grantedAt: ar.grantedAt,
            });
          }
        });

        enrolledCourseDocs.forEach((c) => {
          if (!seenCourseIds.has(c._id.toString())) {
            seenCourseIds.add(c._id.toString());
            courseDetails.push({
              courseId: c._id,
              title: c.title,
              source: c.price > 0 ? "PURCHASED" : "FREE",
              grantedAt: u.createdAt,
            });
          }
        });

        // Membership record
        const membership = await InstitutionMembership.findOne({
          userId: u._id,
          tenantId,
        });

        return {
          id: u._id,
          name: u.name,
          email: u.email,
          profilePicture: u.profilePicture || "",
          status: membership?.status || "active",
          joinedAt: membership?.joinedAt || u.createdAt,
          lastActiveAt: membership?.lastActiveAt || u.updatedAt,
          enrollmentCount: courseDetails.length,
          courses: courseDetails,
        };
      })
    );

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total: totalStudents,
        pages: Math.ceil(totalStudents / limit) || 1,
      },
      students: studentList,
    });
  } catch (error) {
    console.error("[GetInstitutionStudents Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/institutions/me/students/:studentId
 * Detailed profile and course access breakdown for a specific student in educator's institution
 */
export const getInstitutionStudentDetail = async (req, res) => {
  try {
    const authData = await resolveEducatorTenant(req);
    if (!authData || !authData.tenant) {
      return res.status(403).json({
        success: false,
        message: "You must be an authenticated educator associated with an active institution.",
      });
    }

    const tenantId = authData.tenant._id;
    const { studentId } = req.params;

    const student = await User.findOne({ _id: studentId, role: "student" })
      .select("name email profilePicture description createdAt tenantId");
    if (!student || !(await isStudentInTenant(student, tenantId))) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // 1. All courses belonging to THIS institution
    const institutionCourses = await Course.find({ tenantId })
      .select("title subTitle category price thumbnail isPublished lectures")
      .populate("lectures", "title duration");

    // 2. Active and past access records for this student in THIS institution
    const accessRecords = await CourseAccess.find({
      userId: student._id,
      tenantId,
    });
    const accessMap = new Map(accessRecords.map((a) => [a.courseId.toString(), a]));

    // Check direct course.enrolledStudents
    const courseStatusList = institutionCourses.map((c) => {
      const access = accessMap.get(c._id.toString());
      const isDirectlyEnrolled = c.enrolledStudents && c.enrolledStudents.some((id) => id.toString() === student._id.toString());

      let hasAccess = false;
      let accessSource = null;
      let grantedAt = null;
      let revokedAt = null;
      let status = "NO_ACCESS";

      if (access) {
        status = access.status;
        hasAccess = access.status === "active";
        accessSource = access.source;
        grantedAt = access.grantedAt;
        revokedAt = access.revokedAt;
      } else if (isDirectlyEnrolled) {
        status = "active";
        hasAccess = true;
        accessSource = c.price > 0 ? "PURCHASED" : "FREE";
        grantedAt = student.createdAt;
      }

      return {
        courseId: c._id,
        title: c.title,
        subTitle: c.subTitle,
        category: c.category,
        price: c.price,
        thumbnail: c.thumbnail,
        lectureCount: c.lectures?.length || 0,
        hasAccess,
        status,
        accessSource,
        grantedAt,
        revokedAt,
      };
    });

    // Student must be associated with this institution to view
    const membership = await InstitutionMembership.findOne({ userId: student._id, tenantId });
    const hasAnyAccess = courseStatusList.some((c) => c.hasAccess || c.status === "revoked");
    const isDirectTenantStudent = student.tenantId && student.tenantId.toString() === tenantId.toString();

    if (!membership && !hasAnyAccess && !isDirectTenantStudent) {
      return res.status(404).json({
        success: false,
        message: "This student is not enrolled or registered in your institution.",
      });
    }

    return res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        profilePicture: student.profilePicture,
        joinedAt: membership?.joinedAt || student.createdAt,
        status: membership?.status || "active",
      },
      courses: courseStatusList,
    });
  } catch (error) {
    console.error("[GetInstitutionStudentDetail Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/institutions/me/students/:studentId/access
 * Educator manually grants course access to a student
 */
export const grantCourseAccess = async (req, res) => {
  try {
    const authData = await resolveEducatorTenant(req);
    if (!authData || !authData.tenant) {
      return res.status(403).json({
        success: false,
        message: "You must be an authenticated educator associated with an active institution.",
      });
    }

    const tenantId = authData.tenant._id;
    const { studentId } = req.params;
    const { courseId, source = "INSTITUTION_GRANTED", expiresAt } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required" });
    }

    // 1. Verify course belongs to THIS educator's institution
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found in your institution. You can only grant access to your own courses.",
      });
    }

    // 2. Verify student exists
    const student = await User.findOne({ _id: studentId, role: "student" });
    if (!student || !(await isStudentInTenant(student, tenantId))) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // 3. Upsert CourseAccess with INSTITUTION_GRANTED (or specified source)
    const access = await CourseAccess.findOneAndUpdate(
      { userId: student._id, courseId: course._id, tenantId },
      {
        userId: student._id,
        courseId: course._id,
        tenantId,
        source: source === "ADMIN_GRANTED" ? "ADMIN_GRANTED" : "INSTITUTION_GRANTED",
        status: "active",
        grantedBy: req.userId,
        grantedAt: new Date(),
        revokedAt: null,
        revokedBy: null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Sync User.enrolledCourses and Course.enrolledStudents
    if (!student.enrolledCourses.some((id) => id.toString() === course._id.toString())) {
      student.enrolledCourses.push(course._id);
      await student.save();
    }

    if (!course.enrolledStudents.some((id) => id.toString() === student._id.toString())) {
      course.enrolledStudents.push(student._id);
      await course.save();
    }

    // 5. Ensure InstitutionMembership exists
    await InstitutionMembership.findOneAndUpdate(
      { userId: student._id, tenantId },
      {
        userId: student._id,
        tenantId,
        role: "student",
        status: "active",
        lastActiveAt: new Date(),
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    console.log(
      `[ACCESS GRANTED] Educator ${req.userId} granted access to course '${course.title}' for student ${student.email} in institution ${authData.tenant.name}`
    );

    return res.status(200).json({
      success: true,
      message: `Access to '${course.title}' granted successfully to ${student.name}!`,
      access: {
        courseId: course._id,
        title: course.title,
        source: access.source,
        status: access.status,
        grantedAt: access.grantedAt,
      },
    });
  } catch (error) {
    console.error("[GrantCourseAccess Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/institutions/me/students/:studentId/access/:courseId
 * Educator revokes course access for a student
 * IMPORTANT: If student legitimately purchased the course, the financial record is preserved.
 */
export const revokeCourseAccess = async (req, res) => {
  try {
    const authData = await resolveEducatorTenant(req);
    if (!authData || !authData.tenant) {
      return res.status(403).json({
        success: false,
        message: "You must be an authenticated educator associated with an active institution.",
      });
    }

    const tenantId = authData.tenant._id;
    const { studentId, courseId } = req.params;
    const { reason = "Revoked by educator" } = req.body || {};

    // 1. Verify course belongs to THIS educator's institution
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found in your institution.",
      });
    }

    // 2. Find student
    const student = await User.findOne({ _id: studentId, role: "student" });
    if (!student || !(await isStudentInTenant(student, tenantId))) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // 3. Find or update CourseAccess record
    let access = await CourseAccess.findOne({ userId: student._id, courseId: course._id, tenantId });
    if (access) {
      access.status = "revoked";
      access.revokedAt = new Date();
      access.revokedBy = req.userId;
      access.revocationReason = reason;
      await access.save();
    } else {
      // Create explicit revoked record to keep audit trail
      access = await CourseAccess.create({
        userId: student._id,
        courseId: course._id,
        tenantId,
        source: course.price > 0 ? "PURCHASED" : "FREE",
        status: "revoked",
        revokedAt: new Date(),
        revokedBy: req.userId,
        revocationReason: reason,
      });
    }

    // 4. Remove active enrollment from User and Course
    student.enrolledCourses = student.enrolledCourses.filter(
      (id) => id.toString() !== course._id.toString()
    );
    await student.save();

    course.enrolledStudents = course.enrolledStudents.filter(
      (id) => id.toString() !== student._id.toString()
    );
    await course.save();

    console.log(
      `[ACCESS REVOKED] Educator ${req.userId} revoked access to course '${course.title}' for student ${student.email} in institution ${authData.tenant.name}`
    );

    return res.status(200).json({
      success: true,
      message: `Access to '${course.title}' revoked for ${student.name}.`,
      status: "revoked",
    });
  } catch (error) {
    console.error("[RevokeCourseAccess Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/institutions/me/students/invite
 * Teacher creates an expiring student invitation (optionally scoped to one course).
 */
export const inviteStudent = async (req, res) => {
  try {
    const authData = await resolveEducatorTenant(req);
    if (!authData || !authData.tenant) {
      return res.status(403).json({
        success: false,
        message: "You must be an authenticated educator associated with an active institution.",
      });
    }

    const tenantId = authData.tenant._id;
    const { name, email, courseId } = req.body;

    if (!email || !name) {
      return res.status(400).json({ success: false, message: "Name and email are required to invite a student" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const course = courseId ? await Course.findOne({ _id: courseId, tenantId }) : null;
    if (courseId && !course) return res.status(404).json({ success: false, message: "Course not found in your institution" });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const invitation = await Invitation.create({
      tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"),
      tenantId,
      courseId: course?._id || null,
      invitedEmail: cleanEmail,
      invitedBy: req.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "pending",
    });
    const origin = req.headers.origin || req.headers.referer || "http://localhost:5173";
    const inviteUrl = `${origin.replace(/\/$/, "")}/accept-invite?token=${rawToken}`;
    const emailResult = await sendInvitationEmail({
      to: cleanEmail,
      inviteUrl,
      institutionName: authData.tenant.name,
      inviteeName: cleanName,
      courseTitle: course?.title || null,
    });

    console.log(
      `[STUDENT INVITED] Educator ${req.userId} created an invitation for ${cleanEmail} to ${authData.tenant.name}`
    );

    return res.status(201).json({
      success: true,
      message: emailResult.delivered
        ? `Invitation sent to ${cleanEmail}`
        : "Invitation link created, but email delivery is not configured. Copy the link to share it.",
      inviteUrl,
      invitationId: invitation._id,
      expiresAt: invitation.expiresAt,
      emailDelivered: emailResult.delivered,
      student: { name: cleanName, email: cleanEmail, role: "student", enrolledCourse: course?.title || null },
    });
  } catch (error) {
    console.error("[InviteStudent Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

