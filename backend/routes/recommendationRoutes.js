/**
 * Recommendation Engine Routes
 * 
 * API routes for insights and recommendations
 */

const express = require("express");
const router = express.Router();

const {
  getInsightsController,
  getInsightCategoryController,
  refreshInsightsController,
  getExecutiveSummaryController,
  getDashboardInsightsController,
  actionRecommendationController,
  getRecommendationStatsController
} = require("../controllers/recommendationController");

// Middleware for authentication (if needed)
const { authenticateUser, authorizeRoles } = require("../middleware/authMiddleware");

/**
 * GET /recommendations/insights
 * Get comprehensive insights and recommendations
 */
router.get("/insights", authenticateUser, getInsightsController);

/**
 * POST /recommendations/refresh
 * Force refresh of insights cache
 */
router.post("/refresh", authenticateUser, refreshInsightsController);

/**
 * GET /recommendations/summary
 * Get executive summary of key insights
 */
router.get("/summary", authenticateUser, getExecutiveSummaryController);

/**
 * GET /recommendations/dashboard
 * Get dashboard-ready insights data
 */
router.get("/dashboard", authenticateUser, getDashboardInsightsController);

/**
 * POST /recommendations/action
 * Mark recommendation as actioned
 */
router.post("/action", authenticateUser, actionRecommendationController);

/**
 * GET /recommendations/stats
 * Get recommendation statistics
 */
router.get("/stats", authenticateUser, getRecommendationStatsController);

/**
 * GET /recommendations/:category
 * Get insights for specific category
 */
router.get("/:category", authenticateUser, getInsightCategoryController);

module.exports = router;
