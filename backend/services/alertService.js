const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const { Alert } = require("../models/Alert");
const { detectThreat } = require("../utils/threatDetector");

function createLegacyId() {
  return `A${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function normalizeTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toAlertResponse(alert) {
  const raw = typeof alert.toObject === "function" ? alert.toObject() : alert;
  const id = raw.legacyId || raw._id?.toString();

  return {
    id,
    type: raw.type,
    severity: raw.severity,
    message: raw.message,
    status: raw.status,
    timestamp: normalizeTimestamp(raw.timestamp),
    acknowledged: raw.status === "acknowledged",
    notification_id: raw.notification_id || "",
    details: raw.details || {},
  };
}

function buildAlertPayload(payload = {}) {
  if (!payload.message || typeof payload.message !== "string") {
    throw new Error("Alert message is required.");
  }

  const detectedSeverity = detectThreat(payload);

  return {
    legacyId: payload.id || payload.legacyId || createLegacyId(),
    type: payload.type || "new_threat",
    severity: payload.severity || detectedSeverity,
    message: payload.message.trim(),
    status: payload.status || (payload.acknowledged ? "acknowledged" : "pending"),
    timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    notification_id: payload.notification_id || null,
    details: payload.details || {},
  };
}

async function getAlerts(options = {}) {
  await connectDB();

  const filter = {};
  if (typeof options.acknowledged === "boolean") {
    filter.status = options.acknowledged ? "acknowledged" : "pending";
  }
  
  if (options.severity) filter.severity = options.severity;
  
  if (options.startDate || options.endDate) {
    filter.timestamp = {};
    if (options.startDate) filter.timestamp.$gte = new Date(options.startDate);
    if (options.endDate) filter.timestamp.$lte = new Date(options.endDate);
  }

  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 50;
  const skip = (page - 1) * limit;

  const [documents, unacknowledged, totalCount] = await Promise.all([
    Alert.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    Alert.countDocuments({ status: "pending" }),
    Alert.countDocuments(filter)
  ]);

  const alerts = documents.map(toAlertResponse);

  return {
    alerts,
    total: totalCount,
    unacknowledged,
    page,
    totalPages: Math.ceil(totalCount / limit)
  };
}

async function createAlert(payload) {
  await connectDB();

  const alert = await Alert.create(buildAlertPayload(payload));

  return {
    success: true,
    alert: toAlertResponse(alert),
  };
}

async function acknowledgeAlert(alertId) {
  await connectDB();

  const match = [{ legacyId: alertId }];
  if (mongoose.Types.ObjectId.isValid(alertId)) {
    match.unshift({ _id: alertId });
  }

  const alert = await Alert.findOneAndUpdate(
    { $or: match },
    { status: "acknowledged" },
    { new: true }
  );

  return {
    success: Boolean(alert),
    alert: alert ? toAlertResponse(alert) : null,
  };
}


async function updateAlertStatus(alertId, newStatus) {
  await connectDB();
  const match = [{ legacyId: alertId }];
  if (mongoose.Types.ObjectId.isValid(alertId)) {
    match.unshift({ _id: alertId });
  }

  const alert = await Alert.findOneAndUpdate(
    { $or: match },
    { status: newStatus },
    { new: true }
  );

  return {
    success: Boolean(alert),
    alert: alert ? toAlertResponse(alert) : null,
  };
}

async function getAnalytics() {
  await connectDB();
  
  const [totalAlerts, pendingAlerts, resolvedAlerts, criticalAlerts] = await Promise.all([
    Alert.countDocuments(),
    Alert.countDocuments({ status: "pending" }),
    Alert.countDocuments({ status: "resolved" }),
    Alert.countDocuments({ severity: "critical" })
  ]);
  
  const severityBreakdown = await Alert.aggregate([
    { $group: { _id: "$severity", count: { $sum: 1 } } }
  ]);

  return {
    totalAlerts,
    pendingAlerts,
    resolvedAlerts,
    criticalAlerts,
    severityBreakdown
  };
}
module.exports = {
  acknowledgeAlert,
  createAlert,
  getAlerts,
  toAlertResponse,
  updateAlertStatus,
  getAnalytics
};
