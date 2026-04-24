/**
 * Threat Intelligence Routes
 * 
 * API routes for threat intelligence functionality
 */

const express = require("express");
const router = express.Router();

const {
  getIpIntelligenceController,
  getDomainIntelligenceController,
  getEventIntelligenceController,
  getNotificationIntelligenceController,
  getThreatSummaryController,
  searchThreatIntelligenceController
} = require("../controllers/threatIntelligenceController");
const dashboardAnalyticsService = require("../services/dashboardAnalyticsService");

// Middleware for authentication
const { authenticateUser, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/", authenticateUser, (req, res) => {
  try {
    return res.status(200).json(dashboardAnalyticsService.getThreatPatterns(req.query));
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /threat/ip/:ip
 * Get threat intelligence for IP address
 */
router.get("/ip/:ip", authenticateUser, getIpIntelligenceController);

/**
 * GET /threat/domain/:domain
 * Get threat intelligence for domain
 */
router.get("/domain/:domain", authenticateUser, getDomainIntelligenceController);

/**
 * POST /threat/event
 * Get threat intelligence for event/pattern
 */
router.post("/event", authenticateUser, getEventIntelligenceController);

/**
 * POST /threat/notification
 * Get comprehensive threat intelligence for notification
 */
router.post("/notification", authenticateUser, getNotificationIntelligenceController);

/**
 * GET /threat/summary
 * Get threat intelligence summary
 */
router.get("/summary", authenticateUser, getThreatSummaryController);

/**
 * POST /threat/search
 * Search threat intelligence data
 */
router.post("/search", authenticateUser, searchThreatIntelligenceController);

module.exports = router;
