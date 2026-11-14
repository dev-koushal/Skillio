import mongoose from "mongoose";

const schema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  status: { type: String, enum: ["received", "processed", "ignored", "failed"], default: "received" },
  processedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model("PaymentWebhookEvent", schema);
