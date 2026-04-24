/**
 * ARGUS Autonomous Security Agent
 * 
 * Intelligent threat detection and automated response system
 * Uses datasetService instead of MongoDB
 */

const datasetService = require("./datasetService");
const { analyzeNotification } = require("./aiService");
const { policyEngine } = require("./policyEngine");
const logger = require("../utils/logger");

// Agent configuration
const AGENT_CONFIG = {
  enabled: process.env.AUTONOMOUS_MODE === 'true',
  riskThresholds: {
    critical: parseInt(process.env.RISK_THRESHOLD_CRITICAL) || 90,
    high: parseInt(process.env.RISK_THRESHOLD_HIGH) || 70,
    medium: parseInt(process.env.RISK_THRESHOLD_MEDIUM) || 30
  },
  maxAutoActions: parseInt(process.env.MAX_AUTO_ACTIONS_PER_HOUR) || 100,
  cooldownMinutes: parseInt(process.env.AGENT_COOLDOWN_MINUTES) || 5
};

// Agent state tracking
let agentStats = {
  totalProcessed: 0,
  actionsTaken: 0,
  threatsBlocked: 0,
  lastActionTime: null,
  hourlyActionCount: 0,
  lastHourReset: new Date()
};

/**
 * Evaluate threat and determine appropriate action
 * @param {Object} notification - Notification data
 * @returns {Object} Evaluation result with action decision
 */
async function evaluateThreat(notification) {
  try {
    logger.info(`Agent evaluating threat: ${notification.id || 'unknown'}`);
    
    // Get AI analysis
    const analysis = await analyzeNotification(notification);
    const riskScore = analysis.riskScore;
    
    // Determine action based on risk score
    const action = decideAction(riskScore, notification);
    
    // Log evaluation
    const evaluation = {
      notificationId: notification.id || notification._id,
      timestamp: new Date(),
      riskScore,
      analysis,
      recommendedAction: action.type,
      confidence: analysis.confidence,
      source: analysis.source
    };
    
    logger.info(`Threat evaluation complete: ${JSON.stringify(evaluation)}`);
    
    return {
      success: true,
      evaluation,
      action
    };
    
  } catch (error) {
    logger.error('Threat evaluation failed:', error);
    return {
      success: false,
      error: error.message,
      action: { type: 'none', reason: 'Evaluation failed' }
    };
  }
}

/**
 * Decide action based on risk score and context
 * @param {number} riskScore - Risk score (0-100)
 * @param {Object} notification - Notification context
 * @returns {Object} Action decision
 */
function decideAction(riskScore, notification) {
  const { critical, high } = AGENT_CONFIG.riskThresholds;
  
  // Critical risk - immediate automated response
  if (riskScore >= critical) {
    return {
      type: 'auto_block',
      priority: 'critical',
      actions: [
        'block_sender',
        'mute_domain',
        'create_incident',
        'notify_admin'
      ],
      reason: `Critical risk score (${riskScore}) detected`,
      autoExecute: true
    };
  }
  
  // High risk - escalate to analyst
  if (riskScore >= high) {
    return {
      type: 'escalate',
      priority: 'high',
      actions: [
        'create_case',
        'notify_analyst',
        'mark_for_review'
      ],
      reason: `High risk score (${riskScore}) requires human review`,
      autoExecute: true
    };
  }
  
  // Medium/low risk - mark as safe
  return {
    type: 'mark_safe',
    priority: 'low',
    actions: [
      'mark_safe',
      'archive'
    ],
    reason: `Low risk score (${riskScore}) - no action needed`,
    autoExecute: true
  };
}

/**
 * Execute automated actions
 * @param {Object} action - Action decision
 * @param {Object} notification - Notification data
 * @returns {Object} Execution results
 */
