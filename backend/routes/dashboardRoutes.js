const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboards/admin
router.get('/admin', dashboardController.getAdminDashboard);

// GET /api/dashboards/fraud-analyst
router.get('/fraud-analyst', dashboardController.getFraudAnalystDashboard);

// GET /api/dashboards/department-head
router.get('/department-head', dashboardController.getDepartmentHeadDashboard);

// GET /api/dashboards/employee
router.get('/employee', dashboardController.getEmployeeDashboard);

// GET /api/dashboards/audit
router.get('/audit', dashboardController.getAuditDashboard);

module.exports = router;
