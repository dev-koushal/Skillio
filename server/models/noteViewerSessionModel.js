import mongoose from "mongoose";

const noteViewerSessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: "Note", required: true, index: true },
    authSessionId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

noteViewerSessionSchema.index({ userId: 1, tenantId: 1, noteId: 1, expiresAt: 1 });

const NoteViewerSession =
  mongoose.models.NoteViewerSession || mongoose.model("NoteViewerSession", noteViewerSessionSchema);

export default NoteViewerSession;