async function executeAction(action, notification) {
  const results = [];
  const executionLog = {
    timestamp: new Date(),
    action: action.type,
    notificationId: notification.id || notification._id,
    actionsExecuted: [],
    errors: []
  };
  
  try {
    // Check if agent is enabled
    if (!AGENT_CONFIG.enabled) {
      return {
        success: false,
        reason: 'Autonomous mode is disabled',
        executionLog
      };
    }
    
    // Check rate limits
    if (!checkRateLimit()) {
      return {
        success: false,
        reason: 'Agent rate limit exceeded',
        executionLog
      };
    }
    
    // Execute each action
    for (const actionType of action.actions) {
      try {
        const result = await executeIndividualAction(actionType, action, notification);
        results.push(result);
        executionLog.actionsExecuted.push({
          action: actionType,
          success: result.success,
          details: result.details
        });
        
        if (result.success) {
          agentStats.actionsTaken++;
          if (actionType === 'block_sender' || actionType === 'mute_domain') {
            agentStats.threatsBlocked++;
          }
        }
        
      } catch (error) {
        logger.error(`Action ${actionType} failed:`, error);
        executionLog.errors.push({
          action: actionType,
          error: error.message
        });
      }
    }
    
    agentStats.lastActionTime = new Date();
    
    return {
      success: true,
      results,
      executionLog
    };
    
  } catch (error) {
    logger.error('Action execution failed:', error);
    return {
      success: false,
      error: error.message,
      executionLog
    };
  }
}

/**
 * Execute individual action types
 * @param {string} actionType - Type of action
 * @param {Object} action - Action context
 * @param {Object} notification - Notification data
 * @returns {Object} Action result
 */
async function executeIndividualAction(actionType, action, notification) {
  switch (actionType) {
    case 'block_sender':
      return await blockSender(notification);
    case 'mute_domain':
      return await muteDomain(notification);
    case 'create_incident':
      return await createIncident(notification, action);
    case 'create_case':
      return await createCase(notification, action);
    case 'notify_admin':
      return await notifyAdmin(notification, action);
    case 'notify_analyst':
      return await notifyAnalyst(notification, action);
    case 'mark_safe':
      return await markSafe(notification);
    case 'archive':
      return await archiveNotification(notification);
    default:
      return { success: false, details: `Unknown action: ${actionType}` };
  }
}

/**
 * Block sender email/domain
 * @param {Object} notification - Notification data
 * @returns {Object} Block result
 */
async function blockSender(notification) {
  try {
    const sender = notification.sender || notification.from;
    if (!sender) {
      return { success: false, details: 'No sender information available' };
    }
    
    // In a real system, this would integrate with email security systems
    // For now, we'll log the action and update the notification using datasetService
    const dataset = datasetService.query({ notification_id: notification.notification_id }, { limit: 1 });
    
    if (dataset.data.length > 0) {
      const updatedNotification = dataset.data[0];
      updatedNotification.action_log = updatedNotification.action_log || [];
      updatedNotification.action_log.push({
        type: 'sender_block',
        timestamp: new Date(),
        details: 'Automated threat detection'
      });
      
      // Update dataset (in real system, this would update database)
      logger.info(`Agent action executed: block_sender for notification ${notification.id}`);
    }
    
    // Update notification with block action
    logger.info(`Agent action executed: block_sender for notification ${notification.id}`);
    
    return { 
      success: true, 
      details: `Sender ${sender} blocked successfully` 
    };
  } catch (error) {
    logger.error('Block sender failed:', error);
    return { success: false, details: error.message };
  }
}

/**
 * Mute malicious domain
 * @param {Object} notification - Notification data
 * @returns {Object} Mute result
 */
