import User from "../models/userModel.js";
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

    // Fallback for platform_admin logging into any tenant
    if (!user) {
      const platformAdmin = await User.findOne({ _id: req.userId, role: "platform_admin" })
        .select("-password")
        .populate({
          path: "enrolledCourses",
          select: "title thumbnail description subTitle category price creator lectures isPublished",
        });
      if (platformAdmin) {
        user = platformAdmin;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in this organization!",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error in getting currentUser", error: error.message });
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
