import validator from "validator";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { genToken } from "../config/token.js";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import sendMail from "../config/sendMail.js";
import { sendOtp as sendSmsOtp } from "../services/sms/smsService.js";
import { normalizePhoneNumber, isValidE164 } from "../utils/phoneUtils.js";

// In-memory rate limiter for SMS OTP requests
const phoneOtpRateLimits = new Map();

const checkRateLimit = (key, maxRequests = 5, windowMs = 60 * 60 * 1000) => {
  const now = Date.now();
  const records = phoneOtpRateLimits.get(key) || [];
  const validRecords = records.filter((timestamp) => now - timestamp < windowMs);

  if (validRecords.length >= maxRequests) {
    return false;
  }

  validRecords.push(now);
  phoneOtpRateLimits.set(key, validRecords);
  return true;
};

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

/**
 * Send SMS OTP for Phone Authentication (Login or Signup).
 */
export const sendPhoneOtp = async (req, res) => {
  try {
    const { phoneNumber, role } = req.body;
    let tenantId = req.tenantId;
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    // 1. Normalize phone to E.164
    let normalizedPhone;
    try {
      normalizedPhone = normalizePhoneNumber(phoneNumber);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || "Invalid phone number format" });
    }

    if (!isValidE164(normalizedPhone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid mobile number with country code" });
    }

    // 2. IP Rate Limiting (max 15 requests/hr per IP)
    if (!checkRateLimit(`ip_${clientIp}`, 15, 60 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests from your network. Please try again later.",
      });
    }

    // 3. Phone Number Rate Limiting (max 5 requests/hr per phone)
    if (!checkRateLimit(`phone_${normalizedPhone}`, 5, 60 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests for this number. Please wait an hour before trying again.",
      });
    }

    // 4. Find or prepare User record
    let user = await User.findOne({ phoneNumber: normalizedPhone });

    // Enforce 45s resend cooldown if code was recently generated
    if (user && user.phoneOtpLastSent) {
      const elapsed = Date.now() - new Date(user.phoneOtpLastSent).getTime();
      if (elapsed < 45000) {
        const remaining = Math.ceil((45000 - elapsed) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remaining} seconds before requesting another code.`,
          cooldown: remaining,
        });
      }
    }

    // 5. Generate cryptographically secure 6-digit random OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if (!tenantId) {
      const defaultTenant = await Tenant.findOne({ slug: "default" });
      if (defaultTenant) tenantId = defaultTenant._id;
    }

    if (user) {
      user.phoneOtp = hashedOtp;
      user.phoneOtpExpires = expiresAt;
      user.phoneOtpAttempts = 0;
      user.phoneOtpLastSent = new Date();
      await user.save();
    } else {
      // Create provisional record for phone registration
      user = await User.create({
        name: "Learner",
        phoneNumber: normalizedPhone,
        phoneVerified: false,
        role: role === "educator" ? "educator" : "student",
        tenantId,
        phoneOtp: hashedOtp,
        phoneOtpExpires: expiresAt,
        phoneOtpAttempts: 0,
        phoneOtpLastSent: new Date(),
      });
    }

    // Resolve institution name for branded SMS message
    let institutionName = "Skillio Academy";
    if (user.tenantId) {
      const tenantDoc = await Tenant.findById(user.tenantId).select("name");
      if (tenantDoc?.name) institutionName = tenantDoc.name;
    }

    // 6. Dispatch SMS
    const smsResult = await sendSmsOtp(normalizedPhone, otp, institutionName);
    if (!smsResult.success) {
      console.warn(`[SMS Warning] Could not deliver to ${normalizedPhone}: ${smsResult.error}`);
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your mobile number!",
      cooldown: 45,
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("[Send Phone OTP Error]", error);
    return res.status(500).json({ success: false, message: `Failed to send SMS OTP: ${error.message || error}` });
  }
};

/**
 * Verify SMS OTP and authenticate (Login or Complete Signup).
 */
export const verifyPhoneOtp = async (req, res) => {
  try {
    const { phoneNumber, otp, name, role, institutionSlug } = req.body;
    let tenantId = req.tenantId;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: "Phone number and verification code are required" });
    }

    let normalizedPhone;
    try {
      normalizedPhone = normalizePhoneNumber(phoneNumber);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid phone number format" });
    }

    const cleanOtp = otp.toString().trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ success: false, message: "Verification code must be exactly 6 digits" });
    }

    // Look up user with +phoneOtp select
    const user = await User.findOne({ phoneNumber: normalizedPhone })
      .select("+phoneOtp")
      .populate({
        path: "enrolledCourses",
        select: "title thumbnail description subTitle category price creator lectures isPublished tenantId",
      });

    if (!user || !user.phoneOtp || !user.phoneOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "No active verification code found for this phone number. Please request a code first.",
      });
    }

    // Check expiry
    if (Date.now() > new Date(user.phoneOtpExpires).getTime()) {
      user.phoneOtp = undefined;
      user.phoneOtpExpires = undefined;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
      });
    }

    // Check brute-force attempts lockout (max 5)
    if ((user.phoneOtpAttempts || 0) >= 5) {
      user.phoneOtp = undefined;
      user.phoneOtpExpires = undefined;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Too many failed attempts. This code has been invalidated. Please request a new one.",
      });
    }

    // Compare hashed OTP using timing-safe buffer comparison
    const suppliedHash = crypto.createHash("sha256").update(cleanOtp).digest("hex");
    const storedHash = user.phoneOtp;

    let isMatch = false;
    try {
      isMatch = crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(storedHash));
    } catch (e) {
      isMatch = false;
    }

    if (!isMatch) {
      user.phoneOtpAttempts = (user.phoneOtpAttempts || 0) + 1;
      await user.save();
      const remaining = 5 - user.phoneOtpAttempts;
      return res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Incorrect verification code. Maximum attempts exceeded.",
      });
    }

    // Success: Mark phone verified and clear OTP
    user.phoneVerified = true;
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;
    user.phoneOtpAttempts = 0;

    // If new user name provided, update name
    if (name && name.trim()) {
      user.name = name.trim();
    }

    // If role provided on new signup, update role
    if (role && (role === "educator" || role === "student") && !user.phoneVerified) {
      user.role = role;
    }

    // Allow student to bind to an institution during phone registration
    if (institutionSlug && institutionSlug !== "default" && institutionSlug !== "platform") {
      const selectedTenant = await Tenant.findOne({ slug: institutionSlug, status: "active" });
      if (selectedTenant) {
        user.tenantId = selectedTenant._id;
      }
    }

    // For students, ensure institution membership is recorded
    if (user.role === "student" && user.tenantId) {
      try {
        const existingMembership = await InstitutionMembership.findOne({
          userId: user._id,
          tenantId: user.tenantId,
        });
        if (!existingMembership) {
          await InstitutionMembership.create({
            userId: user._id,
            tenantId: user.tenantId,
            role: "student",
            status: "active",
            joinedAt: new Date(),
          });
        }
      } catch (e) {}
    }

    await user.save();

    // Issue standard JWT authentication session
    const token = await genToken(user._id, user.tenantId, user.role);
    res.cookie("token", token, getCookieOptions());

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.phoneOtp;

    // Attach student memberships across institutions
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

    // Resolve tenant doc
    let tenantDoc = null;
    try {
      tenantDoc = await Tenant.findById(user.tenantId).select("name slug logo institutionType title").lean();
      if (tenantDoc) safeUser.tenant = tenantDoc;
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: "Phone verified and signed in successfully!",
      user: safeUser,
      tenant: tenantDoc,
    });
  } catch (error) {
    console.error("[Verify Phone OTP Error]", error);
    return res.status(500).json({ success: false, message: `Verification failed: ${error.message || error}` });
  }
};

/**
 * Send OTP to link a new phone number to an existing authenticated user.
 */
export const sendLinkPhoneOtp = async (req, res) => {
  try {
    const userId = req.userId;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    let normalizedPhone;
    try {
      normalizedPhone = normalizePhoneNumber(phoneNumber);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || "Invalid phone number format" });
    }

    // Safe Account-Linking Rule: Ensure phone is not already verified on another account
    const existingOther = await User.findOne({
      phoneNumber: normalizedPhone,
      phoneVerified: true,
      _id: { $ne: userId },
    });

    if (existingOther) {
      return res.status(400).json({
        success: false,
        message: "This phone number is already verified on another account.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Cooldown check
    if (user.phoneOtpLastSent) {
      const elapsed = Date.now() - new Date(user.phoneOtpLastSent).getTime();
      if (elapsed < 45000) {
        const remaining = Math.ceil((45000 - elapsed) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remaining} seconds before requesting another code.`,
          cooldown: remaining,
        });
      }
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    user.phoneOtp = hashedOtp;
    user.phoneOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.phoneOtpAttempts = 0;
    user.phoneOtpLastSent = new Date();
    await user.save();

    await sendSmsOtp(normalizedPhone, otp, "Skillio Security");

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your phone number!",
      cooldown: 45,
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("[Send Link Phone OTP Error]", error);
    return res.status(500).json({ success: false, message: `Failed to send code: ${error.message || error}` });
  }
};

