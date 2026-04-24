/**
 * Behavioral Risk Scoring Controller
 * 
 * Handles API endpoints for user security behavior scoring
 */

const {
  updateRiskScore,
  getUserRiskProfile,
  getAllUsersRiskProfile,
  getDepartmentRiskSummary
} = require("../services/behavioralRiskService");

const { riskScoringService } = require("../services/riskScoringService");
const dashboardAnalyticsService = require("../services/dashboardAnalyticsService");

const logger = require("../utils/logger");

function riskScoringSortField(sortBy) {
  const allowed = new Set(['riskScore', 'name', 'email', 'department', 'lastRiskUpdate']);
  return allowed.has(sortBy) ? sortBy : 'riskScore';
}

/**
 * POST /risk/update
 * Update user's risk score based on behavior
 */
async function updateRiskScoreController(req, res) {
  try {
    const { userId, actionType, details = {} } = req.body;

    // Validate required fields
    if (!userId || !actionType) {
      return res.status(400).json({
        success: false,
        error: "userId and actionType are required"
      });
    }

    // Validate action type
    const validActions = ["clicked_suspicious_link", "ignored_warning", "reported_phishing", "marked_safe_correctly"];
    if (!validActions.includes(actionType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action type",
        validActions
      });
    }

    const profiles = dashboardAnalyticsService.buildRiskProfiles({});
    const user = profiles.users.find((item) => item.id === userId || item.email === userId || item.employeeId === userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const scoreChange = actionType === 'clicked_suspicious_link' ? 15 : actionType === 'ignored_warning' ? 10 : actionType === 'reported_phishing' ? -15 : -8;
    const result = {
      success: true,
      userId: user.id,
      email: user.email,
      oldScore: user.riskScore,
      newScore: Math.max(0, Math.min(100, user.riskScore + scoreChange)),
      scoreChange,
      riskLevel: user.riskScore >= 70 ? 'High' : user.riskScore >= 40 ? 'Medium' : 'Low',
      action: actionType
    };

    const io = req.app.get("io");
    if (io) {
      io.emit("risk_score_updated", {
        type: "score_update",
        data: result,
        timestamp: new Date()
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    logger.error("Update risk score controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /risk/profile/:userId
 * Get user's risk profile
 */
async function getUserRiskProfileController(req, res) {
  try {
    const { userId } = req.params;

    const profiles = dashboardAnalyticsService.buildRiskProfiles({});
    const user = profiles.users.find((item) => item.id === userId || item.email === userId || item.employeeId === userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user,
      recentBehavior: user.recentBehavior,
      behaviorStats: {
        totalActions: user.behaviorCount,
        actionCounts: user.recentBehavior.reduce((acc, item) => {
          acc[item.action] = (acc[item.action] || 0) + 1;
          return acc;
        }, {}),
        riskTrend: user.recentBehavior.map((item) => ({ date: item.timestamp, score: item.newScore, action: item.action }))
      }
    });

  } catch (error) {
    logger.error("Get user risk profile controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /risk/users
 * Get all users sorted by risk
 */
async function getAllUsersRiskProfileController(req, res) {
  try {
    const {
      limit = 50,
      page = 1,
      riskLevel,
      department,
      sortBy = 'riskScore',
      sortOrder = 'desc'
    } = req.query;

    const profiles = dashboardAnalyticsService.buildRiskProfiles({});
    let users = profiles.users;
    if (riskLevel) {
      users = users.filter((item) => item.riskLevel.toLowerCase() === String(riskLevel).toLowerCase());
    }
    if (department) {
      users = users.filter((item) => item.department === department);
    }

    const numericLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const numericPage = Math.max(1, parseInt(page) || 1);
    const sortedUsers = [...users].sort((a, b) => {
      const key = riskScoringSortField(sortBy);
      const aValue = a[key];
      const bValue = b[key];
      if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });
    const start = (numericPage - 1) * numericLimit;

    return res.status(200).json({
      success: true,
      users: sortedUsers.slice(start, start + numericLimit),
      total: users.length,
      page: numericPage,
      totalPages: Math.max(1, Math.ceil(users.length / numericLimit))
    });

  } catch (error) {
    logger.error("Get all users risk profile controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /risk/department-summary
 * Get department risk summary
 */
async function getDepartmentRiskSummaryController(req, res) {
  try {
    const profiles = dashboardAnalyticsService.buildRiskProfiles({});
    return res.status(200).json({
      success: true,
      departments: profiles.departments
    });

  } catch (error) {
    logger.error("Get department risk summary controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * POST /risk/simulate
 * Simulate user behavior for demo purposes
 */
async function simulateBehaviorController(req, res) {
  try {
    const { userId, behaviorType, count = 1 } = req.body;

    if (!userId || !behaviorType) {
      return res.status(400).json({
        success: false,
        error: "userId and behaviorType are required"
      });
    }

    const validBehaviors = ["clicked_suspicious_link", "ignored_warning", "reported_phishing", "marked_safe_correctly"];
    if (!validBehaviors.includes(behaviorType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid behavior type",
        validBehaviors
      });
    }

    const results = Array.from({ length: count }, (_, index) => ({
      success: true,
      userId,
      behaviorType,
      scoreChange: behaviorType === 'reported_phishing' ? -15 : behaviorType === 'marked_safe_correctly' ? -8 : behaviorType === 'clicked_suspicious_link' ? 15 : 10,
      simulationIndex: index + 1,
      timestamp: new Date()
    }));

    // Emit real-time updates
    const io = req.app.get("io");
    if (io) {
      io.emit("risk_simulation_completed", {
        type: "simulation",
        userId,
        behaviorType,
        count,
        results,
        timestamp: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: `Simulated ${count} ${behaviorType} actions`,
      results
    });

  } catch (error) {
    logger.error("Simulate behavior controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /risk/leaderboard
 * Get risk leaderboard (top risky users)
 */
async function getRiskLeaderboardController(req, res) {
  try {
    const { limit = 10, type = 'riskiest' } = req.query;

    const profiles = dashboardAnalyticsService.buildRiskProfiles({});
    const leaderboard = [...profiles.users].sort((a, b) => type === 'safest' ? a.riskScore - b.riskScore : b.riskScore - a.riskScore).slice(0, parseInt(limit) || 10);

    return res.status(200).json({
      success: true,
      type,
      leaderboard,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error("Get risk leaderboard controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * POST /risk/notification
 * Calculate risk score for a notification
 */
async function calculateNotificationRiskController(req, res) {
  try {
    const { notification } = req.body;

    if (!notification) {
      return res.status(400).json({
        success: false,
        error: "Notification data is required"
      });
    }

    const riskResult = await riskScoringService.calculateNotificationRisk(notification);

    return res.status(200).json({
      success: true,
      data: riskResult
    });

  } catch (error) {
    logger.error("Calculate notification risk controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to calculate notification risk",
      details: error.message
    });
  }
}

/**
 * POST /risk/user/:userId
 * Calculate risk score for a user
 */
async function calculateUserRiskController(req, res) {
  try {
    const { userId } = req.params;
    const { timeWindow = 24 } = req.query;

    const riskResult = await riskScoringService.calculateUserRisk(userId, parseInt(timeWindow));

    return res.status(200).json({
      success: true,
      data: riskResult
    });

  } catch (error) {
    logger.error("Calculate user risk controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to calculate user risk",
      details: error.message
    });
  }
}

/**
 * POST /risk/batch-users
 * Calculate risk scores for multiple users
 */
async function calculateBatchUserRisksController(req, res) {
  try {
    const { userIds, timeWindow = 24 } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        error: "User IDs array is required"
      });
    }

    if (userIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: "Cannot process more than 50 users at once"
      });
    }

    const risks = await riskScoringService.getBatchUserRisks(userIds, parseInt(timeWindow));

    return res.status(200).json({
      success: true,
      data: risks
    });

  } catch (error) {
    logger.error("Calculate batch user risks controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to calculate batch user risks",
      details: error.message
    });
  }
}

/**
 * POST /risk/map-entities
 * Map notification to entities (users, departments, domains, IPs)
 */
async function mapNotificationEntitiesController(req, res) {
  try {
    const { notification } = req.body;

    if (!notification) {
      return res.status(400).json({
        success: false,
        error: "Notification data is required"
      });
    }

    const entities = await riskScoringService.mapNotificationToEntities(notification);

    return res.status(200).json({
      success: true,
      data: entities
    });

  } catch (error) {
    logger.error("Map notification entities controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to map notification entities",
      details: error.message
    });
  }
}

/**
 * GET /risk/departments
 * Get department-level risk scores
 */
async function getDepartmentRisksController(req, res) {
  try {
    const { timeWindow = 24 } = req.query;

    const departmentRisks = await riskScoringService.getDepartmentRisks(parseInt(timeWindow));

    return res.status(200).json({
      success: true,
      data: departmentRisks
    });

  } catch (error) {
    logger.error("Get department risks controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get department risks",
      details: error.message
    });
  }
}

module.exports = {
  updateRiskScoreController,
  getUserRiskProfileController,
  getAllUsersRiskProfileController,
  getDepartmentRiskSummaryController,
  simulateBehaviorController,
  getRiskLeaderboardController,
  calculateNotificationRiskController,
  calculateUserRiskController,
  calculateBatchUserRisksController,
  mapNotificationEntitiesController,
  getDepartmentRisksController
};