async function muteDomain(notification) {
  try {
    const sender = notification.sender || notification.from;
    if (!sender) {
      return { success: false, details: 'No sender information available' };
    }
    
    // Extract domain from email
    const domain = sender.includes('@') ? sender.split('@')[1] : sender;
    
    // Use datasetService instead of MongoDB
    const dataset = datasetService.query({ notification_id: notification.notification_id }, { limit: 1 });
    if (dataset.data.length > 0) {
      const updatedNotification = dataset.data[0];
      updatedNotification.action_log = updatedNotification.action_log || [];
      updatedNotification.action_log.push({
        type: 'domain_mute',
        timestamp: new Date(),
        details: `Domain ${domain} muted`
      });
      
      // Update dataset (in real system, this would update database)
      logger.info(`Agent action executed: mute_domain for notification ${notification.id}`);
    }
    
    // Update notification with mute action using datasetService
    const datasetResult = datasetService.query({ notification_id: notification.notification_id }, { limit: 1 });
    if (datasetResult.data.length > 0) {
      const updatedNotification = datasetResult.data[0];
      updatedNotification.action_log = updatedNotification.action_log || [];
      updatedNotification.action_log.push({
        type: 'domain_mute',
        timestamp: new Date(),
        details: `Domain ${domain} muted`
      });
      
      // Update dataset (in real system, this would update database)
      logger.info(`Agent action executed: mute_domain for notification ${notification.id}`);
    }
    
    logger.info(`Domain muted: ${domain}`);
    
    return { 
      success: true, 
      details: `Domain ${domain} muted successfully` 
    };
    
  } catch (error) {
    logger.error('Mute domain failed:', error);
    return { success: false, details: error.message };
  }
}

/**
 * Create security incident
 * @param {Object} notification - Notification data
 * @param {Object} action - Action context
 * @returns {Object} Incident creation result
 */
async function createIncident(notification, action) {
  try {
    // Use datasetService instead of MongoDB
    const dataset = datasetService.query({ notification_id: notification.notification_id }, { limit: 1 });
    
    const incident = {
      id: `INC${Date.now()}`,
      type: 'security_incident',
      severity: 'critical',
      title: `Automated Incident: ${notification.message.substring(0, 50)}...`,
      description: notification.message,
      notificationId: notification.id || notification._id,
      riskScore: action.riskScore || 0,
      source: 'autonomous_agent',
      timestamp: new Date(),
      status: 'open'
    };
    
    // Update notification with incident reference using datasetService
    const incidentDataset = datasetService.query({ notification_id: notification.notification_id }, { limit: 1 });
    if (incidentDataset.data.length > 0) {
      const updatedNotification = incidentDataset.data[0];
      updatedNotification.action_log = updatedNotification.action_log || [];
      updatedNotification.action_log.push({
        type: 'incident_created',
        timestamp: new Date(),
        details: `Incident ${incident.id} created`
      });
      updatedNotification.incidentId = incident.id;
      updatedNotification.autoActionTaken = true;
      
      // Update dataset (in real system, this would update database)
      logger.info(`Agent action executed: create_incident for notification ${notification.id}`);
    }
    
    return { 
      success: true, 
      details: `Incident ${incident.id} created successfully`,
      incidentId: incident.id
    };
    
  } catch (error) {
    logger.error('Create incident failed:', error);
    return { success: false, details: error.message };
  }
}

/**
 * Create case for analyst review
 * @param {Object} notification - Notification data
 * @param {Object} action - Action context
 * @returns {Object} Case creation result
 */
