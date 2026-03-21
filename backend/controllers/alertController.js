const alertService = require("../services/alertService");
const logger = require("../utils/logger");

function resolveErrorStatus(error) {
  if (error instanceof Error && error.message.includes("required")) {
    return 400;
  }

  return 500;
}

async function getAlerts(req, res) {
  try {
    const acknowledgedParam = req.query.acknowledged;
    const acknowledged =
      acknowledgedParam === undefined
        ? undefined
        : acknowledgedParam === "true";

    const data = await alertService.getAlerts({ 
      acknowledged,
      severity: req.query.severity,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit,
      page: req.query.page
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error("GET /api/alerts error:", error);
    return res.status(500).json({ alerts: [], total: 0, unacknowledged: 0 });
  }
}

async function createAlert(req, res) {
  try {
    if (req.body?.alertId) {
      const result = await alertService.acknowledgeAlert(req.body.alertId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          alert: null,
          message: "Alert not found.",
        });
      }

      return res.status(200).json(result);
    }

    const result = await alertService.createAlert(req.body);
    logger.info("Alert Created", req.user ? req.user.email : "system", { severity: result.alert.severity, type: result.alert.type });
    
    const io = req.app.get("io");
    if (io && result.success) {
      console.log("Emitting new_alert event");
      io.emit("new_alert", {
        type: "new",
        severity: result.alert.severity,
        notification: result.alert
      });
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("POST /api/alerts error:", error);
    return res.status(resolveErrorStatus(error)).json({
      success: false,
      alert: null,
      message: error instanceof Error ? error.message : "Unable to save alert.",
    });
  }
}

async function acknowledgeAlert(req, res) {
  try {
    const result = await alertService.acknowledgeAlert(req.params.id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        alert: null,
        message: "Alert not found.",
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("new_alert", {
        type: "acknowledged",
        severity: result.alert.severity,
        notification: result.alert
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("PATCH /api/alerts/:id/acknowledge error:", error);
    return res.status(500).json({
      success: false,
      alert: null,
      message: "Unable to acknowledge alert.",
    });
  }
}


async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status || !["pending", "resolved", "acknowledged"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const result = await alertService.updateAlertStatus(req.params.id, status);
    if (!result.success) return res.status(404).json({ success: false, message: "Alert not found." });
    
    // Broadcast status update
    const io = req.app.get("io");
    if (io) io.emit("new_alert", { alertId: req.params.id, status: result.alert.status, notification: result.alert });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getAnalytics(req, res) {
  try {
    const data = await alertService.getAnalytics();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  acknowledgeAlert,
  createAlert,
  getAlerts,
  updateStatus,
  getAnalytics,
};
