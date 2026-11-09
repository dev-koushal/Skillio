import mongoose from "mongoose";

const courseAccessSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Courses",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["PURCHASED", "INSTITUTION_GRANTED", "FREE", "ADMIN_GRANTED"],
      default: "PURCHASED",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "revoked", "expired"],
      default: "active",
      index: true,
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    revocationReason: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: unique course access record per user and course in a tenant
courseAccessSchema.index({ userId: 1, courseId: 1, tenantId: 1 }, { unique: true });
courseAccessSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
courseAccessSchema.index({ courseId: 1, status: 1 });

const CourseAccess = mongoose.model("CourseAccess", courseAccessSchema);

export default CourseAccess;

