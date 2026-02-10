import mongoose from "mongoose";
import { NotificationSeverity, NotificationCategory, Role } from "@/lib/types";

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    orgId: {
      type: String,
      required: true,
      index: true,
    },
    departmentId: {
      type: String,
      default: null,
      index: true,
    },
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alert",
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["safe", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    category: {
      type: String,
      enum: ["fraud", "compliance", "system", "threat", "scan"],
      default: "system",
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    roleFilter: {
      type: String,
      enum: ["admin", "fraud_analyst", "department_head", "employee", "auditor"],
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for common queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ orgId: 1, severity: 1 });
NotificationSchema.index({ departmentId: 1, createdAt: -1 });
NotificationSchema.index({ read: 1, userId: 1 });

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
