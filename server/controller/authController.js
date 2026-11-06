import validator from "validator";
import bcrypt from "bcryptjs";
import { genToken } from "../config/token.js";
import User from "../models/userModel.js";
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
    let { name, email, password, role } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Organization context is required" });
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

    const token = await genToken(user._id, tenantId, user.role);

    res.cookie("token", token, getCookieOptions());

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(201).json({
      success: true,
      message: "User created successfully!",
      user: safeUser,
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

    // Look for user in active tenant
    let user = await User.findOne({ email, tenantId }).select("+password");

    // Platform admin fallback: allow platform admin to log in from any domain
    if (!user) {
      const platformAdmin = await User.findOne({ email, role: "platform_admin" }).select("+password");
      if (platformAdmin) {
        user = platformAdmin;
      }
    }

    if (!user) {
      return res.status(400).json({ success: false, message: "User not registered in this organization!" });
    }

    if (role && user.role !== role && user.role !== "platform_admin") {
      return res.status(400).json({ success: false, message: "Role doesn't match registered role!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Wrong password!" });
    }

    const token = await genToken(user._id, user.tenantId, user.role);

    res.cookie("token", token, getCookieOptions());

    const safeUser = user.toObject();
    delete safeUser.password;

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

    if (email) email = email.trim().toLowerCase();

    // Tenant-isolated user lookup
    const user = await User.findOne({ email, tenantId });
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found in this organization!" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.resetOtp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    user.isOtpVerified = false;

    await user.save();
    await sendMail(email, otp);

    return res.status(200).json({ success: true, message: "OTP sent to your email!" });
  } catch (error) {
    console.error("[Send OTP Error]", error);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;
    const tenantId = req.tenantId;

    if (email) email = email.trim().toLowerCase();

    const user = await User.findOne({ email, tenantId });
    if (!user || user.resetOtp !== otp || Date.now() >= user.otpExpires) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    user.isOtpVerified = true;
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: "OTP verified successfully!" });
  } catch (error) {
    return res.status(400).json({ success: false, message: `Error verifying OTP: ${error.message || error}` });
  }
};

export const resetPassword = async (req, res) => {
  try {
    let { email, password } = req.body;
    const tenantId = req.tenantId;

    if (email) email = email.trim().toLowerCase();

    const user = await User.findOne({ email, tenantId }).select("+password");
    if (!user || !user.isOtpVerified) {
      return res.status(400).json({ success: false, message: "OTP must be verified before resetting password!" });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must have at least 8 characters!" });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    user.password = hashPassword;
    user.isOtpVerified = false;
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successful!" });
  } catch (error) {
    return res.status(400).json({ success: false, message: `Error resetting password: ${error.message || error}` });
  }
};
