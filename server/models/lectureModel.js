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
  },
  { timestamps: true }
);

lectureSchema.index({ tenantId: 1, courseId: 1 });

const Lecture = mongoose.model("Lecture", lectureSchema);
export default Lecture;
