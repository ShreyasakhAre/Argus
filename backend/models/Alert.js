const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema(
  {
    legacyId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ["critical", "high", "medium", "low"],
      trim: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "acknowledged", "resolved"],
      default: "pending",
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notification_id: {
      type: String,
      trim: true,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AlertSchema.index({ timestamp: -1 });
AlertSchema.index({ severity: 1, status: 1 });

const Alert = mongoose.models.Alert || mongoose.model("Alert", AlertSchema);

module.exports = {
  Alert,
};
