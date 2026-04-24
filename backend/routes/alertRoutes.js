const express = require('express');
const {
  getAlerts,
  getAnalytics,
  updateStatus,
  acknowledgeAlert,
  getTimeline,
  createAlert,
} = require('../controllers/alertController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All endpoints require a valid JWT
// Roles: admin | fraud_analyst | department_head | employee | auditor

router.get(
  '/',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'employee', 'auditor'),
  getAlerts
);

router.get(
  '/analytics',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'auditor'),
  getAnalytics
);

router.get(
  '/timeline',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'auditor'),
  getTimeline
);

router.patch(
  '/:id/status',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst'),
  updateStatus
);

router.patch(
  '/:id/acknowledge',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst'),
  acknowledgeAlert
);

// Disabled in dataset-only mode
router.post('/', authenticateUser, authorizeRoles('admin'), createAlert);

module.exports = router;
