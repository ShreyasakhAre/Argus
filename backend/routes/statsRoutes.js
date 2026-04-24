const express = require('express');
const router = express.Router();
const datasetService = require('../services/datasetService');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

// GET /api/stats - Get overall system statistics
router.get(
  '/',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'auditor'),
  (req, res) => {
    try {
      const { org_id, department } = req.query;
      const filters = {};
      if (org_id) filters.org_id = org_id;
      if (department) filters.department = department;

      const stats = datasetService.getStats(filters);

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('GET /api/stats error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/stats/threats - Get threat breakdown statistics
router.get(
  '/threats',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'auditor'),
  (req, res) => {
    try {
      const { org_id, department } = req.query;
      const filters = {};
      if (org_id) filters.org_id = org_id;
      if (department) filters.department = department;

      const stats = datasetService.getStats(filters);

      return res.status(200).json({
        success: true,
        data: {
          threatBreakdown: stats.threatBreakdown,
          totalThreats: stats.maliciousCount,
          highRiskThreats: stats.highRiskCount
        }
      });
    } catch (error) {
      console.error('GET /api/stats/threats error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/stats/departments - Get department statistics
router.get(
  '/departments',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'auditor'),
  (req, res) => {
    try {
      const { org_id } = req.query;
      const filters = {};
      if (org_id) filters.org_id = org_id;

      const stats = datasetService.getStats(filters);

      return res.status(200).json({
        success: true,
        data: {
          departmentBreakdown: stats.departmentBreakdown,
          department_stats: stats.department_stats
        }
      });
    } catch (error) {
      console.error('GET /api/stats/departments error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/stats/realtime - Get real-time statistics for dashboard
router.get(
  '/realtime',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'auditor'),
  (req, res) => {
    try {
      const { org_id, department } = req.query;
      const filters = {};
      if (org_id) filters.org_id = org_id;
      if (department) filters.department = department;

      const stats = datasetService.getStats(filters);
      
      // Get recent activity
      const recentAlerts = datasetService.query(filters, { 
        limit: 10, 
        sortBy: 'timestamp', 
        sortOrder: 'desc' 
      });

      return res.status(200).json({
        success: true,
        data: {
          totalAlerts: stats.totalAlerts,
          maliciousCount: stats.maliciousCount,
          pendingReview: stats.pendingReview,
          avgRiskScore: stats.avgRiskScore,
          recentActivity: recentAlerts.data,
          model_metrics: stats.model_metrics
        }
      });
    } catch (error) {
      console.error('GET /api/stats/realtime error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
