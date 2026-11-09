import crypto from "crypto";
import Invitation from "../models/invitationModel.js";
import Course from "../models/coursesModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import sendMail from "../config/sendMail.js";

/**
 * Resolves the authenticated educator's institution server-side.
 */
const resolveEducatorTenant = async (userId) => {
  if (!userId) return null;
  const educator = await User.findById(userId);
  if (!educator) return null;

  if (
    educator.role !== "educator" &&
    educator.role !== "tenant_admin" &&
    educator.role !== "platform_admin"
  ) {
    return null;
  }

  let tenant = await Tenant.findOne({ ownerId: userId, status: "active" });
  if (!tenant && educator.tenantId) {
    tenant = await Tenant.findOne({ _id: educator.tenantId, status: "active" });
  }

  return { educator, tenant };
};

/**
 * POST /api/invitations/create
 * Educator generates an expiring, single-use, institution-specific course invitation link.
 */
export const createCourseInvitation = async (req, res) => {
  try {
    const authData = await resolveEducatorTenant(req.userId);
    if (!authData || !authData.tenant) {
      return res.status(403).json({
        success: false,
        message: "You must be an authenticated educator associated with an active institution.",
      });
    }

    const tenantId = authData.tenant._id;
    const { courseId, invitedEmail, expiresInHours = 168 } = req.body; // Default 7 days (168h)

    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course ID is required" });
    }

    // Tenant-isolated course check: verify course belongs to educator's institution
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found in your institution",
      });
    }

    const cleanEmail = invitedEmail ? invitedEmail.trim().toLowerCase() : "";

    // Generate high-entropy 32-byte cryptographic random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invitation = await Invitation.create({
      tokenHash,
      tenantId,
      courseId,
      invitedEmail: cleanEmail || "direct-link",
      invitedBy: req.userId,
      expiresAt,
      status: "pending",
    });

    // Determine host origin for invite link
    const origin = req.headers.origin || req.headers.referer || "http://localhost:5173";
    const cleanOrigin = origin.replace(/\/$/, "");
    const inviteUrl = `${cleanOrigin}/accept-invite?token=${rawToken}`;

    // Optional email dispatch if invitedEmail was specified
    if (cleanEmail && cleanEmail !== "direct-link") {
      try {
        await sendMail(
          cleanEmail,
          `Course Invitation: ${course.title} - ${inviteUrl}`,
          authData.tenant.name
        );
      } catch (mailErr) {
        console.warn(`[Invitation Email Notice] ${mailErr.message}`);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Invitation link generated successfully",
      invitationId: invitation._id,
      inviteUrl,
      rawToken,
      expiresAt,
      course: {
        id: course._id,
        title: course.title,
      },
      institution: {
        id: authData.tenant._id,
        name: authData.tenant.name,
      },
    });
  } catch (error) {
    console.error("[CreateCourseInvitation Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/invitations/verify/:token
 * Public endpoint to inspect invitation validity before accepting.
 */
export const verifyInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: "Invitation token is required" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invitation = await Invitation.findOne({
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("courseId", "title subTitle thumbnail description category level price")
      .populate("tenantId", "name slug logo institutionType");

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "This invitation link is invalid, expired, or has already been accepted.",
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      course: invitation.courseId,
      institution: invitation.tenantId,
      invitedEmail: invitation.invitedEmail === "direct-link" ? null : invitation.invitedEmail,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("[VerifyInvitation Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/invitations/accept
 * Authenticated student accepts the invitation and activates course access.
 */
export const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.userId;

    if (!token) {
      return res.status(400).json({ success: false, message: "Invitation token is required" });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required to accept invitation" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invitation = await Invitation.findOne({
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("tenantId", "name slug");

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: "Invitation is invalid, expired, or has already been accepted.",
      });
    }

    const tenantId = invitation.tenantId._id;
    const courseId = invitation.courseId;

    // 1. Grant / activate course access with INSTITUTION_GRANTED source
    await CourseAccess.findOneAndUpdate(
      { userId, courseId, tenantId },
      {
        userId,
        courseId,
        tenantId,
        source: "INSTITUTION_GRANTED",
        status: "active",
        grantedBy: invitation.invitedBy,
        grantedAt: new Date(),
        revokedAt: null,
      },
      { upsert: true, new: true }
    );

    // 2. Add course to student enrolledCourses
    if (!user.enrolledCourses.map((id) => id.toString()).includes(courseId.toString())) {
      user.enrolledCourses.push(courseId);
      await user.save();
    }

    // 3. Add student to course enrolledStudents
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { enrolledStudents: userId },
    });

    // 4. Register active institution membership
    await InstitutionMembership.findOneAndUpdate(
      { userId, tenantId },
      {
        userId,
        tenantId,
        role: "student",
        status: "active",
        lastActiveAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // 5. Mark invitation as accepted
    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = userId;
    await invitation.save();

    console.log(
      `[INVITATION ACCEPTED] Student ${user.email} accepted course ${courseId} in institution ${invitation.tenantId.slug}`
    );

    return res.status(200).json({
      success: true,
      message: `Course access granted! Welcome to ${invitation.tenantId.name}`,
      courseId,
      institutionSlug: invitation.tenantId.slug,
    });
  } catch (error) {
    console.error("[AcceptInvitation Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

