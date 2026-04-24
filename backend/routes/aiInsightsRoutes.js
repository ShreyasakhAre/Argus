/**
 * AI Insights Routes
 * 
 * API routes for AI insights and anomaly detection
 */

const express = require("express");
const router = express.Router();

const {
  generateInsightsController,
  generateBatchInsightsController,
  getInsightsSummaryController,
  getAnomaliesController,
  analyzePatternController
} = require("../controllers/aiInsightsController");

// Middleware for authentication
const { authenticateUser } = require("../middleware/authMiddleware");

/**
 * POST /insights/generate
 * Generate insights for a notification
 */
router.post("/generate", authenticateUser, generateInsightsController);

/**
 * POST /insights/batch
 * Generate insights for multiple notifications
 */
router.post("/batch", authenticateUser, generateBatchInsightsController);

/**
 * GET /insights/summary
 * Get insights summary for dashboard
 */
router.get("/summary", authenticateUser, getInsightsSummaryController);

/**
 * GET /insights/anomalies
 * Get recent anomaly detections
 */
router.get("/anomalies", authenticateUser, getAnomaliesController);

/**
 * POST /insights/analyze-pattern
 * Analyze specific patterns
 */
router.post("/analyze-pattern", authenticateUser, analyzePatternController);

module.exports = router;