async function createCase(notification, action) {
  try {
    // Use datasetService instead of MongoDB
    const dataset = datasetService.query({ notification_id: notification.notification_id }, { limit: 1 });
    
    const caseRecord = {
      id: `CASE${Date.now()}`,
      type: 'review_case',
      severity: 'high',
      title: `Review Required: ${notification.message.substring(0, 50)}...`,
      description: notification.message,
      notificationId: notification.id || notification._id,
      riskScore: action.riskScore || 0,
      source: 'autonomous_agent',
      timestamp: new Date(),
      status: 'pending_review',
      assignedTo: null
    };
    
    // Update notification with case reference using datasetService
    const caseDataset = datasetService.query({ notification_id: notification.notification_id }, { limit: 1 });
    if (caseDataset.data.length > 0) {
      const updatedNotification = caseDataset.data[0];
      updatedNotification.action_log = updatedNotification.action_log || [];
      updatedNotification.action_log.push({
        type: 'case_created',
        timestamp: new Date(),
        details: `Case ${caseRecord.id} created`
      });
      updatedNotification.caseId = caseRecord.id;
      updatedNotification.autoActionTaken = true;
      
      // Update dataset (in real system, this would update database)
      logger.info(`Agent action executed: create_case for notification ${notification.id}`);
    }
    
    logger.info(`Agent action executed: create_case for notification ${notification.id}`);
    
    return { 
      success: true, 
      details: `Case ${caseRecord.id} created for review`,
      caseId: caseRecord.id
    };
    
  } catch (error) {
    logger.error('Create case failed:', error);
    return { success: false, details: error.message };
  }
}

/**
 * Notify administrator
 * @param {Object} notification - Notification data
 * @param {Object} action - Action context
 * @returns {Object} Notification result
 */
async function notifyAdmin(notification, action) {
  try {
    // In a real system, this would send email, SMS, or push notification
    const adminNotification = {
      type: 'admin_alert',
      title: 'ARGUS Agent Alert',
      message: `Critical threat detected and action taken: ${notification.message}`,
      severity: 'critical',
      timestamp: new Date(),
      notificationId: notification.id || notification._id,
      action: action.type
    };
    
    logger.info(`Admin notification sent for: ${notification.id}`);
    
    return { 
      success: true, 
      details: 'Administrator notified successfully' 
    };
    
  } catch (error) {
    logger.error('Admin notification failed:', error);
    return { success: false, details: error.message };
  }
}

/**
 * Notify analyst
 * @param {Object} notification - Notification data
 * @param {Object} action - Action context
 * @returns {Object} Notification result
 */
async function notifyAnalyst(notification, action) {
  try {
    // In a real system, this would create analyst task or send notification
    const analystNotification = {
      type: 'analyst_alert',
      title: 'Review Required',
      message: `High risk notification requires review: ${notification.message}`,
      severity: 'high',
      timestamp: new Date(),
      notificationId: notification.id || notification._id,
      action: action.type
    };
    
    logger.info(`Analyst notification sent for: ${notification.id}`);
    
    return { 
      success: true, 
      details: 'Analyst notified successfully' 
    };
    
  } catch (error) {
    logger.error('Analyst notification failed:', error);
    return { success: false, details: error.message };
  }
}

/**
 * Mark notification as safe
 * @param {Object} notification - Notification data
 * @returns {Object} Mark safe result
 */
async function markSafe(notification) {
  try {
    // Use datasetService to update the notification
    const dataset = datasetService.query({ notification_id: notification.notification_id }, { limit: 1 });
    if (dataset.data.length > 0) {
      const updatedNotification = dataset.data[0];
      updatedNotification.review_status = 'Approved';
      updatedNotification.analyst_feedback = 'Automated: Marked as safe by agent';
      
      // Update dataset (in real system, this would update database)
      logger.info(`Agent action executed: mark_safe for notification ${notification.id}`);
    }

    logger.info(`Notification marked as safe: ${notification.id}`);
    
    return { 
      success: true, 
      details: 'Notification marked as safe' 
    };
    
  } catch (error) {
    logger.error('Mark safe failed:', error);
    return { success: false, details: error.message };
  }
}

/**
 * Archive notification
 * @param {Object} notification - Notification data
 * @returns {Object} Archive result
 */
async function archiveNotification(notification) {
  try {
    // Use datasetService instead of MongoDB
    const dataset = datasetService.query({ notification_id: notification.notification_id }, { limit: 1 });
    if (dataset.data.length > 0) {
      const updatedNotification = dataset.data[0];
      updatedNotification.status = 'resolved';
      // Update dataset (in real system, this would update database)
      logger.info(`Agent action executed: archive for notification ${notification.id}`);
    }
    
    return { 
      success: true, 
      details: 'Notification archived successfully'
    };
  } catch (error) {
    logger.error('Archive failed:', error);
    return { success: false, details: error.message };
  }
}

