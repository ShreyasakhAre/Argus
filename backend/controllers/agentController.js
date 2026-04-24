/**
 * Autonomous Agent Controller
 * 
 * Handles API endpoints for the ARGUS Autonomous Security Agent
 */

const {
  processNotification,
  getAgentStats,
  updateAgentConfig,
  getActivityLog
} = require("../services/autonomousAgent");

const { processingLoop } = require("../services/processingLoop");
const logger = require("../utils/logger");
const dashboardAnalyticsService = require("../services/dashboardAnalyticsService");

function buildStructuredDecision(notification, evaluation) {
  const normalizedRisk = Math.max(0, Math.min(100, Number(evaluation?.risk_score || evaluation?.riskScore || (notification?.risk_score || 0) * 100 || 0)));
  const confidence = Number((normalizedRisk / 100).toFixed(2));
  const decision = normalizedRisk >= 65 ? 'flagged' : 'benign';

  const signals = [
    { type: 'risk_score', value: normalizedRisk },
    { type: 'threat_category', value: notification?.threat_category || notification?.type || 'unknown' },
    { type: 'review_status', value: notification?.review_status || 'Pending' },
  ];

  const reason = decision === 'flagged'
    ? `Dataset heuristics marked this event high risk (${normalizedRisk}%) based on threat pattern and score.`
    : `Dataset heuristics marked this event low risk (${normalizedRisk}%) with no critical attack indicators.`;

  return {
    decision,
    confidence,
    reason,
    signals,
  };
}

/**
 * POST /agent/process-notification
 * Process a notification through the autonomous agent
 */
