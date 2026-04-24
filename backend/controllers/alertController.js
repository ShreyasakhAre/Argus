/**
 * Alert Controller
 * All data comes from datasetService (argus_notifications_10000.csv loaded in memory).
 * NO MongoDB queries. NO memory fallback. NO mock data.
 */

const datasetService = require('../services/datasetService');
const { getRealTimeAlertsService } = require('../services/realTimeAlerts');
const logger = require('../utils/logger');

// GET /api/alerts
async function getAlerts(req, res) {
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
      limit = 1000,
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
    });
  } catch (error) {
    logger.error('GET /api/alerts error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/alerts/analytics
async function getAnalytics(req, res) {
  try {
    const { department, org_id } = req.query;
    const filters = {};
    if (department) filters.department = department;
    if (org_id) filters.org_id = org_id;

    const stats = datasetService.getStats(filters);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAlerts: stats.totalAlerts,
          avgRiskScore: stats.avgRiskScore,
          maliciousCount: stats.maliciousCount,
          highRiskCount: stats.highRiskCount,
          pendingReview: stats.pendingReview,
          approvedCount: stats.approvedCount,
          rejectedCount: stats.rejectedCount,
        },
        threatBreakdown: stats.threatBreakdown,
        departmentBreakdown: stats.departmentBreakdown,
      },
    });
  } catch (error) {
    logger.error('GET /api/alerts/analytics error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// PATCH /api/alerts/:id/status
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, analyst_feedback } = req.body;

    const validStatuses = ['Approved', 'Rejected', 'Pending'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updated = datasetService.updateStatus(id, {
      review_status: status,
      analyst_feedback,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    // Broadcast update via Socket.IO
    const rtService = getRealTimeAlertsService();
    if (rtService) {
      rtService.broadcastUpdate(updated, 'updated');
    }

    logger.info(`Alert ${id} status updated to ${status}`);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error('PATCH /api/alerts/:id/status error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// PATCH /api/alerts/:id/acknowledge  (maps Pending→Approved for quick ack)
async function acknowledgeAlert(req, res) {
  try {
    const { id } = req.params;
    const updated = datasetService.updateStatus(id, { review_status: 'Approved' });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    const rtService = getRealTimeAlertsService();
    if (rtService) {
      rtService.broadcastUpdate(updated, 'acknowledged');
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error('PATCH /api/alerts/:id/acknowledge error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/alerts/timeline (derives events from in-memory dataset)
async function getTimeline(req, res) {
  try {
    const { notification_id } = req.query;

    let items;
    if (notification_id) {
      const item = datasetService.getById(notification_id);
      items = item ? [item] : [];
    } else {
      const { data } = datasetService.query({}, { page: 1, limit: 1000, sortBy: 'timestamp', sortOrder: 'desc' });
      items = data;
    }

    const events = [];
    items.forEach((alert) => {
      events.push({
        id: `E_${alert.notification_id}_detected`,
        notification_id: alert.notification_id,
        event_type: 'detected',
        timestamp: alert.timestamp,
        details: `Threat detected: ${alert.threat_category} (risk ${Math.round(alert.risk_score * 100)}%)`,
      });
      if (alert.review_status !== 'Pending') {
        events.push({
          id: `E_${alert.notification_id}_reviewed`,
          notification_id: alert.notification_id,
          event_type: alert.review_status === 'Approved' ? 'approved' : 'rejected',
          timestamp: alert.timestamp,
          details: `Alert ${alert.review_status.toLowerCase()}`,
        });
      }
    });

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({ success: true, data: { events, total: events.length } });
  } catch (error) {
    logger.error('GET /api/alerts/timeline error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/alerts — Not supported in dataset-only mode
async function createAlert(req, res) {
  return res.status(405).json({
    success: false,
    message: 'Creating alerts is disabled. The system operates on the pre-loaded dataset.',
  });
}

module.exports = {
  getAlerts,
  getAnalytics,
  updateStatus,
  acknowledgeAlert,
  getTimeline,
  createAlert,
};
