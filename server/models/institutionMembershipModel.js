import mongoose from "mongoose";

const institutionMembershipSchema = new mongoose.Schema(
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
    role: {
      type: String,
      enum: ["student", "educator", "tenant_admin"],
      default: "student",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "invited"],
      default: "active",
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index: unique membership per user and tenant
institutionMembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
institutionMembershipSchema.index({ tenantId: 1, status: 1, joinedAt: -1 });

const InstitutionMembership = mongoose.model(
  "InstitutionMembership",
  institutionMembershipSchema
);

export default InstitutionMembership;