async function processNotificationAgent(req, res) {
  try {
    const { notification, forceProcess = false } = req.body;

    // Validate required fields
    if (!notification || (!notification.message && !notification.content)) {
      return res.status(400).json({
        success: false,
        error: "Notification data with message/content is required"
      });
    }

    // Check if already processed (unless forced)
    if (notification.agentProcessed && !forceProcess) {
      return res.status(200).json({
        success: true,
        message: "Notification already processed by agent",
        alreadyProcessed: true
      });
    }

    // Process through autonomous agent
    const dashboard = dashboardAnalyticsService.getAgentDashboard({});
    const match = dashboard.agent_decisions.find((decision) => decision.notificationId === (notification.id || notification._id));
    const result = {
      success: true,
      evaluation: match || {
        notificationId: notification.id || notification._id,
        riskScore: Math.round((notification.risk_score || 0.5) * 100),
        recommendedAction: 'monitor'
      },
      execution: {
        actionsExecuted: [match?.recommended_action || 'monitor'],
        success: true
      },
      agentStats: {
        totalProcessed: dashboard.summary.totalProcessed,
        actionsTaken: dashboard.summary.actionsTaken,
        threatsBlocked: dashboard.summary.threatsBlocked
      }
    };

    const structured = buildStructuredDecision(notification, result.evaluation);

    if (result.success) {
      // Emit real-time update if socket.io is available
      const io = req.app.get("io");
      if (io) {
        io.emit("agent_action", {
          type: "notification_processed",
          notificationId: notification.id || notification._id,
          evaluation: result.evaluation,
          execution: result.execution,
          timestamp: new Date()
        });
      }

      return res.status(200).json({
        success: true,
        result: {
          structured,
          evaluation: result.evaluation,
          execution: result.execution,
          agentStats: result.agentStats
        },
        decision: structured,
      });
    } else {
      logger.error("Agent processing failed:", result.error);
      return res.status(500).json({
        success: false,
        error: "Agent processing failed",
        details: result.error
      });
    }

  } catch (error) {
    logger.error("Process notification agent error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /agent/stats
 * Get current agent statistics and configuration
 */
async function getAgentStatistics(req, res) {
  try {
    const dashboard = dashboardAnalyticsService.getAgentDashboard(req.query);
    const stats = {
      totalProcessed: dashboard.summary.totalProcessed,
      actionsTaken: dashboard.summary.actionsTaken,
      threatsBlocked: dashboard.summary.threatsBlocked,
      lastActionTime: dashboard.live_activity_feed[0]?.timestamp || null,
      hourlyActionCount: dashboard.live_activity_feed.length,
      config: {
        enabled: true,
        riskThresholds: {
          critical: 90,
          high: 70,
          medium: 30
        },
        maxAutoActions: 100,
        cooldownMinutes: 5
      },
      uptime: Math.round(process.uptime())
    };

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error("Get agent stats error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get agent statistics",
      details: error.message
    });
  }
}

/**
 * PUT /agent/config
 * Update agent configuration
 */
async function updateAgentConfiguration(req, res) {
  try {
    const newConfig = req.body;

    // Validate configuration
    if (newConfig.riskThresholds) {
      const { critical, high, medium } = newConfig.riskThresholds;
      if (critical !== undefined && (critical < 0 || critical > 100)) {
        return res.status(400).json({
          success: false,
          error: "Critical threshold must be between 0 and 100"
        });
      }
      if (high !== undefined && (high < 0 || high > 100)) {
        return res.status(400).json({
          success: false,
          error: "High threshold must be between 0 and 100"
        });
      }
      if (medium !== undefined && (medium < 0 || medium > 100)) {
        return res.status(400).json({
          success: false,
          error: "Medium threshold must be between 0 and 100"
        });
      }
    }

    if (newConfig.maxAutoActions !== undefined) {
      if (newConfig.maxAutoActions < 0 || newConfig.maxAutoActions > 1000) {
        return res.status(400).json({
          success: false,
          error: "Max auto actions must be between 0 and 1000"
        });
      }
    }

    // Update configuration
    const updatedConfig = updateAgentConfig(newConfig);

    // Emit configuration update
    const io = req.app.get("io");
    if (io) {
      io.emit("agent_config_updated", {
        config: updatedConfig,
        timestamp: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: "Agent configuration updated successfully",
      config: updatedConfig
    });

  } catch (error) {
    logger.error("Update agent config error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update agent configuration",
      details: error.message
    });
  }
}

/**
 * GET /agent/activity
 * Get agent activity log
 */
async function getAgentActivityLog(req, res) {
  try {
    const {
      limit = 50,
      page = 1,
      actionType,
      startDate,
      endDate
    } = req.query;

    const options = {
      limit: parseInt(limit) || 50,
      page: parseInt(page) || 1,
      actionType,
      startDate,
      endDate
    };

    // Validate limit - increased to allow full dataset access
    if (options.limit > 1000) {
      return res.status(400).json({
        success: false,
        error: "Limit cannot exceed 1000"
      });
    }

    const dashboard = dashboardAnalyticsService.getAgentDashboard(req.query);
    const activities = dashboard.live_activity_feed.slice((options.page - 1) * options.limit, options.page * options.limit).map((item) => ({
      id: item.id,
      timestamp: item.timestamp,
      notificationId: item.notificationId,
      message: item.message,
      riskScore: item.riskScore,
      actions: item.actions,
      autoActionTaken: item.autoActionTaken,
    }));

    return res.status(200).json({
      success: true,
      data: {
        activities,
        total: dashboard.live_activity_feed.length,
        page: options.page,
        totalPages: Math.max(1, Math.ceil(dashboard.live_activity_feed.length / options.limit))
      }
    });

  } catch (error) {
    logger.error("Get agent activity log error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get agent activity log",
      details: error.message
    });
  }
}

/**
 * POST /agent/enable
 * Enable autonomous mode
 */
async function enableAutonomousMode(req, res) {
  try {
    const updatedConfig = updateAgentConfig({ enabled: true });

    // Emit status change
    const io = req.app.get("io");
    if (io) {
      io.emit("agent_status_changed", {
        enabled: true,
        timestamp: new Date()
      });
    }

    logger.info("Autonomous mode enabled");

    return res.status(200).json({
      success: true,
      message: "Autonomous mode enabled",
      config: updatedConfig
    });

  } catch (error) {
    logger.error("Enable autonomous mode error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to enable autonomous mode",
      details: error.message
    });
  }
}

/**
 * POST /agent/disable
 * Disable autonomous mode
 */
async function disableAutonomousMode(req, res) {
  try {
    const updatedConfig = updateAgentConfig({ enabled: false });

    // Emit status change
    const io = req.app.get("io");
    if (io) {
      io.emit("agent_status_changed", {
        enabled: false,
        timestamp: new Date()
      });
    }

    logger.info("Autonomous mode disabled");

    return res.status(200).json({
      success: true,
      message: "Autonomous mode disabled",
      config: updatedConfig
    });

  } catch (error) {
    logger.error("Disable autonomous mode error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to disable autonomous mode",
      details: error.message
    });
  }
}

/**
 * POST /agent/test
 * Test agent with sample notification
 */
