import crypto from "crypto";
import Invitation from "../models/invitationModel.js";
import Course from "../models/coursesModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import { sendInvitationEmail } from "../config/sendMail.js";
import { can, PERMISSIONS, ROLES } from "../utils/permissions.js";

/**
 * Resolves the authenticated educator's institution server-side.
 */
const resolveEducatorTenant = async (userId, requestedTenantId = null) => {
  if (!userId) return null;
  const educator = await User.findById(userId);
  if (!educator) return null;

  if (![ROLES.EDUCATOR, ROLES.PLATFORM_ADMIN].includes(educator.role)) {
    return null;
  }

  let tenant = educator.role === ROLES.PLATFORM_ADMIN && requestedTenantId
    ? await Tenant.findOne({ _id: requestedTenantId, status: "active" })
    : await Tenant.findOne({ ownerId: userId, status: "active" });
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

/**
 * POST /api/invitations/create
 * Educator generates an expiring, single-use, institution-specific course invitation link.
 */
export const createCourseInvitation = async (req, res) => {
  try {
    const authData = await resolveEducatorTenant(req.userId, req.tenantId);
    if (!authData || !authData.tenant) {
      return res.status(403).json({
        success: false,
        message: "You must be an authenticated educator associated with an active institution.",
      });
    }

    const tenantId = authData.tenant._id;
    const { courseId, invitedEmail, expiresInHours = 168, inviteeName = "Student" } = req.body; // Default 7 days (168h)

    if (!Number.isFinite(Number(expiresInHours)) || Number(expiresInHours) < 1 || Number(expiresInHours) > 168) {
      return res.status(400).json({ success: false, message: "Invitation expiry must be between 1 and 168 hours" });
    }

    // Tenant-isolated course check: verify course belongs to educator's institution
    const course = courseId ? await Course.findOne({ _id: courseId, tenantId }) : null;
    if (courseId && !course) {
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
      courseId: course?._id || null,
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
    let emailResult = null;
    if (cleanEmail) {
      emailResult = await sendInvitationEmail({
        to: cleanEmail,
        inviteUrl,
        institutionName: authData.tenant.name,
        inviteeName,
        courseTitle: course?.title || null,
      });
    }

    return res.status(201).json({
      success: true,
      message: emailResult?.delivered ? "Invitation email sent successfully" : "Invitation link created successfully",
      invitationId: invitation._id,
      inviteUrl,
      expiresAt,
      emailDelivered: emailResult?.delivered ?? false,
      course: course ? {
        id: course._id,
        title: course.title,
      } : null,
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

    let invitation = await Invitation.findOne({
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("courseId", "title subTitle thumbnail description category level price")
      .populate("tenantId", "name slug logo institutionType status");

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "This invitation link is invalid, expired, or has already been accepted.",
      });
    }

    if (!invitation.tenantId || invitation.tenantId.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This invitation is no longer available.",
      });
    }

    if (invitation.courseId) {
      const course = await Course.findOne({ _id: invitation.courseId._id || invitation.courseId, tenantId: invitation.tenantId._id });
      if (!course) {
        invitation.status = "revoked";
        await invitation.save();
        return res.status(400).json({ success: false, message: "This course invitation is no longer available." });
      }
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
  let claimContext = null;
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
    if (user.role !== "student") {
      return res.status(403).json({ success: false, message: "Only student accounts can accept course invitations." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    let invitation = await Invitation.findOne({
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("tenantId", "name slug status");

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: "Invitation is invalid, expired, or has already been accepted.",
      });
    }

    if (!invitation.tenantId || invitation.tenantId.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This invitation is no longer available.",
      });
    }

    const invitedEmail = invitation.invitedEmail?.trim().toLowerCase();
    if (invitedEmail && invitedEmail !== "direct-link" && invitedEmail !== user.email?.trim().toLowerCase()) {
      return res.status(403).json({ success: false, message: "This invitation was sent to a different email address." });
    }

    const existingMembership = await InstitutionMembership.findOne({
      userId,
      tenantId: invitation.tenantId._id,
    });
    if (existingMembership && existingMembership.status !== "active") {
      return res.status(403).json({ success: false, message: "Your institution membership is not active." });
    }

    const tenantId = invitation.tenantId._id;
    const courseId = invitation.courseId?._id || invitation.courseId || null;
    if (courseId) {
      const course = await Course.findOne({ _id: courseId, tenantId });
      if (!course) {
        invitation.status = "revoked";
        await invitation.save();
        return res.status(400).json({ success: false, message: "This course invitation is no longer available." });
      }
    }

    // Claim the single-use token atomically so concurrent accept requests cannot
    // activate the same invitation for multiple accounts.
    const claimedInvitation = await Invitation.findOneAndUpdate(
      { _id: invitation._id, status: "pending", expiresAt: { $gt: new Date() } },
      { $set: { status: "accepted", acceptedAt: new Date(), acceptedBy: userId } },
      { new: true }
    );
    if (!claimedInvitation) {
      return res.status(409).json({ success: false, message: "This invitation has already been accepted or has expired." });
    }
    claimContext = { invitationId: invitation._id, userId };

    // A course invitation grants exactly that course. Institution-only invites
    // create membership without granting catalog-wide access.
    if (courseId) {
      await CourseAccess.findOneAndUpdate(
        { userId, courseId, tenantId },
        { userId, courseId, tenantId, source: "INSTITUTION_GRANTED", status: "active", grantedBy: invitation.invitedBy, grantedAt: new Date(), revokedAt: null },
        { upsert: true, new: true }
      );
      const enrolledCourses = user.enrolledCourses || (user.enrolledCourses = []);
      if (!enrolledCourses.some((id) => id.toString() === courseId.toString())) {
        enrolledCourses.push(courseId);
        await user.save();
      }
      await Course.updateOne({ _id: courseId, tenantId }, { $addToSet: { enrolledStudents: userId } });
    }

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
    console.log(
      `[INVITATION ACCEPTED] Student ${user.email} accepted ${courseId ? `course ${courseId}` : "institution-only invite"} in institution ${invitation.tenantId.slug}`
    );

    return res.status(200).json({
      success: true,
      message: courseId ? `Course access granted! Welcome to ${invitation.tenantId.name}` : `Welcome to ${invitation.tenantId.name}`,
      courseId,
      institutionSlug: invitation.tenantId.slug,
    });
  } catch (error) {
    if (claimContext) {
      try {
        await Invitation.updateOne(
          { _id: claimContext.invitationId, status: "accepted", acceptedBy: claimContext.userId },
          { $set: { status: "pending" }, $unset: { acceptedAt: "", acceptedBy: "" } }
        );
      } catch (rollbackError) {
        console.error("[Invitation Claim Rollback Error]", rollbackError);
      }
    }
    console.error("[AcceptInvitation Error]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

