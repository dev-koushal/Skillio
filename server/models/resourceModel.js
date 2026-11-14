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
      required: function () { return this.storageProvider !== "cloudinary_authenticated"; },
    },
    fileName: {
      type: String,
      default: "",
    },
    accessType: { type: String, enum: ["standard", "free", "paid"], default: "standard", index: true },
    pricePaise: { type: Number, min: 0, default: 0 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    storageProvider: { type: String, enum: ["legacy", "cloudinary_authenticated"], default: "legacy" },
    assetId: { type: String, default: "", select: false },
    assetVersion: { type: Number, default: 0, select: false },
    pageCount: { type: Number, min: 0, default: 0 },
    processingStatus: { type: String, enum: ["ready", "processing", "failed"], default: "ready" },
    processingStartedAt: { type: Date, default: null },
    referenceVideo: {
      provider: { type: String, enum: ["bunny", "youtube", "cloudinary", "lecture", ""], default: "" },
      videoId: { type: String, default: "" },
    },
    isDisabled: { type: Boolean, default: false, index: true },
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

