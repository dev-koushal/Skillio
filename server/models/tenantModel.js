import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    customDomain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    logo: {
      type: String,
      default: "/skillio.png",
    },
    favicon: {
      type: String,
      default: "/skillio.png",
    },
    primaryColor: {
      type: String,
      default: "#164e63", // cyan-900 (preserving existing brand)
    },
    secondaryColor: {
      type: String,
      default: "#0f172a", // slate-900
    },
    title: {
      type: String,
      default: "Learn Without Limits",
    },
    subtitle: {
      type: String,
      default: "A modern learning platform where educators build powerful courses and students master real skills.",
    },
    heroContent: {
      type: String,
      default: "Access industry-vetted courses designed to bridge the gap between where you are and where you want to be.",
    },
    heroImage: {
      type: String,
      default: "https://images.freecreatives.com/wp-content/uploads/2016/04/Minimalistic-Website-Background.jpg",
    },
    footerText: {
      type: String,
      default: "All rights reserved.",
    },
    organizationName: {
      type: String,
      default: "Skillio Academy",
    },
    features: {
      quizzes: { type: Boolean, default: true },
      certificates: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true },
      reviews: { type: Boolean, default: true },
      liveClasses: { type: Boolean, default: false },
    },
    settings: {
      contactEmail: { type: String, default: "" },
      currency: { type: String, default: "INR" },
      currencySymbol: { type: String, default: "₹" },
      allowPublicRegistration: { type: Boolean, default: true },
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for domain resolution
tenantSchema.index({ slug: 1, status: 1 });
tenantSchema.index({ customDomain: 1, status: 1 });

const Tenant = mongoose.model("Tenant", tenantSchema);
export default Tenant;
