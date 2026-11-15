import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
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
      required: true,
      trim: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    thumbnail: {
      type: String,
      default: "",
    },
    thumbnailType: {
      type: String,
      enum: ["custom", "generated"],
      default: "generated",
    },
    fileUrl: {
      type: String,
      default: "",
    },
    assetId: {
      type: String,
      default: "",
      select: false,
    },
    assetVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    pendingAssetId: {
      type: String,
      default: "",
      select: false,
    },
    pendingAssetVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    pendingPageCount: {
      type: Number,
      default: 0,
      select: false,
    },
    pendingFileName: {
      type: String,
      default: "",
      select: false,
    },
    pendingFileSize: {
      type: String,
      default: "",
      select: false,
    },
    replacementProcessing: {
      type: Boolean,
      default: false,
    },
    storageProvider: {
      type: String,
      enum: ["legacy", "cloudinary_authenticated"],
      default: "cloudinary_authenticated",
    },
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: String,
      default: "",
    },
    pageCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    processingStatus: {
      type: String,
      enum: ["draft", "processing", "ready", "failed"],
      default: "ready",
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "disabled"],
      default: "draft",
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    accessType: {
      type: String,
      enum: ["free", "paid"],
      default: "paid",
      index: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    pricePaise: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },
    referenceVideo: {
      provider: {
        type: String,
        enum: ["bunny", "youtube", "cloudinary", ""],
        default: "",
      },
      videoId: {
        type: String,
        default: "",
      },
      url: {
        type: String,
        default: "",
      },
    },
    relatedCourseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Courses",
      default: null,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purchaseCount: {
      type: Number,
      default: 0,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

noteSchema.index({ tenantId: 1, isPublished: 1, status: 1 });
noteSchema.index({ tenantId: 1, topic: 1 });

const Note = mongoose.models.Note || mongoose.model("Note", noteSchema);
export default Note;