/**
 * Check rate limits for agent actions
 * @returns {boolean} True if within limits
 */
function checkRateLimit() {
  const now = new Date();
  
  // Reset hourly counter if needed
  if (now.getHours() !== agentStats.lastHourReset.getHours()) {
    agentStats.hourlyActionCount = 0;
    agentStats.lastHourReset = now;
  }
  
  // Check if under hourly limit
  if (agentStats.hourlyActionCount >= AGENT_CONFIG.maxAutoActions) {
    logger.warn('Agent rate limit exceeded');
    return false;
  }
  
  // Check cooldown period
  if (agentStats.lastActionTime) {
    const timeSinceLastAction = now - agentStats.lastActionTime;
    const cooldownMs = AGENT_CONFIG.cooldownMinutes * 60 * 1000;
    
    if (timeSinceLastAction < cooldownMs) {
      logger.warn('Agent cooldown period active');
      return false;
    }
  }
  
  return true;
}

/**
 * Helper method to extract domain from email
 */
function extractDomain(email) {
  if (!email || typeof email !== 'string') return null;
  const match = email.match(/@([^@]+)$/);
  return match ? match[1] : null;
}

/**
 * Process notification through autonomous agent with policy engine integration
 * @param {Object} notification - Notification data
 * @param {Object} io - Socket.io instance (optional)
 * @returns {Object} Processing result
 */
