const datasetService = require('./datasetService');
const { detectThreat } = require('../utils/threatDetector');
const { analyzeNotification } = require('./aiService');
const { processNotification } = require('./autonomousAgent');
const logger = require('../utils/logger');

function createLegacyId() {
  return `A${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function normalizeTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toAlertResponse(alert) {
  const raw = alert;
  const id = raw.notification_id || raw.id || `A${Date.now()}`;

  return {
    id,
    type: raw.threat_category || 'threat',
    severity: raw.risk_score > 0.7 ? 'critical' : raw.risk_score > 0.4 ? 'high' : 'medium',
    message: raw.content || raw.message || '',
    status: raw.review_status || 'pending',
    timestamp: normalizeTimestamp(raw.timestamp),
    acknowledged: raw.review_status === 'Approved',
    notification_id: raw.notification_id || '',
    details: {
      sender: raw.sender,
      receiver: raw.receiver,
      department: raw.department,
      threat_category: raw.threat_category,
      risk_score: raw.risk_score,
      is_malicious: raw.is_malicious,
      ...raw.details
    } || {},
  };
}

async function buildAlertPayload(payload = {}) {
  if (!payload.message || typeof payload.message !== "string") {
    throw new Error("Alert message is required.");
  }

  // Use AI service for analysis
  let aiAnalysis = { riskScore: 0, explanation: [], source: 'none' };
  try {
    aiAnalysis = await analyzeNotification(payload);
  } catch (error) {
    console.warn('AI analysis failed, using basic detection:', error.message);
  }

  // Convert AI risk score to severity
  let detectedSeverity = 'low';
  if (aiAnalysis.riskScore >= 70) {
    detectedSeverity = 'critical';
  } else if (aiAnalysis.riskScore >= 50) {
    detectedSeverity = 'high';
  } else if (aiAnalysis.riskScore >= 30) {
    detectedSeverity = 'medium';
  }

  // Fallback to basic detection if AI fails
  if (aiAnalysis.source === 'emergency_fallback') {
    detectedSeverity = detectThreat(payload);
  }

  return {
    legacyId: payload.id || payload.legacyId || createLegacyId(),
    type: payload.type || "new_threat",
    severity: payload.severity || detectedSeverity,
    message: payload.message.trim(),
    status: payload.status || (payload.acknowledged ? "acknowledged" : "pending"),
    timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    notification_id: payload.notification_id || null,
    details: {
      ...payload.details,
      aiAnalysis: aiAnalysis,
      riskScore: aiAnalysis.riskScore,
      explanation: aiAnalysis.explanation,
      analysisSource: aiAnalysis.source
    },
  };
}

async function getAlerts(options = {}) {
  try {
    const {
      page = 1,
      limit = 50,
      severity,
      status,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = options;

    // Build filters for datasetService
    const filters = {};
    
    if (severity) {
      if (severity === 'critical') {
        filters.min_risk_score = 0.7;
      } else if (severity === 'high') {
        filters.min_risk_score = 0.4;
        filters.max_risk_score = 0.7;
      } else if (severity === 'medium') {
        filters.min_risk_score = 0.2;
        filters.max_risk_score = 0.4;
      } else if (severity === 'low') {
        filters.max_risk_score = 0.2;
      }
    }
    
    if (status) {
      filters.review_status = status === 'acknowledged' ? 'Approved' : status;
    }
    
    if (search) {
      filters.search = search;
    }

    // Use datasetService to get alerts
    const result = datasetService.query(filters, { 
      page, 
      limit, 
      sortBy, 
      sortOrder 
    });

    // Convert dataset format to alert response format
    const alerts = result.data.map(alert => toAlertResponse(alert));

    return {
      success: true,
      data: alerts,
      pagination: {
        ...result.pagination,
        totalPages: result.pagination.pages
      }
    };
  } catch (error) {
    logger.error('Failed to get alerts:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
    };
  }
}

async function getAlertById(id) {
  try {
    // Use datasetService to find by notification_id
    const alert = datasetService.getById(id);
    
    if (!alert) {
      return {
        success: false,
        error: 'Alert not found'
      };
    }

    return {
      success: true,
      data: toAlertResponse(alert)
    };
  } catch (error) {
    logger.error('Failed to get alert by ID:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function createAlert(payload, io = null) {
  try {
    const alertPayload = await buildAlertPayload(payload);
    
    // In dataset-only mode, we can't create new records
    // This would be implemented if datasetService had an insert method
    logger.warn('Create alert not supported in dataset-only mode');
    
    return {
      success: false,
      error: 'Alert creation not supported in dataset-only mode'
    };
  } catch (error) {
    logger.error('Failed to create alert:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function acknowledgeAlert(alertId) {
  try {
    // Use datasetService to update status
    const updatedAlert = datasetService.updateStatus(alertId, { 
      review_status: 'Approved',
      analyst_feedback: 'Acknowledged by analyst'
    });
    
    if (!updatedAlert) {
      return {
        success: false,
        error: 'Alert not found'
      };
    }

    return {
      success: true,
      data: toAlertResponse(updatedAlert)
    };
  } catch (error) {
    logger.error('Failed to acknowledge alert:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function updateAlertStatus(alertId, newStatus) {
  try {
    // Map status values
    const statusMap = {
      'pending': 'Pending',
      'acknowledged': 'Approved', 
      'resolved': 'Rejected'
    };
    
    const reviewStatus = statusMap[newStatus] || newStatus;
    
    // Use datasetService to update status
    const updatedAlert = datasetService.updateStatus(alertId, { 
      review_status: reviewStatus,
      analyst_feedback: `Status updated to ${newStatus}`
    });
    
    if (!updatedAlert) {
      return {
        success: false,
        error: 'Alert not found'
      };
    }

    return {
      success: true,
      data: toAlertResponse(updatedAlert)
    };
  } catch (error) {
    logger.error('Failed to update alert status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function getAnalytics() {
  try {
    // Use datasetService to get analytics
    const stats = datasetService.getStats();
    
    return {
      success: true,
      data: {
        totalAlerts: stats.totalAlerts,
        pendingAlerts: stats.pendingReview,
        resolvedAlerts: stats.approvedCount + stats.rejectedCount,
        criticalAlerts: stats.highRiskCount,
        severityBreakdown: stats.threatBreakdown
      }
    };
  } catch (error) {
    logger.error('Failed to get analytics:', error);
    return {
      success: false,
      error: error.message,
      data: {
        totalAlerts: 0,
        pendingAlerts: 0,
        resolvedAlerts: 0,
        criticalAlerts: 0,
        severityBreakdown: []
      }
    };
  }
}
module.exports = {
  acknowledgeAlert,
  createAlert,
  getAlerts,
  toAlertResponse,
  updateAlertStatus,
  getAnalytics
};
