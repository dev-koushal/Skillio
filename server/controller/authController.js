import validator from "validator";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { genToken } from "../config/token.js";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import sendMail from "../config/sendMail.js";

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined; // e.g., ".mylms.com" in production

  return {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: cookieDomain,
  };
};

export const signUp = async (req, res) => {
  try {
    let { name, email, password, role, institutionSlug, institutionId } = req.body;
    let tenantId = req.tenantId;

    // Allow student to specify selected institution during registration
    if (institutionSlug && institutionSlug !== "default" && institutionSlug !== "platform") {
      const selectedTenant = await Tenant.findOne({ slug: institutionSlug, status: "active" });
      if (selectedTenant) {
        tenantId = selectedTenant._id;
      }
    } else if (institutionId) {
      const selectedTenant = await Tenant.findOne({ _id: institutionId, status: "active" });
      if (selectedTenant) {
        tenantId = selectedTenant._id;
      }
    }

    if (!tenantId) {
      const defaultTenant = await Tenant.findOne({ slug: "default" });
      if (defaultTenant) {
        tenantId = defaultTenant._id;
      } else {
        return res.status(400).json({ success: false, message: "Organization context is required" });
      }
    }

    if (email) email = email.trim().toLowerCase();

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }

    // Security check: Prevent privilege escalation via client-supplied role
    const allowedPublicRoles = ["student", "educator"];
    if (!allowedPublicRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified for registration",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Email should be valid!" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must have at least 8 characters!" });
    }

    // Multi-tenant check: Email uniqueness is scoped to THIS tenant
    const existingUser = await User.findOne({ email, tenantId });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account with this email already exists in this organization!" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      tenantId,
      name: name.trim(),
      email,
      password: hashPassword,
      role,
    });

    if (role === "student" && tenantId) {
      try {
        await InstitutionMembership.create({
          userId: user._id,
          tenantId,
          role: "student",
          status: "active",
          joinedAt: new Date(),
        });
      } catch (e) {}
    }

    const token = await genToken(user._id, tenantId, user.role);

    res.cookie("token", token, getCookieOptions());

    const safeUser = user.toObject();
    delete safeUser.password;

    const tenantDoc = await Tenant.findById(tenantId)
      .select("name slug logo institutionType title")
      .lean();
    if (tenantDoc) {
      safeUser.tenant = tenantDoc;
    }

    return res.status(201).json({
      success: true,
      message: "User created successfully!",
      user: safeUser,
      tenant: tenantDoc,
    });
  } catch (error) {
    console.error("[SignUp Error]", error);
    return res.status(400).json({ success: false, message: `SignUp error: ${error.message || error}` });
  }
};

