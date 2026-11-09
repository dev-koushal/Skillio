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
      required: function () {
        return !this.phoneNumber;
      },
      lowercase: true,
      trim: true,
      sparse: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      sparse: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneOtp: {
      type: String,
      select: false,
    },
    phoneOtpExpires: {
      type: Date,
    },
    phoneOtpAttempts: {
      type: Number,
      default: 0,
    },
    phoneOtpLastSent: {
      type: Date,
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
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index: email must be unique WITHIN a tenant when provided
userSchema.index({ email: 1, tenantId: 1 }, { unique: true, sparse: true });
// Unique constraint on verified/stored phone number across the system
userSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
// Compound index for role-based querying within tenant
userSchema.index({ tenantId: 1, role: 1 });

const User = mongoose.model("User", userSchema);
export default User;
