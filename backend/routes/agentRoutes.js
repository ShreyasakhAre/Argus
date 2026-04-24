/**
 * Autonomous Agent Routes
 * 
 * API routes for the ARGUS Autonomous Security Agent
 */

const express = require("express");
const router = express.Router();

const {
  processNotificationAgent,
  getAgentStatistics,
  updateAgentConfiguration,
  getAgentActivityLog,
  enableAutonomousMode,
  disableAutonomousMode,
  testAgent,
  getAgentHealth,
  startProcessingLoop,
  stopProcessingLoop,
  getProcessingStats,
  updateProcessingConfig,
  getProcessingActivity
} = require("../controllers/agentController");

// Middleware for authentication (if needed)
const { authenticateUser, authorizeRoles } = require("../middleware/authMiddleware");

/**
 * POST /agent/process-notification
 * Process a notification through the autonomous agent
 */
router.post("/process-notification", authenticateUser, processNotificationAgent);

/**
 * GET /agent/stats
 * Get current agent statistics and configuration
 */
router.get("/stats", authenticateUser, getAgentStatistics);

/**
 * PUT /agent/config
 * Update agent configuration
 */
router.put("/config", authenticateUser, updateAgentConfiguration);

/**
 * GET /agent/activity
 * Get agent activity log
 */
router.get("/activity", authenticateUser, getAgentActivityLog);

/**
 * POST /agent/enable
 * Enable autonomous mode
 */
router.post("/enable", authenticateUser, enableAutonomousMode);

/**
 * POST /agent/disable
 * Disable autonomous mode
 */
router.post("/disable", authenticateUser, disableAutonomousMode);

/**
 * POST /agent/test
 * Test agent with sample notification
 */
router.post("/test", authenticateUser, testAgent);

/**
 * GET /agent/health
 * Check agent health status
 */
router.get("/health", getAgentHealth);

/**
 * POST /agent/processing/start
 * Start the continuous processing loop
 */
router.post("/processing/start", authenticateUser, startProcessingLoop);

/**
 * POST /agent/processing/stop
 * Stop the continuous processing loop
 */
router.post("/processing/stop", authenticateUser, stopProcessingLoop);

/**
 * GET /agent/processing/stats
 * Get processing loop statistics
 */
router.get("/processing/stats", authenticateUser, getProcessingStats);

/**
 * POST /agent/processing/config
 * Update processing loop configuration
 */
router.post("/processing/config", authenticateUser, updateProcessingConfig);

/**
 * GET /agent/processing/activity
 * Get recent processing activity
 */
router.get("/processing/activity", authenticateUser, getProcessingActivity);

module.exports = router;
