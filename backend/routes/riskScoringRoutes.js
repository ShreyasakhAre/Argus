/**
 * Risk Scoring Routes
 * 
 * API routes for risk scoring and user/entity risk management
 */

const express = require("express");
const router = express.Router();

const {
  updateRiskScoreController,
  getUserRiskProfileController,
  getAllUsersRiskProfileController,
  getDepartmentRiskSummaryController,
  simulateBehaviorController,
  getRiskLeaderboardController,
  calculateNotificationRiskController,
  calculateUserRiskController,
  calculateBatchUserRisksController,
  mapNotificationEntitiesController,
  getDepartmentRisksController
} = require("../controllers/riskScoringController");

// Middleware for authentication
const { authenticateUser, authorizeRoles } = require("../middleware/authMiddleware");

/**
 * POST /risk/update
 * Update user's risk score based on behavior
 */
router.post("/update", authenticateUser, updateRiskScoreController);

/**
 * GET /risk/users
 * Get all users sorted by risk
 */
router.get("/users", authenticateUser, getAllUsersRiskProfileController);

/**
 * GET /risk/profile/:userId
 * Get user's risk profile
 */
router.get("/profile/:userId", authenticateUser, getUserRiskProfileController);

/**
 * GET /risk/department-summary
 * Get department risk summary (legacy)
 */
router.get("/department-summary", authenticateUser, getDepartmentRiskSummaryController);

/**
 * GET /risk/departments
 * Get department-level risk scores (new)
 */
router.get("/departments", authenticateUser, getDepartmentRisksController);

/**
 * POST /risk/simulate
 * Simulate user behavior for demo purposes
 */
router.post("/simulate", authenticateUser, simulateBehaviorController);

/**
 * GET /risk/leaderboard
 * Get risk leaderboard (top risky users)
 */
router.get("/leaderboard", authenticateUser, getRiskLeaderboardController);

/**
 * POST /risk/notification
 * Calculate risk score for a notification
 */
router.post("/notification", authenticateUser, calculateNotificationRiskController);

/**
 * POST /risk/user/:userId
 * Calculate risk score for a user
 */
router.post("/user/:userId", authenticateUser, calculateUserRiskController);

/**
 * POST /risk/batch-users
 * Calculate risk scores for multiple users
 */
router.post("/batch-users", authenticateUser, calculateBatchUserRisksController);

/**
 * POST /risk/map-entities
 * Map notification to entities (users, departments, domains, IPs)
 */
router.post("/map-entities", authenticateUser, mapNotificationEntitiesController);

module.exports = router;
