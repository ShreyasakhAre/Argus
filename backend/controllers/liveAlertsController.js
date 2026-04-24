/**
 * Real-time Alerts Controller
 * 
 * Handles API endpoints for real-time alerts functionality
 */

const { getRealTimeAlertsService } = require("../services/realTimeAlerts");
const logger = require("../utils/logger");

/**
 * GET /alerts/live/stats
 * Get real-time alerts statistics
 */
async function getLiveAlertsStats(req, res) {
  try {
    const realTimeAlerts = getRealTimeAlertsService();
    if (!realTimeAlerts) {
      return res.status(503).json({
        success: false,
        error: "Real-time alerts service not available"
      });
    }

    const stats = await realTimeAlerts.getAlertStats();

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error("Get live alerts stats error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get live alerts stats",
      details: error.message
    });
  }
}

/**
 * GET /alerts/live/history
 * Get recent alert history
 */
async function getLiveAlertsHistory(req, res) {
  try {
    const { limit = 50, severity } = req.query;
    
    const realTimeAlerts = getRealTimeAlertsService();
    if (!realTimeAlerts) {
      return res.status(503).json({
        success: false,
        error: "Real-time alerts service not available"
      });
    }

    const alerts = await realTimeAlerts.getAlertHistory(parseInt(limit), severity);

    return res.status(200).json({
      success: true,
      data: alerts
    });

  } catch (error) {
    logger.error("Get live alerts history error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get live alerts history",
      details: error.message
    });
  }
}

/**
 * GET /alerts/live/buffer
 * Get alert buffer (recent broadcasts)
 */
async function getLiveAlertsBuffer(req, res) {
  try {
    const realTimeAlerts = getRealTimeAlertsService();
    if (!realTimeAlerts) {
      return res.status(503).json({
        success: false,
        error: "Real-time alerts service not available"
      });
    }

    const buffer = realTimeAlerts.getAlertBuffer();

    return res.status(200).json({
      success: true,
      data: buffer
    });

  } catch (error) {
    logger.error("Get live alerts buffer error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get live alerts buffer",
      details: error.message
    });
  }
}

/**
 * POST /alerts/live/broadcast
 * Manually broadcast an alert (for testing)
 */
async function broadcastAlert(req, res) {
  try {
    const { alert } = req.body;

    if (!alert || !alert.message) {
      return res.status(400).json({
        success: false,
        error: "Alert data with message is required"
      });
    }

    const realTimeAlerts = getRealTimeAlertsService();
    if (!realTimeAlerts) {
      return res.status(503).json({
        success: false,
        error: "Real-time alerts service not available"
      });
    }

    realTimeAlerts.broadcastNewAlert(alert);

    return res.status(200).json({
      success: true,
      message: "Alert broadcasted successfully",
      alert: {
        id: alert.id || alert._id,
        message: alert.message,
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error("Broadcast alert error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to broadcast alert",
      details: error.message
    });
  }
}

/**
 * DELETE /alerts/live/buffer
 * Clear alert buffer
 */
async function clearAlertsBuffer(req, res) {
  try {
    const realTimeAlerts = getRealTimeAlertsService();
    if (!realTimeAlerts) {
      return res.status(503).json({
        success: false,
        error: "Real-time alerts service not available"
      });
    }

    realTimeAlerts.clearAlertBuffer();

    return res.status(200).json({
      success: true,
      message: "Alert buffer cleared successfully"
    });

  } catch (error) {
    logger.error("Clear alerts buffer error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to clear alerts buffer",
      details: error.message
    });
  }
}

module.exports = {
  getLiveAlertsStats,
  getLiveAlertsHistory,
  getLiveAlertsBuffer,
  broadcastAlert,
  clearAlertsBuffer
};
