import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Courses", required: true },
  paymentId: { type: String, default: undefined },
  status: { type: String, enum: ["active", "revoked", "refunded", "expired"], default: "active" },
  grantedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ userId: 1, resourceId: 1, tenantId: 1 }, { unique: true });
schema.index({ tenantId: 1, courseId: 1, status: 1 });
schema.index({ paymentId: 1 }, { unique: true, sparse: true });
export default mongoose.model("ResourceEntitlement", schema);
