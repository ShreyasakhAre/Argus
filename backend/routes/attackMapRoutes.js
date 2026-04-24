/**
 * Live Attack Map Routes
 * 
 * API routes for global attack statistics and attack map data
 */

const express = require("express");
const router = express.Router();

const {
  getGlobalAttackStatsController,
  getCountryAttackStatsController,
  startAttackSimulationController,
  stopAttackSimulationController,
  getSimulationStatusController,
  addAttackController,
  getAttackTypesController,
  getCountriesController,
  getHeatmapDataController,
  getNetworkGraphController,
  getAttackMapController
} = require("../controllers/attackMapController");

// Middleware for authentication (if needed)
const { authenticateUser, authorizeRoles } = require("../middleware/authMiddleware");

/**
 * GET /attacks/global-stats
 * Get global attack statistics
 */
router.get("/global-stats", authenticateUser, getGlobalAttackStatsController);

/**
 * GET /attacks/country/:countryCode
 * Get attack statistics for specific country
 */
router.get("/country/:countryCode", authenticateUser, getCountryAttackStatsController);

/**
 * GET /attacks/types
 * Get available attack types
 */
router.get("/types", authenticateUser, getAttackTypesController);

/**
 * GET /attacks/countries
 * Get list of available countries
 */
router.get("/countries", authenticateUser, getCountriesController);

/**
 * GET /attacks/heatmap
 * Get data formatted for heatmap visualization
 */
router.get("/heatmap", authenticateUser, getHeatmapDataController);

/**
 * GET /attacks/network
 * Get network graph data
 */
router.get("/network", authenticateUser, getNetworkGraphController);

/**
 * GET /attacks/map
 * Get attack map data (auto-detects best visualization)
 */
router.get("/map", authenticateUser, getAttackMapController);

/**
 * POST /attacks/simulation/start
 * Start attack simulation
 */
router.post("/simulation/start", authenticateUser, startAttackSimulationController);

/**
 * POST /attacks/simulation/stop
 * Stop attack simulation
 */
router.post("/simulation/stop", authenticateUser, stopAttackSimulationController);

/**
 * GET /attacks/simulation/status
 * Get simulation status
 */
router.get("/simulation/status", authenticateUser, getSimulationStatusController);

/**
 * POST /attacks/add
 * Add custom attack (for demo purposes)
 */
router.post("/add", authenticateUser, addAttackController);

module.exports = router;
