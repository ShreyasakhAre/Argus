const express = require('express');
const router = express.Router();
const { scanLink, scanQR } = require('../controllers/scanController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/', 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// All endpoints require a valid JWT
// Roles: admin | fraud_analyst | department_head | employee | auditor

router.post(
  '/link',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'employee', 'auditor'),
  scanLink
);

router.post(
  '/',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'employee', 'auditor'),
  upload.single('file'),
  scanQR
);

module.exports = router;
