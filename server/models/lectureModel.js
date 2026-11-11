import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Courses",
      index: true,
    },
    lectureTitle: {
      type: String,
      required: true,
      trim: true,
    },
    videoUrl: {
      type: String,
      default: "",
    },
    isPreviewFree: {
      type: Boolean,
      default: false,
    },
    videoProvider: {
      type: String,
      enum: ["bunny", "cloudinary", "youtube"],
      default: "cloudinary",
    },
    youtubeVideoId: {
      type: String,
      default: "",
      trim: true,
    },
    youtubeUrl: {
      type: String,
      default: "",
      trim: true,
    },
    bunnyVideoId: {
      type: String,
      default: "",
    },
    bunnyLibraryId: {
      type: String,
      default: "",
    },
    bunnyDirectUrl: {
      type: String,
      default: "",
    },
    processingStatus: {
      type: String,
      enum: ["uploading", "processing", "ready", "failed"],
      default: "ready",
    },
    duration: {
      type: Number,
      default: 0,
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    publicId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

lectureSchema.index({ tenantId: 1, courseId: 1 });

const Lecture = mongoose.model("Lecture", lectureSchema);
export default Lecture;