export const login = async (req, res) => {
  try {
    let { email, password, role } = req.body;
    const tenantId = req.tenantId;

    if (email) email = email.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required!" });
    }

    // 1. Look for user in active tenant
    let user = await User.findOne({ email, tenantId })
      .select("+password")
      .populate({
        path: "enrolledCourses",
        select: "title thumbnail description subTitle category price creator lectures isPublished tenantId",
      });

    // 2. Fallback: Search globally for educators/admins or students
    if (!user) {
      const globalUser = await User.findOne({ email })
        .select("+password")
        .populate({
          path: "enrolledCourses",
          select: "title thumbnail description subTitle category price creator lectures isPublished tenantId",
        });

      if (globalUser) {
        user = globalUser;

        // For educators, resolve their single institution
        if (user.role === "educator" || user.role === "tenant_admin") {
          const ownedTenant = await Tenant.findOne({ ownerId: user._id, status: "active" });
          if (ownedTenant) {
            user.tenantId = ownedTenant._id;
          }
        }
      }
    }

    if (!user) {
      return res.status(400).json({ success: false, message: "No account found with this email!" });
    }

    // Validate target role allowing compatible administrator / educator roles
    if (role && user.role !== "platform_admin") {
      const isEducatorTarget = role === "educator" || role === "tenant_admin";
      const isUserEducator = user.role === "educator" || user.role === "tenant_admin";
      const isStudentTarget = role === "student";
      const isUserStudent = user.role === "student";

      if (isEducatorTarget && !isUserEducator) {
        return res.status(400).json({ success: false, message: `This account is registered as ${user.role}, not an educator!` });
      }
      if (isStudentTarget && !isUserStudent) {
        return res.status(400).json({ success: false, message: `This account is registered as ${user.role}, not a student!` });
      }
      if (!isEducatorTarget && !isStudentTarget && user.role !== role) {
        return res.status(400).json({ success: false, message: `This account is registered as ${user.role}, not ${role}!` });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Wrong password!" });
    }

    const token = await genToken(user._id, user.tenantId, user.role);

    res.cookie("token", token, getCookieOptions());

    const safeUser = user.toObject();
    delete safeUser.password;

    // Filter enrolled courses to active tenant context
    if (tenantId && safeUser.enrolledCourses && Array.isArray(safeUser.enrolledCourses)) {
      safeUser.enrolledCourses = safeUser.enrolledCourses.filter(
        (c) => c && c.tenantId && c.tenantId.toString() === tenantId.toString()
      );
    }

    // Resolve tenant details
    try {
      const tenantDoc = await Tenant.findById(user.tenantId).select("name slug logo institutionType");
      if (tenantDoc) {
        safeUser.tenant = {
          id: tenantDoc._id,
          name: tenantDoc.name,
          slug: tenantDoc.slug,
          logo: tenantDoc.logo,
          institutionType: tenantDoc.institutionType,
        };
      }
    } catch (e) {}

    // For students, fetch their memberships across institutions
    if (user.role === "student") {
      try {
        const memberships = await InstitutionMembership.find({ userId: user._id, status: "active" })
          .populate("tenantId", "name slug logo institutionType");
        safeUser.memberships = memberships.map((m) => ({
          institutionId: m.tenantId?._id,
          name: m.tenantId?.name,
          slug: m.tenantId?.slug,
          logo: m.tenantId?.logo,
          institutionType: m.tenantId?.institutionType,
          joinedAt: m.joinedAt,
        })).filter((m) => m.slug);
      } catch (e) {}
    }

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      user: safeUser,
    });
  } catch (error) {
    console.error("[Login Error]", error);
    return res.status(400).json({ success: false, message: `Login error: ${error.message || error}` });
  }
};

export const logout = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: cookieDomain,
    });
    return res.status(200).json({ success: true, message: "Logged out successfully!" });
  } catch (error) {
    return res.status(400).json({ success: false, message: `Logout error: ${error.message || error}` });
  }
};

