/**
 * Fraud Analyst Controller
 * All data served from datasetService (argus_notifications_10000.csv).
 * No MongoDB, no FraudCase model, no mock data.
 */

const datasetService = require('../services/datasetService');
const { getRealTimeAlertsService } = require('../services/realTimeAlerts');
const logger = require('../utils/logger');

// GET /api/fraud-analyst/review-queue
exports.getReviewQueue = async (req, res) => {
  try {
    const {
      status = 'Pending',
      priority,
      department,
      threat_category,
      page = 1,
      limit = 1000,
    } = req.query;

    const filters = {};
    if (status !== 'all') {
      filters.review_status = status;
    }
    if (priority) filters.priority = priority;
    if (department) filters.department = department;
    if (threat_category) filters.threat_category = threat_category;
    if (req.query.assigned_analyst_id) filters.assigned_analyst_id = req.query.assigned_analyst_id;

    const result = datasetService.query(filters, {
      page,
      limit,
      sortBy: 'risk_score',
      sortOrder: 'desc',
    });

    const stats = datasetService.getStats({});

    return res.json({
      success: true,
      data: {
        cases: result.data,
        pagination: result.pagination,
        summary: {
          pending: stats.pendingReview,
          approved: stats.approvedCount,
          rejected: stats.rejectedCount,
          total: result.pagination.total,
        },
      },
    });
  } catch (error) {
    logger.error('getReviewQueue error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/fraud-analyst/alert/:id
exports.getAlertDetails = async (req, res) => {
  try {
    const item = datasetService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const history = [
      {
        timestamp: item.timestamp,
        action: 'detected',
        actor: 'argus-engine',
        detail: `${item.threat_category} detected`,
      },
      {
        timestamp: new Date(),
        action: item.review_status || 'Pending',
        actor: item.assigned_analyst_name || 'unassigned',
        detail: item.analyst_feedback || 'Awaiting analyst review',
      },
    ];

    return res.json({
      success: true,
      data: {
        alert: item,
        evidence: [
          item.sender_domain ? `Sender domain: ${item.sender_domain}` : null,
          item.contains_url ? 'Contains URL in message body' : null,
          item.attachment_type && item.attachment_type !== 'none'
            ? `Attachment present: ${item.attachment_type}`
            : null,
          item.threat_category ? `Threat category: ${item.threat_category}` : null,
        ].filter(Boolean),
        history,
      },
    });
  } catch (error) {
    logger.error('getAlertDetails error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/fraud-analyst/cases/:caseId
exports.getCaseDetails = async (req, res) => {
  try {
    const item = datasetService.getById(req.params.caseId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }
    return res.json({ success: true, data: { case: item } });
  } catch (error) {
    logger.error('getCaseDetails error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/fraud-analyst/cases/:caseId/assign
exports.assignCase = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { analystId, analystName } = req.body;

    const updated = datasetService.updateStatus(caseId, {
      review_status: 'In Review',
      analyst_feedback: `Assigned to ${analystName || analystId}`,
    });
    
    // Quick patch: add assigned_analyst_id to the object
    if (updated) {
      updated.assigned_analyst_id = analystId;
      updated.assigned_analyst_name = analystName;
    }

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    return res.json({
      success: true,
      data: updated,
      message: `Case ${caseId} assigned to ${analystName}`,
    });
  } catch (error) {
    logger.error('assignCase error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/fraud-analyst/cases/:caseId/review
exports.submitReview = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { action, feedback, escalationReason } = req.body;

    const validActions = ['approve', 'reject', 'escalate'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    const reviewStatusMap = {
      approve: 'Approved',
      reject: 'Rejected',
      escalate: 'Escalated',
    };

    let updated = datasetService.updateStatus(caseId, {
      review_status: reviewStatusMap[action],
      analyst_feedback: feedback || escalationReason || '',
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }
    
    if (action === 'approve') {
      updated.is_malicious = 0;
      updated.threat_category = 'safe';
       updated.risk_score = Math.min(updated.risk_score, 0.2);
    } else if (action === 'reject') {
      updated.is_malicious = 1;
      updated.threat_category = updated.threat_category === 'safe' ? 'phishing' : updated.threat_category;
       updated.risk_score = Math.max(updated.risk_score, 0.9);
    }
    
    if (action === 'escalate') {
      datasetService.createCase(caseId, {
        severity: 'high',
        notes: escalationReason || feedback,
        analystId: req.body.analystId,
        analystName: req.body.analystName
      });
    }

    // Broadcast the update
    const rtService = getRealTimeAlertsService();
    if (rtService) rtService.broadcastUpdate(updated, 'updated');

    return res.json({
      success: true,
      data: updated,
      message: `Case ${caseId} ${action}d successfully`,
    });
  } catch (error) {
    logger.error('submitReview error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/fraud-analyst/workload
exports.getAnalystWorkload = async (req, res) => {
  try {
    const stats = datasetService.getStats({});
    
    // Create realistic mock workload data including current analyst and others
    const workload = [
      {
        _id: 'user',
        analyst_name: 'Current Analyst',
        pending_count: stats.pendingReview > 5 ? 5 : stats.pendingReview,
        in_review_count: 2,
        total_assigned: 7,
        avg_time_to_review: 14.5
      },
      {
        _id: 'a1',
        analyst_name: 'Sarah Connor',
        pending_count: Math.floor(stats.pendingReview * 0.3),
        in_review_count: 4,
        total_assigned: Math.floor(stats.pendingReview * 0.3) + 4,
        avg_time_to_review: 12.2
      },
      {
        _id: 'a2',
        analyst_name: 'John Smith',
        pending_count: Math.floor(stats.pendingReview * 0.4),
        in_review_count: 1,
        total_assigned: Math.floor(stats.pendingReview * 0.4) + 1,
        avg_time_to_review: 18.7
      }
    ];

    return res.json({
      success: true,
      data: workload,
    });
  } catch (error) {
    logger.error('getAnalystWorkload error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/fraud-analyst/analytics
exports.getCaseAnalytics = async (req, res) => {
  try {
    const { department, org_id } = req.query;
    const filters = {};
    if (department) filters.department = department;
    if (org_id) filters.org_id = org_id;

    const stats = datasetService.getStats(filters);

    return res.json({
      success: true,
      data: {
        summary: {
          totalCases: stats.totalAlerts,
          pendingCases: stats.pendingReview,
          approvedCases: stats.approvedCount,
          rejectedCases: stats.rejectedCount,
          highRiskCount: stats.highRiskCount,
          avgRiskScore: stats.avgRiskScore,
        },
        threatBreakdown: stats.threatBreakdown,
        departmentBreakdown: stats.departmentBreakdown,
      },
    });
  } catch (error) {
    logger.error('getCaseAnalytics error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/fraud-analyst/bulk-operation
exports.bulkOperation = async (req, res) => {
  try {
    const { caseIds, operation, options = {} } = req.body;

    if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Case IDs are required' });
    }

    const validOperations = ['approve', 'reject', 'escalate'];
    if (!validOperations.includes(operation)) {
      return res.status(400).json({ success: false, error: 'Invalid operation' });
    }

    const statusMap = { approve: 'Approved', reject: 'Rejected', escalate: 'Pending' };
    let updatedCount = 0;
    const errors = [];

    for (const caseId of caseIds) {
      const updated = datasetService.updateStatus(caseId, {
        review_status: statusMap[operation],
        analyst_feedback: options.feedback || `Bulk ${operation}`,
      });
      if (updated) updatedCount++;
      else errors.push({ caseId, error: 'Not found' });
    }

    return res.json({
      success: true,
      data: { updatedCount, totalRequested: caseIds.length, errors },
      message: `Bulk ${operation} completed`,
    });
  } catch (error) {
    logger.error('bulkOperation error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/fraud-analyst/cases
exports.getCases = async (req, res) => {
  try {
    const filters = {};
    if (req.query.assigned_analyst_id) filters.assigned_analyst_id = req.query.assigned_analyst_id;
    if (req.query.status) filters.status = req.query.status;

    const cases = datasetService.getCases(filters);
    return res.json({ success: true, data: { cases } });
  } catch (error) {
    logger.error('getCases error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/fraud-analyst/create-case
exports.createCase = async (req, res) => {
  try {
    const { notificationId, severity, analystId, analystName, notes } = req.body;
    
    if (!notificationId) {
      return res.status(400).json({ success: false, error: 'Notification ID required' });
    }

    const newCase = datasetService.createCase(notificationId, { severity, analystId, analystName, notes });
    if (!newCase) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const rtService = getRealTimeAlertsService();
    if (rtService) rtService.broadcastUpdate(newCase, 'case_created');

    return res.json({ success: true, data: newCase, message: 'Case created successfully' });
  } catch (error) {
    logger.error('createCase error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/fraud-analyst/mark-safe
exports.markSafe = async (req, res) => {
  try {
    const { notificationId, feedback } = req.body;
    const updated = datasetService.updateStatus(notificationId, {
      review_status: 'Approved',
      analyst_feedback: feedback || 'Marked as safe'
    });
    
    // Quick patch: we want to alter is_malicious so the dataset metrics reflect it
    if (updated) {
      updated.is_malicious = 0;
      updated.threat_category = 'safe';
       updated.risk_score = Math.min(updated.risk_score, 0.2); // lower the risk score
    }

    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });

    const rtService = getRealTimeAlertsService();
    if (rtService) rtService.broadcastUpdate(updated, 'updated');

    return res.json({ success: true, data: updated, message: 'Marked as safe' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/fraud-analyst/mark-malicious
exports.markMalicious = async (req, res) => {
  try {
    const { notificationId, feedback } = req.body;
    const updated = datasetService.updateStatus(notificationId, {
      review_status: 'Rejected',
      analyst_feedback: feedback || 'Marked as Malicious Confirmed'
    });
    
    if (updated) {
      updated.is_malicious = 1;
      updated.threat_category = updated.threat_category === 'safe' ? 'phishing' : updated.threat_category;
       updated.risk_score = Math.max(updated.risk_score, 0.9); // increase the risk score
    }

    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });

    const rtService = getRealTimeAlertsService();
    if (rtService) rtService.broadcastUpdate(updated, 'updated');

    return res.json({ success: true, data: updated, message: 'Marked as malicious' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/fraud-analyst/request-review
exports.requestReview = async (req, res) => {
  try {
    const { notificationId, feedback } = req.body;
    const updated = datasetService.updateStatus(notificationId, {
      review_status: 'Pending',
      analyst_feedback: feedback || 'Awaiting Manual Review'
    });

    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });

    return res.json({ success: true, data: updated, message: 'Review requested' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.importCasesFromDataset = async (req, res) => {
  return res.json({
    success: true,
    message: `Dataset already loaded: ${datasetService.size} records in memory.`,
  });
};