/**
 * Verify OTP and link verified phone number to authenticated account.
 */
export const verifyLinkPhoneOtp = async (req, res) => {
  try {
    const userId = req.userId;
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: "Phone number and verification code are required" });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const cleanOtp = otp.toString().trim();

    // Check conflict again
    const existingOther = await User.findOne({
      phoneNumber: normalizedPhone,
      phoneVerified: true,
      _id: { $ne: userId },
    });

    if (existingOther) {
      return res.status(400).json({
        success: false,
        message: "This phone number is already verified on another account.",
      });
    }

    const user = await User.findById(userId).select("+phoneOtp");
    if (!user || !user.phoneOtp || !user.phoneOtpExpires) {
      return res.status(400).json({ success: false, message: "No active verification code found." });
    }

    if (Date.now() > new Date(user.phoneOtpExpires).getTime()) {
      user.phoneOtp = undefined;
      user.phoneOtpExpires = undefined;
      await user.save();
      return res.status(400).json({ success: false, message: "Verification code has expired." });
    }

    const suppliedHash = crypto.createHash("sha256").update(cleanOtp).digest("hex");
    let isMatch = false;
    try {
      isMatch = crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(user.phoneOtp));
    } catch (e) {
      isMatch = false;
    }

    if (!isMatch) {
      user.phoneOtpAttempts = (user.phoneOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ success: false, message: "Incorrect verification code." });
    }

    // Success: Link phone number
    user.phoneNumber = normalizedPhone;
    user.phoneVerified = true;
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;
    user.phoneOtpAttempts = 0;
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.phoneOtp;

    return res.status(200).json({
      success: true,
      message: "Phone number linked and verified successfully!",
      user: safeUser,
    });
  } catch (error) {
    console.error("[Verify Link Phone Error]", error);
    return res.status(500).json({ success: false, message: `Linking failed: ${error.message || error}` });
  }
};

/**
 * Link an Email & Password to an account that signed up via Phone.
 */
export const linkEmail = async (req, res) => {
  try {
    const userId = req.userId;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is already taken within this tenant
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existingEmailUser = await User.findOne({
      email: normalizedEmail,
      tenantId: user.tenantId,
      _id: { $ne: userId },
    });

    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists in this institution.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.email = normalizedEmail;
    user.password = hashedPassword;
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(200).json({
      success: true,
      message: "Email and password linked successfully! You can now sign in with either phone or email.",
      user: safeUser,
    });
  } catch (error) {
    console.error("[Link Email Error]", error);
    return res.status(500).json({ success: false, message: `Failed to link email: ${error.message || error}` });
  }
};
