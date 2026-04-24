const express = require('express');
const router = express.Router();
const datasetService = require('../services/datasetService');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

// GET /api/notifications - Get all notifications with filtering
router.get(
  '/',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'employee', 'auditor'),
  (req, res) => {
    try {
      const {
        review_status,
        threat_category,
        department,
        channel,
        priority,
        org_id,
        min_risk_score,
        max_risk_score,
        is_malicious,
        startDate,
        endDate,
        search,
        limit = 100,
        page = 1,
        sortBy = 'timestamp',
        sortOrder = 'desc',
      } = req.query;

      const filters = {};
      if (review_status) filters.review_status = review_status;
      if (threat_category) filters.threat_category = threat_category;
      if (department) filters.department = department;
      if (channel) filters.channel = channel;
      if (priority) filters.priority = priority;
      if (org_id) filters.org_id = org_id;
      if (is_malicious !== undefined) filters.is_malicious = is_malicious;
      if (min_risk_score !== undefined) filters.min_risk_score = min_risk_score;
      if (max_risk_score !== undefined) filters.max_risk_score = max_risk_score;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (search) filters.search = search;

      const result = datasetService.query(filters, { page, limit, sortBy, sortOrder });

      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        total: result.pagination.total,
      });
    } catch (error) {
      console.error('GET /api/notifications error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/notifications/unread - Get unread notifications for employee
router.get(
  '/unread',
  authenticateUser,
  authorizeRoles('employee', 'admin', 'fraud_analyst', 'department_head'),
  (req, res) => {
    try {
      const { org_id, email } = req.query;
      const filters = {};
      if (org_id) filters.org_id = org_id;
      if (email) filters.search = email; // Search by receiver email

      const result = datasetService.query(filters, { 
        limit: 50, 
        sortBy: 'timestamp', 
        sortOrder: 'desc' 
      });

      // Filter for high-risk or malicious notifications
      const unreadNotifications = result.data.filter(notification => {
        const normalizedScore = notification.risk_score > 1 
          ? Math.round((1 / (1 + Math.exp(-notification.risk_score))) * 100)
          : Math.round(notification.risk_score * 100);
        
        return normalizedScore >= 30 || notification.is_malicious;
      });

      return res.status(200).json({
        success: true,
        data: unreadNotifications,
        count: unreadNotifications.length
      });
    } catch (error) {
      console.error('GET /api/notifications/unread error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/notifications/:id - Get single notification by ID
router.get(
  '/:id(N\\d+)',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'employee', 'auditor'),
  (req, res) => {
    try {
      const { id } = req.params;
      const notification = datasetService.getById(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('GET /api/notifications/:id error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PATCH /api/notifications/:id/review - Update notification review status
router.patch(
  '/:id/review',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst'),
  (req, res) => {
    try {
      const { id } = req.params;
      const { review_status, analyst_feedback } = req.body;

      const validStatuses = ['Approved', 'Rejected', 'Pending'];
      if (!review_status || !validStatuses.includes(review_status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      const updated = datasetService.updateStatus(id, {
        review_status,
        analyst_feedback,
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Notification not found.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error('PATCH /api/notifications/:id/review error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/notifications/summary - Get notification summary for dashboard
router.get(
  '/summary',
  authenticateUser,
  authorizeRoles('admin', 'fraud_analyst', 'department_head', 'auditor'),
  (req, res) => {
    try {
      const { org_id, department } = req.query;
      const filters = {};
      if (org_id) filters.org_id = org_id;
      if (department) filters.department = department;

      const stats = datasetService.getStats(filters);

      // Calculate classification counts based on normalized scores
      const { data } = datasetService.query(filters, { limit: 10000, internal: true });
      
      const safeCount = data.filter(item => item.threat_category === 'safe').length;
      const suspiciousCount = data.filter(item => item.threat_category === 'suspicious').length;
      const maliciousCount = data.filter(item => item.is_malicious === 1).length;

      return res.status(200).json({
        success: true,
        data: {
          total: stats.totalAlerts,
          safe: safeCount,
          suspicious: suspiciousCount,
          malicious: maliciousCount,
          pendingReview: stats.pendingReview,
          avgRiskScore: stats.avgRiskScore
        }
      });
    } catch (error) {
      console.error('GET /api/notifications/summary error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
