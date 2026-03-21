const fs = require("fs");
const path = require("path");

const dataPath = path.resolve(__dirname, "..", "data", "alerts.json");

function readData() {
  if (!fs.existsSync(dataPath)) return [];
  const contents = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(contents);
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
}

function createLegacyId() {
  return `A${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function normalizeTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toAlertResponse(raw) {
  return {
    id: raw.id,
    type: raw.type,
    severity: raw.severity,
    message: raw.message,
    status: raw.status || (raw.acknowledged ? "acknowledged" : "pending"),
    timestamp: normalizeTimestamp(raw.timestamp),
    acknowledged: raw.acknowledged || raw.status === "acknowledged",
    notification_id: raw.notification_id || "",
    details: raw.details || {},
  };
}

async function getAlerts(options = {}) {
  const data = readData();
  let alerts = data;

  if (typeof options.acknowledged === "boolean") {
    alerts = alerts.filter((a) => (a.acknowledged || a.status === "acknowledged") === options.acknowledged);
  }

  // sort by timestamp descending
  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const unacknowledged = data.filter((a) => !a.acknowledged && a.status !== "acknowledged").length;

  return {
    alerts: alerts.map(toAlertResponse),
    total: alerts.length,
    unacknowledged,
  };
}

async function createAlert(payload) {
  if (!payload.message || typeof payload.message !== "string") {
    throw new Error("Alert message is required.");
  }

  const newAlert = {
    id: payload.id || payload.legacyId || createLegacyId(),
    type: payload.type || "new_threat",
    severity: payload.severity || "medium",
    message: payload.message.trim(),
    status: payload.status || (payload.acknowledged ? "acknowledged" : "pending"),
    timestamp: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString(),
    acknowledged: payload.acknowledged || false,
    notification_id: payload.notification_id || null,
    details: payload.details || {},
  };

  const data = readData();
  data.push(newAlert);
  writeData(data);

  return {
    success: true,
    alert: toAlertResponse(newAlert),
  };
}

async function acknowledgeAlert(alertId) {
  const data = readData();
  const index = data.findIndex((a) => a.id === alertId);

  if (index === -1) {
    return {
      success: false,
      alert: null,
      message: "Alert not found.",
    };
  }

  data[index].acknowledged = true;
  data[index].status = "acknowledged";
  writeData(data);

  return {
    success: true,
    alert: toAlertResponse(data[index]),
  };
}

module.exports = {
  getAlerts,
  createAlert,
  acknowledgeAlert,
  toAlertResponse,
};
