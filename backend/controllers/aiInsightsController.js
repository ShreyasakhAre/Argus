/**
 * AI Insights Controller
 * 
 * Handles API endpoints for AI insights and anomaly detection
 */

const { aiInsightsService } = require("../services/aiInsightsService");
const logger = require("../utils/logger");

/**
 * POST /insights/generate
 * Generate insights for a notification
 */
async function generateInsightsController(req, res) {
  try {
    const { notification } = req.body;

    if (!notification) {
      return res.status(400).json({
        success: false,
        error: "Notification data is required"
      });
    }

    const insights = await aiInsightsService.generateInsights(notification);

    return res.status(200).json({
      success: true,
      data: insights
    });

  } catch (error) {
    logger.error("Generate insights controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate insights",
      details: error.message
    });
  }
}

/**
 * POST /insights/batch
 * Generate insights for multiple notifications
 */
async function generateBatchInsightsController(req, res) {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        error: "Notification IDs array is required"
      });
    }

    if (notificationIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Cannot process more than 100 notifications at once"
      });
    }

    const insights = await aiInsightsService.generateBatchInsights(notificationIds);

    return res.status(200).json({
      success: true,
      data: insights
    });

  } catch (error) {
    logger.error("Generate batch insights controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate batch insights",
      details: error.message
    });
  }
}

/**
 * GET /insights/summary
 * Get insights summary for dashboard
 */
async function getInsightsSummaryController(req, res) {
  try {
    const { timeWindow = 24 } = req.query;

    const summary = await aiInsightsService.getInsightsSummary(parseInt(timeWindow));

    return res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error("Get insights summary controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get insights summary",
      details: error.message
    });
  }
}

/**
 * GET /insights/anomalies
 * Get recent anomaly detections
 */
async function getAnomaliesController(req, res) {
  try {
    const { limit = 50, severity, timeWindow = 24 } = req.query;

    // This would query the database for recent anomaly insights
    // For now, return a placeholder response
    const anomalies = {
      anomalies: [],
      summary: {
        total: 0,
        highConfidence: 0,
        timeWindow: parseInt(timeWindow)
      },
      timestamp: new Date()
    };

    return res.status(200).json({
      success: true,
      data: anomalies
    });

  } catch (error) {
    logger.error("Get anomalies controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get anomalies",
      details: error.message
    });
  }
}

/**
 * POST /insights/analyze-pattern
 * Analyze specific patterns
 */
async function analyzePatternController(req, res) {
  try {
    const { pattern, context } = req.body;

    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: "Pattern data is required"
      });
    }

    // This would implement specific pattern analysis
    const analysis = {
      pattern,
      confidence: 0.8,
      explanation: `Pattern ${pattern} analysis completed`,
      recommendations: ['Monitor similar patterns', 'Update detection rules'],
      timestamp: new Date()
    };

    return res.status(200).json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error("Analyze pattern controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to analyze pattern",
      details: error.message
    });
  }
}

module.exports = {
  generateInsightsController,
  generateBatchInsightsController,
  getInsightsSummaryController,
  getAnomaliesController,
  analyzePatternController
};
