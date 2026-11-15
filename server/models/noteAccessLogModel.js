import mongoose from "mongoose";

const noteAccessLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: "Note", default: null, index: true },
    event: {
      type: String,
      enum: ["viewer_session_created", "page_served", "access_denied", "payment_refunded"],
      required: true,
    },
    pageNumber: { type: Number, default: null },
    reason: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    authSessionId: { type: String, default: "" },
  },
  { timestamps: true }
);

noteAccessLogSchema.index({ tenantId: 1, noteId: 1, createdAt: -1 });

const NoteAccessLog = mongoose.models.NoteAccessLog || mongoose.model("NoteAccessLog", noteAccessLogSchema);
export default NoteAccessLog;