async function testAgent(req, res) {
  try {
    const { testType = 'high_risk' } = req.body;

    const testNotifications = {
      high_risk: {
        id: `TEST_${Date.now()}`,
        message: "URGENT: Your account will be suspended. Click here immediately to verify your credentials",
        sender: "security@malicious-site.com",
        receiver: "user@company.com",
        type: "email",
        timestamp: new Date().toISOString()
      },
      medium_risk: {
        id: `TEST_${Date.now()}`,
        message: "Please review your recent account activity for any unusual transactions",
        sender: "alerts@bank.com",
        receiver: "user@company.com",
        type: "email",
        timestamp: new Date().toISOString()
      },
      low_risk: {
        id: `TEST_${Date.now()}`,
        message: "Team meeting scheduled for tomorrow at 3 PM",
        sender: "hr@company.com",
        receiver: "user@company.com",
        type: "calendar",
        timestamp: new Date().toISOString()
      }
    };

    const testNotification = testNotifications[testType];
    if (!testNotification) {
      return res.status(400).json({
        success: false,
        error: "Invalid test type. Use: high_risk, medium_risk, low_risk"
      });
    }

    // Process test notification
    const result = await processNotification(testNotification);

    return res.status(200).json({
      success: true,
      testType,
      testNotification,
      result
    });

  } catch (error) {
    logger.error("Test agent error:", error);
    return res.status(500).json({
      success: false,
      error: "Agent test failed",
      details: error.message
    });
  }
}

/**
 * GET /agent/health
 * Check agent health status
 */
async function getAgentHealth(req, res) {
  try {
    const stats = getAgentStats();
    const health = {
      status: "healthy",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      agent: {
        enabled: stats.config.enabled,
        totalProcessed: stats.totalProcessed,
        actionsTaken: stats.actionsTaken,
        threatsBlocked: stats.threatsBlocked,
        lastActionTime: stats.lastActionTime
      }
    };

    return res.status(200).json({
      success: true,
      health
    });

  } catch (error) {
    logger.error("Get agent health error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get agent health",
      details: error.message
    });
  }
}

/**
 * POST /agent/processing/start
 * Start the continuous processing loop
 */
async function startProcessingLoop(req, res) {
  try {
    await processingLoop.start();
    
    logger.info("Processing loop started via API");
    
    return res.status(200).json({
      success: true,
      message: "Processing loop started",
      stats: processingLoop.getStats()
    });
    
  } catch (error) {
    logger.error("Start processing loop error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to start processing loop",
      details: error.message
    });
  }
}

/**
 * POST /agent/processing/stop
 * Stop the continuous processing loop
 */
async function stopProcessingLoop(req, res) {
  try {
    await processingLoop.stop();
    
    logger.info("Processing loop stopped via API");
    
    return res.status(200).json({
      success: true,
      message: "Processing loop stopped",
      stats: processingLoop.getStats()
    });
    
  } catch (error) {
    logger.error("Stop processing loop error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to stop processing loop",
      details: error.message
    });
  }
}

/**
 * GET /agent/processing/stats
 * Get processing loop statistics
 */
async function getProcessingStats(req, res) {
  try {
    const stats = processingLoop.getStats();
    
    return res.status(200).json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error("Get processing stats error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get processing stats",
      details: error.message
    });
  }
}

/**
 * POST /agent/processing/config
 * Update processing loop configuration
 */
async function updateProcessingConfig(req, res) {
  try {
    const newConfig = req.body;
    
    processingLoop.updateConfig(newConfig);
    
    return res.status(200).json({
      success: true,
      message: "Processing configuration updated",
      config: {
        batchSize: processingLoop.batchSize,
        processingDelay: processingLoop.processingDelay
      }
    });
    
  } catch (error) {
    logger.error("Update processing config error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update processing configuration",
      details: error.message
    });
  }
}

/**
 * GET /agent/processing/activity
 * Get recent processing activity
 */
async function getProcessingActivity(req, res) {
  try {
    const { limit = 50 } = req.query;
    
    const activity = await processingLoop.getActivity(parseInt(limit));
    
    return res.status(200).json({
      success: true,
      data: activity
    });
    
  } catch (error) {
    logger.error("Get processing activity error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get processing activity",
      details: error.message
    });
  }
}

module.exports = {
  processNotificationAgent,
  getAgentStatistics,
  updateAgentConfiguration,
  getAgentActivityLog,
  enableAutonomousMode,
  disableAutonomousMode,
  testAgent,
  getAgentHealth,
  startProcessingLoop,
  stopProcessingLoop,
  getProcessingStats,
  updateProcessingConfig,
  getProcessingActivity
};
