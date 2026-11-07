import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
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
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    topic: {
      type: String,
      default: "General",
      trim: true,
    },
    type: {
      type: String,
      enum: ["pdf", "notes", "formula_sheet", "code", "file", "link"],
      default: "pdf",
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: String,
      default: "",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for optimal tenant-isolated queries
resourceSchema.index({ tenantId: 1, courseId: 1 });
resourceSchema.index({ tenantId: 1, lectureId: 1 });
resourceSchema.index({ courseId: 1, createdAt: -1 });

const Resource = mongoose.model("Resource", resourceSchema);
export default Resource;

