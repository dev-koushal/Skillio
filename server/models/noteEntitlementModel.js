import mongoose from "mongoose";

const noteEntitlementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      required: true,
      index: true,
    },
    paymentId: {
      type: String,
      default: null,
    },
    orderId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "revoked", "refunded"],
      default: "active",
      index: true,
    },
    source: {
      type: String,
      enum: ["purchase", "free_grant", "institution_granted"],
      default: "purchase",
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

noteEntitlementSchema.index({ userId: 1, noteId: 1, tenantId: 1 }, { unique: true });

const NoteEntitlement = mongoose.models.NoteEntitlement || mongoose.model("NoteEntitlement", noteEntitlementSchema);
export default NoteEntitlement;
