import mongoose from "mongoose";

const liveClassSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, default: "", trim: true, maxlength: 2000 },
  youtubeVideoId: { type: String, required: true, match: /^[A-Za-z0-9_-]{11}$/ },
  youtubeLiveUrl: { type: String, required: true, trim: true },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ["scheduled", "live", "ended", "cancelled"], default: "scheduled" },
  isActive: { type: Boolean, default: false },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
}, { timestamps: true });

liveClassSchema.index({ tenantId: 1, scheduledAt: 1 });
liveClassSchema.index({ tenantId: 1, status: 1, scheduledAt: 1 });
liveClassSchema.index({ tenantId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export default mongoose.model("LiveClass", liveClassSchema);
