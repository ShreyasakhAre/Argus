/**
 * Test Routes
 * 
 * API routes for testing all services
 */

const express = require("express");
const router = express.Router();

const { testAllServices } = require("../controllers/testController");

/**
 * GET /test/services
 * Test all ARGUS services
 */
router.get("/services", testAllServices);

module.exports = router;
