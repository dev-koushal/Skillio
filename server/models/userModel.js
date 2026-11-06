import mongoose, { Schema } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ["student", "educator", "tenant_admin", "platform_admin"],
      default: "student",
      required: true,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Courses",
      },
    ],
    resetOtp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index: email must be unique WITHIN a tenant
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
// Compound index for role-based querying within tenant
userSchema.index({ tenantId: 1, role: 1 });

const User = mongoose.model("User", userSchema);
export default User;
