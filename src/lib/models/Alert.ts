import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema({
  severity: {
    type: String,
    enum: ["critical", "high", "medium", "low"],
    required: true,
  },
  message: String,
  notification_id: String,
  acknowledged: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: String,
    default: () => new Date().toISOString(),
  },
});

export const Alert =
  mongoose.models.Alert || mongoose.model("Alert", AlertSchema);