export const sendOtp = async (req, res) => {
  try {
    let { email } = req.body;
    const tenantId = req.tenantId;

    if (!email) {
      return res.status(400).json({ success: false, message: "Please enter your registered email address" });
    }

    email = email.trim().toLowerCase();

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }

    // Tenant-isolated lookup with global fallback
    let user = null;
    if (tenantId) {
      user = await User.findOne({ email, tenantId });
    }
    if (!user) {
      user = await User.findOne({ email });
    }

    if (!user) {
      // User enumeration prevention: Return success message so attackers cannot scrape valid emails
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a verification code has been sent.",
      });
    }

    // Rate limiting: 60-second cooldown between requests
    if (user.otpExpires) {
      const msRemaining = new Date(user.otpExpires).getTime() - Date.now();
      // If code was issued less than 60s ago (10m = 600000ms; > 540000ms means within first 60s)
      if (msRemaining > 9 * 60 * 1000) {
        const waitSeconds = Math.ceil((msRemaining - 9 * 60 * 1000) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting another verification code.`,
        });
      }
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Store SHA-256 hash in DB so plain-text OTP is never exposed
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    user.resetOtp = hashedOtp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.isOtpVerified = false;
    user.otpAttempts = 0;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Resolve tenant name for branded email
    let institutionName = "Skillio Academy";
    if (user.tenantId) {
      const tenantDoc = await Tenant.findById(user.tenantId).select("name");
      if (tenantDoc?.name) institutionName = tenantDoc.name;
    }

    // Dispatch email
    const mailResult = await sendMail(email, otp, institutionName);
    if (!mailResult.success) {
      console.warn(`[Send OTP Warning] Mail delivery issue for ${email}: ${mailResult.error}`);
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email!",
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("[Send OTP Error]", error);
    return res.status(500).json({ success: false, message: "Failed to send verification code. Please try again." });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;
    const tenantId = req.tenantId;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and verification code are required" });
    }

    email = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    // Look up user
    let user = null;
    if (tenantId) {
      user = await User.findOne({ email, tenantId });
    }
    if (!user) {
      user = await User.findOne({ email });
    }

    if (!user || !user.resetOtp || !user.otpExpires) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    // Check expiration
    if (Date.now() >= new Date(user.otpExpires).getTime()) {
      user.resetOtp = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;
      await user.save();
      return res.status(400).json({ success: false, message: "Verification code has expired. Please request a new one." });
    }

    // Check failed attempts (max 5)
    if ((user.otpAttempts || 0) >= 5) {
      user.resetOtp = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;
      await user.save();
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. This code has been invalidated. Please request a new one.",
      });
    }

    // Compare hashed OTP with timing-safe comparison
    const suppliedHash = crypto.createHash("sha256").update(cleanOtp).digest("hex");
    const storedHash = user.resetOtp.length === 64
      ? user.resetOtp
      : crypto.createHash("sha256").update(user.resetOtp).digest("hex");

    const isMatch = crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(storedHash));

    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      const remainingAttempts = 5 - user.otpAttempts;
      return res.status(400).json({
        success: false,
        message: remainingAttempts > 0
          ? `Incorrect code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`
          : "Incorrect code. Maximum attempts exceeded.",
      });
    }

    // Success: Generate a cryptographically secure, single-use reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.isOtpVerified = true;
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes to complete password change

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Verification code confirmed successfully!",
      resetToken,
    });
  } catch (error) {
    console.error("[Verify OTP Error]", error);
    return res.status(500).json({ success: false, message: `Error verifying code: ${error.message || error}` });
  }
};

export const resetPassword = async (req, res) => {
  try {
    let { email, password, newPassword, resetToken } = req.body;
    const tenantId = req.tenantId;

    const finalPassword = newPassword || password;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    if (!finalPassword) {
      return res.status(400).json({ success: false, message: "New password is required" });
    }

    if (finalPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    email = email.trim().toLowerCase();

    // Look up user
    let user = null;
    if (tenantId) {
      user = await User.findOne({ email, tenantId }).select("+password");
    }
    if (!user) {
      user = await User.findOne({ email }).select("+password");
    }

    if (!user) {
      return res.status(400).json({ success: false, message: "User account not found" });
    }

    // Validate authorization (via resetToken or verified flag)
    let isAuthorized = false;

    if (resetToken && user.resetPasswordToken && user.resetPasswordExpires) {
      if (Date.now() < new Date(user.resetPasswordExpires).getTime()) {
        const hashedSuppliedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        if (hashedSuppliedToken === user.resetPasswordToken) {
          isAuthorized = true;
        }
      }
    } else if (user.isOtpVerified) {
      // Backwards-compatible fallback
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(400).json({
        success: false,
        message: "Password reset session has expired or is invalid. Please request a new verification code.",
      });
    }

    // Hash new password securely with bcrypt
    const hashedPassword = await bcrypt.hash(finalPassword, 10);
    user.password = hashedPassword;

    // Invalidate all tokens and reset states
    user.isOtpVerified = false;
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.otpAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("[Reset Password Error]", error);
    return res.status(500).json({ success: false, message: `Failed to reset password: ${error.message || error}` });
  }
};
