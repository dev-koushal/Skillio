import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import uploadCloudinary from "../config/cloudinary.js";

export const getCurrentUser = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Tenant-isolated current user lookup
    let user = await User.findOne({ _id: req.userId, tenantId })
      .select("-password")
      .populate({
        path: "enrolledCourses",
        select: "title thumbnail description subTitle category price creator lectures isPublished",
      });

    // Fallback for students browsing across institutions or platform_admin
    if (!user) {
      const globalUser = await User.findById(req.userId)
        .select("-password")
        .populate({
          path: "enrolledCourses",
          select: "title thumbnail description subTitle category price creator lectures isPublished tenantId",
        });
      if (globalUser) {
        user = globalUser;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    const safeUser = user.toObject ? user.toObject() : { ...user };

    // Tenant Isolation: Enrolled courses must strictly belong to active institution context
    if (tenantId && safeUser.enrolledCourses && Array.isArray(safeUser.enrolledCourses)) {
      safeUser.enrolledCourses = safeUser.enrolledCourses.filter(
        (c) => c && c.tenantId && c.tenantId.toString() === tenantId.toString()
      );
    }

    // Attach student active memberships across institutions
    if (safeUser.role === "student") {
      try {
        const memberships = await InstitutionMembership.find({ userId: safeUser._id, status: "active" })
          .populate("tenantId", "name slug logo institutionType title");
        safeUser.memberships = memberships.map((m) => ({
          institutionId: m.tenantId?._id,
          name: m.tenantId?.name,
          slug: m.tenantId?.slug,
          logo: m.tenantId?.logo,
          title: m.tenantId?.title,
          institutionType: m.tenantId?.institutionType,
          joinedAt: m.joinedAt,
        })).filter((m) => m.slug);
      } catch (e) {}
    }

    // Attach tenant doc if tenantId exists
    if (safeUser.tenantId) {
      try {
        const tenantDoc = await Tenant.findById(safeUser.tenantId).select("name slug logo institutionType title").lean();
        if (tenantDoc) safeUser.tenant = tenantDoc;
      } catch (e) {}
    }

    return res.status(200).json(safeUser);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error in getting currentUser", error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters long" });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("[ChangePassword Error]", error);
    return res.status(500).json({ success: false, message: `Failed to change password: ${error.message || error}` });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const tenantId = req.tenantId;
    const { name, description } = req.body;

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (typeof description !== "undefined") updateData.description = description.trim();

    if (req.file) {
      const profilePicture = await uploadCloudinary(req.file.path);
      if (profilePicture) updateData.profilePicture = profilePicture;
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, tenantId },
      updateData,
      { returnDocument: "after" }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found in this organization" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("[UpdateProfile Error]", error);
    return res.status(500).json({ success: false, message: "Update profile error" });
  }
};
