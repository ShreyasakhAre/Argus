const express = require('express');
const router = express.Router();
const fraudAnalystController = require('../controllers/fraudAnalystController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Review Queue Routes
router.get('/review-queue', requireRole(['fraud_analyst', 'admin', 'department_head']), fraudAnalystController.getReviewQueue);
router.get('/alert/:id', requireRole(['fraud_analyst', 'admin', 'department_head']), fraudAnalystController.getAlertDetails);
router.get('/cases/:caseId', requireRole(['fraud_analyst', 'admin', 'department_head']), fraudAnalystController.getCaseDetails);

// Case Management Routes
router.get('/cases', requireRole(['fraud_analyst', 'admin', 'department_head']), fraudAnalystController.getCases);
router.post('/create-case', requireRole(['fraud_analyst', 'admin']), fraudAnalystController.createCase);
router.post('/mark-safe', requireRole(['fraud_analyst', 'admin']), fraudAnalystController.markSafe);
router.post('/mark-malicious', requireRole(['fraud_analyst', 'admin']), fraudAnalystController.markMalicious);
router.post('/request-review', requireRole(['fraud_analyst', 'admin']), fraudAnalystController.requestReview);
router.post('/cases/:caseId/assign', requireRole(['fraud_analyst', 'admin']), fraudAnalystController.assignCase);
router.post('/cases/:caseId/review', requireRole(['fraud_analyst', 'admin']), fraudAnalystController.submitReview);

// Analytics and Workload Routes
router.get('/workload', requireRole(['fraud_analyst', 'admin', 'department_head']), fraudAnalystController.getAnalystWorkload);
router.get('/analytics', requireRole(['fraud_analyst', 'admin', 'department_head']), fraudAnalystController.getCaseAnalytics);

// Bulk Operations
router.post('/bulk-operation', requireRole(['fraud_analyst', 'admin']), fraudAnalystController.bulkOperation);

// Data Import (Admin only)
router.post('/import-dataset', requireRole(['admin']), fraudAnalystController.importCasesFromDataset);

module.exports = router;
