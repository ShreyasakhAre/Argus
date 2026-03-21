const express = require("express");
const {
  acknowledgeAlert,
  createAlert,
  getAlerts,
  updateStatus,
  getAnalytics,
} = require("../controllers/alertController");
const { authenticateUser, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticateUser, authorizeRoles("admin", "analyst", "viewer"), getAlerts);
router.post("/", authenticateUser, authorizeRoles("admin"), createAlert);
router.get("/analytics", authenticateUser, authorizeRoles("admin", "analyst", "viewer"), getAnalytics);
router.patch("/:id/status", authenticateUser, authorizeRoles("admin", "analyst"), updateStatus);
router.patch("/:id/acknowledge", authenticateUser, authorizeRoles("admin", "analyst"), acknowledgeAlert);

module.exports = router;
