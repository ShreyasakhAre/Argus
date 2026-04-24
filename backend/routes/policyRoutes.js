/**
 * Policy Engine Routes
 * 
 * API routes for policy-based auto-response rules
 */

const express = require("express");
const router = express.Router();

const {
  evaluatePoliciesController,
  createPolicyController,
  updatePolicyController,
  deletePolicyController,
  getAllPoliciesController,
  getPolicyController,
  getPolicyStatsController,
  testPolicyController,
  simulatePolicyController
} = require("../controllers/policyController");

// Middleware for authentication (if needed)
const { authenticateUser, authorizeRoles } = require("../middleware/authMiddleware");

/**
 * POST /policies/evaluate
 * Evaluate policies against context
 */
router.post("/evaluate", authenticateUser, evaluatePoliciesController);

/**
 * POST /policies
 * Create a new policy
 */
router.post("/", authenticateUser, createPolicyController);

/**
 * PUT /policies/:policyId
 * Update an existing policy
 */
router.put("/:policyId", authenticateUser, updatePolicyController);

/**
 * DELETE /policies/:policyId
 * Delete a policy
 */
router.delete("/:policyId", authenticateUser, deletePolicyController);

/**
 * GET /policies
 * Get all policies with optional filtering
 */
router.get("/", authenticateUser, getAllPoliciesController);

/**
 * GET /policies/:policyId
 * Get a specific policy
 */
router.get("/:policyId", authenticateUser, getPolicyController);

/**
 * GET /policies/stats
 * Get policy statistics
 */
router.get("/stats", authenticateUser, getPolicyStatsController);

/**
 * POST /policies/test
 * Test a policy against sample context
 */
router.post("/test", authenticateUser, testPolicyController);

/**
 * POST /policies/simulate
 * Simulate policy execution with sample data
 */
router.post("/simulate", authenticateUser, simulatePolicyController);

module.exports = router;