async function processNotification(notification, io = null) {
  try {
    agentStats.totalProcessed++;
    
    logger.info(`Agent processing notification: ${notification.id || 'unknown'}`);
    
    // Evaluate threat
    const evaluation = await evaluateThreat(notification);
    
    if (!evaluation.success) {
      return {
        success: false,
        error: evaluation.error,
        agentStats
      };
    }
    
    // Prepare context for policy engine
    const policyContext = {
      notificationId: notification.id || notification._id,
      riskScore: evaluation.evaluation.riskScore,
      riskLevel: evaluation.evaluation.riskLevel,
      department: notification.department || 'Unknown',
      attackType: evaluation.evaluation.attackType || 'unknown',
      sender: notification.sender || notification.senderEmail,
      senderDomain: extractDomain(notification.sender || notification.senderEmail),
      message: notification.message,
      timestamp: new Date()
    };
    
    // Evaluate policies
    const policyResult = await policyEngine.evaluatePolicies(policyContext);
    
    let executionResult = null;
    let policyExecutionResults = [];
    
    // Execute actions based on either policies or built-in logic
    if (policyResult.success && policyResult.matchingPolicies.length > 0) {
      // Use policy-based actions
      policyExecutionResults = await policyEngine.executePolicies(policyContext, policyResult.matchingPolicies);
      
      executionResult = {
        success: true,
        source: 'policy_engine',
        policiesExecuted: policyResult.matchingPolicies.length,
        actionsExecuted: policyExecutionResults
      };
      
      logger.info(`Executed ${policyResult.matchingPolicies.length} policies for notification ${notification.id}`);
    } else if (evaluation.action.autoExecute) {
      // Fallback to built-in autonomous actions
      executionResult = await executeAction(evaluation.action, notification);
      
      executionResult.source = 'autonomous_agent';
      logger.info(`Executed autonomous actions for notification ${notification.id}`);
    } else {
      executionResult = {
        success: true,
        source: 'none',
        message: 'No actions executed'
      };
    }
    
    // Update alert with policy execution information using datasetService
    if (notification.notification_id && policyExecutionResults.length > 0) {
      try {
        const policyDataset = datasetService.query({ notification_id: notification.notification_id }, { limit: 1 });
        if (policyDataset.data.length > 0) {
          const updatedNotification = policyDataset.data[0];
          updatedNotification.action_log = updatedNotification.action_log || [];
          updatedNotification.action_log.push({
            type: 'policy_execution',
            timestamp: new Date(),
            policies: policyResult.matchingPolicies.map(p => ({
              id: p._id || p.id,
              name: p.name,
              category: p.category
            })),
            results: policyExecutionResults
          });
          updatedNotification.lastPolicyEvaluation = new Date();
        }
      } catch (updateError) {
        logger.warn('Failed to update alert with policy execution info:', updateError.message);
      }
    }
    
    // Emit real-time updates
    if (io && executionResult.success) {
      try {
        const socketHandler = require('./agentSocketHandler').getAgentSocketHandler();
        if (socketHandler) {
          socketHandler.broadcastAgentAction({
            notificationId: notification.id || notification._id,
            evaluation: evaluation.evaluation,
            execution: executionResult,
            policyEvaluation: policyResult,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        logger.warn('Failed to broadcast agent action:', socketError.message);
      }
    }
    
    return {
      success: true,
      evaluation: evaluation.evaluation,
      execution: executionResult,
      policyEvaluation: policyResult,
      agentStats
    };
    
  } catch (error) {
    logger.error('Process notification failed:', error);
    return {
      success: false,
      error: error.message,
      agentStats
    };
  }
}

/**
 * Get current agent statistics
 * @returns {Object} Agent statistics
 */
function getAgentStats() {
  return {
    ...agentStats,
    config: AGENT_CONFIG,
    uptime: process.uptime(),
    lastHourReset: agentStats.lastHourReset
  };
}

/**
 * Update agent configuration
 * @param {Object} newConfig - New configuration
 * @returns {Object} Updated configuration
 */
function updateAgentConfig(newConfig) {
  if (newConfig.enabled !== undefined) {
    AGENT_CONFIG.enabled = newConfig.enabled;
    process.env.AUTONOMOUS_MODE = newConfig.enabled.toString();
  }
  
  if (newConfig.riskThresholds) {
    Object.assign(AGENT_CONFIG.riskThresholds, newConfig.riskThresholds);
  }
  
  if (newConfig.maxAutoActions !== undefined) {
    AGENT_CONFIG.maxAutoActions = newConfig.maxAutoActions;
    process.env.MAX_AUTO_ACTIONS_PER_HOUR = newConfig.maxAutoActions.toString();
  }
  
  logger.info('Agent configuration updated:', AGENT_CONFIG);
  
  return AGENT_CONFIG;
}

/**
 * Get agent activity log
 * @param {Object} options - Query options
 * @returns {Object} Activity log
 */
async function getActivityLog(options = {}) {
  try {
    const {
      limit = 50,
      page = parseInt(options.page) || 1
    } = options;
    
    // Create mock activity log from dataset
    const dataset = datasetService.query({}, { limit: 1000 });
    const activities = dataset.data.map((alert, index) => ({
      id: `ACT${Date.now()}_${index}`,
      type: 'agent_action',
      action: 'process_notification',
      notificationId: alert.notification_id,
      riskScore: alert.risk_score,
      timestamp: alert.timestamp,
      details: {
        processed: true,
        riskLevel: alert.risk_score > 0.7 ? 'high' : alert.risk_score > 0.4 ? 'medium' : 'low'
      }
    }));
    
    const skip = (page - 1) * limit;
    const paginatedActivities = activities.slice(skip, skip + limit);
    
    return {
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          page,
          limit,
          total: activities.length,
          hasMore: skip + limit < activities.length
        }
      }
    };
    
  } catch (error) {
    logger.error('Get activity log failed:', error);
    return {
      success: false,
      error: 'Failed to retrieve activity log'
    };
  }
}

module.exports = {
  evaluateThreat,
  decideAction,
  executeAction,
  processNotification,
  getAgentStats,
  updateAgentConfig,
  getActivityLog
};
