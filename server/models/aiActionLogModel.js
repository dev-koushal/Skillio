import mongoose from "mongoose";

const aiActionLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    arguments: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ["success", "failed", "requires_confirmation", "cancelled"],
      default: "success",
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

aiActionLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

const AIActionLog = mongoose.model("AIActionLog", aiActionLogSchema);
export default AIActionLog;

