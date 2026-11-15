import mongoose from "mongoose";

const topicSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

topicSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const Topic = mongoose.models.Topic || mongoose.model("Topic", topicSchema);
export default Topic;
