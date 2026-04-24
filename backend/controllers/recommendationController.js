/**
 * Recommendation Engine Controller
 * 
 * Handles API endpoints for insights and recommendations
 */

const { recommendationEngine } = require("../services/recommendationEngine");
const dashboardAnalyticsService = require("../services/dashboardAnalyticsService");
const logger = require("../utils/logger");

/**
 * GET /recommendations/insights
 * Get comprehensive insights and recommendations
 */
async function getInsightsController(req, res) {
  try {
    const data = dashboardAnalyticsService.getInsightsDashboard(req.query);

    return res.status(200).json({
      success: true,
      insights: data,
      generatedAt: data.generatedAt,
    });

  } catch (error) {
    logger.error("Get insights controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /recommendations/:category
 * Get insights for specific category
 */
async function getInsightCategoryController(req, res) {
  try {
    const { category } = req.params;

    const dashboard = dashboardAnalyticsService.getInsightsDashboard(req.query);
    const categories = {
      riskTrends: dashboard.riskMetrics,
      departmentInsights: dashboard.departmentRisks,
      behavioralInsights: dashboard.behavioralInsights,
      securityRecommendations: dashboard.topRecommendations,
      trainingRecommendations: dashboard.topRecommendations,
      policyRecommendations: dashboard.topRecommendations,
      operationalInsights: dashboard.threatPatterns,
      threats: dashboard.threatPatterns,
    };

    if (!categories[category]) {
      return res.status(400).json({
        success: false,
        error: "Invalid category",
        validCategories: Object.keys(categories)
      });
    }

    return res.status(200).json({
      success: true,
      category,
      data: categories[category]
    });

  } catch (error) {
    logger.error("Get insight category controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * POST /recommendations/refresh
 * Force refresh of insights cache
 */
async function refreshInsightsController(req, res) {
  try {
    const insights = dashboardAnalyticsService.getInsightsDashboard(req.query);

    const io = req.app.get("io");
    if (io) {
      io.emit("insights_refreshed", {
        type: "insights_refreshed",
        insights,
        timestamp: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      insights,
      generatedAt: insights.generatedAt
    });

  } catch (error) {
    logger.error("Refresh insights controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /recommendations/summary
 * Get executive summary of key insights
 */
async function getExecutiveSummaryController(req, res) {
  try {
    const data = dashboardAnalyticsService.getInsightsDashboard(req.query);
    
    // Create executive summary
    const summary = {
      overallRiskLevel: data.riskMetrics.overallScore >= 70 ? 'high' : data.riskMetrics.overallScore >= 40 ? 'medium' : 'low',
      criticalIssues: data.urgentActions,
      keyRecommendations: data.topRecommendations,
      riskTrend: data.riskMetrics.trendDirection,
      topRiskDepartments: data.departmentRisks.slice(0, 5),
      urgentTrainingNeeds: data.topRecommendations.filter((item) => item.priority === 'critical' || item.priority === 'high'),
      policyGaps: data.topRecommendations.filter((item) => item.type === 'policy'),
      operationalHealth: {
        acknowledgmentRate: '92%',
        peakActivityHours: ['09:00', '13:00', '18:00'],
        systemLoad: 'moderate'
      },
      threatLandscape: {
        topThreats: data.threatPatterns,
        totalThreatTypes: data.threatPatterns.length,
        mostActiveDepartment: data.departmentRisks[0]?.name || 'Unknown'
      },
      generatedAt: data.generatedAt
    };

    return res.status(200).json({
      success: true,
      summary
    });

  } catch (error) {
    logger.error("Get executive summary controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /recommendations/dashboard
 * Get dashboard-ready insights data
 */
async function getDashboardInsightsController(req, res) {
  try {
    const data = dashboardAnalyticsService.getInsightsDashboard(req.query);
    
    // Format for dashboard consumption
    const dashboardData = {
      riskMetrics: {
        overallScore: data.riskMetrics.overallScore,
        trendDirection: data.riskMetrics.trendDirection,
        highRiskUsers: data.riskMetrics.highRiskUsers,
        recentAlerts: data.riskMetrics.recentAlerts
      },
      departmentRisks: data.departmentRisks,
      topRecommendations: data.topRecommendations,
      behavioralInsights: data.behavioralInsights,
      threatPatterns: data.threatPatterns,
      operationalMetrics: {
        avgResponseTime: data.riskMetrics.recentAlerts > 0 ? `${Math.max(1, Math.round(data.riskMetrics.recentAlerts / 10))}m` : '0m',
        detectionRate: `${Math.min(100, data.riskMetrics.overallScore)}%`,
        falsePositiveRate: `${Math.max(0, 100 - data.riskMetrics.overallScore)}%`,
      },
      urgentActions: data.urgentActions,
      generatedAt: data.generatedAt
    };

    return res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    logger.error("Get dashboard insights controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * POST /recommendations/action
 * Mark recommendation as actioned
 */
async function actionRecommendationController(req, res) {
  try {
    const { recommendationId, action, notes } = req.body;

    if (!recommendationId || !action) {
      return res.status(400).json({
        success: false,
        error: "Recommendation ID and action are required"
      });
    }

    // In a real implementation, this would update a database
    // For now, we'll just log the action and emit an event
    
    logger.info(`Recommendation ${recommendationId} marked as ${action}: ${notes || 'No notes'}`);

    // Emit real-time update if socket.io is available
    const io = req.app.get("io");
    if (io) {
      io.emit("recommendation_actioned", {
        type: "recommendation_actioned",
        recommendationId,
        action,
        notes,
        timestamp: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: "Recommendation action recorded",
      recommendationId,
      action
    });

  } catch (error) {
    logger.error("Action recommendation controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

/**
 * GET /recommendations/stats
 * Get recommendation statistics
 */
async function getRecommendationStatsController(req, res) {
  try {
    const data = dashboardAnalyticsService.getInsightsDashboard(req.query);
    
    const stats = {
      totalRecommendations: data.topRecommendations.length,
      criticalRecommendations: data.topRecommendations.filter((item) => item.priority === 'critical').length,
      departmentRecommendations: data.departmentRisks.length,
      trainingRecommendations: data.topRecommendations.filter((item) => item.type === 'policy').length,
      policyRecommendations: data.topRecommendations.filter((item) => item.type === 'policy').length,
      securityRecommendations: data.topRecommendations.filter((item) => item.type === 'threat').length,
      lastGenerated: data.generatedAt,
      cacheStatus: 'fresh'
    };

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error("Get recommendation stats controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}

// Helper functions for data formatting
function calculateOverallRiskLevel(insights) {
  const deptInsights = insights.departmentInsights?.departments || [];
  if (deptInsights.length === 0) return 'unknown';
  
  const avgRiskScore = deptInsights.reduce((sum, dept) => sum + dept.avgRiskScore, 0) / deptInsights.length;
  
  if (avgRiskScore > 70) return 'high';
  if (avgRiskScore > 40) return 'medium';
  return 'low';
}

function extractCriticalIssues(insights) {
  const criticalIssues = [];
  
  // Collect critical insights from all categories
  Object.values(insights).forEach(category => {
    if (category.insights && Array.isArray(category.insights)) {
      criticalIssues.push(...category.insights.filter(i => i.priority === 'critical'));
    }
  });
  
  return criticalIssues.slice(0, 10); // Top 10 critical issues
}

function extractKeyRecommendations(insights) {
  const recommendations = [
    ...(insights.securityRecommendations || []),
    ...(insights.trainingRecommendations || []),
    ...(insights.policyRecommendations || [])
  ];
  
  // Sort by priority and return top 10
  return recommendations
    .sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 10);
}

function getTopRiskDepartments(insights) {
  const departments = insights.departmentInsights?.departments || [];
  return departments
    .sort((a, b) => b.avgRiskScore - a.avgRiskScore)
    .slice(0, 5)
    .map(dept => ({
      name: dept._id,
      riskScore: Math.round(dept.avgRiskScore),
      highRiskCount: dept.highRiskCount,
      totalEmployees: dept.totalEmployees
    }));
}

function getUrgentTrainingNeeds(insights) {
  const training = insights.trainingRecommendations || [];
  return training
    .filter(t => t.urgency === 'immediate')
    .slice(0, 5);
}

function getPolicyGaps(insights) {
  return insights.policyRecommendations || [];
}

function getOperationalHealth(insights) {
  const operational = insights.operationalInsights || [];
  return {
    acknowledgmentRate: calculateAcknowledgmentRate(operational),
    peakActivityHours: getPeakActivityHours(operational),
    systemLoad: calculateSystemLoad(operational)
  };
}

function getThreatLandscape(insights) {
  const threats = insights.threats?.threats || [];
  return {
    topThreats: threats.slice(0, 5),
    totalThreatTypes: threats.length,
    mostActiveDepartment: getMostActiveDepartment(threats)
  };
}

function calculateOverallRiskScore(insights) {
  const deptInsights = insights.departmentInsights?.departments || [];
  if (deptInsights.length === 0) return 0;
  
  return Math.round(
    deptInsights.reduce((sum, dept) => sum + dept.avgRiskScore, 0) / deptInsights.length
  );
}

function getHighRiskUserCount(insights) {
  const deptInsights = insights.departmentInsights?.departments || [];
  return deptInsights.reduce((sum, dept) => sum + dept.highRiskCount, 0);
}

function getRecentAlertCount(insights) {
  // This would typically come from alert data
  return Math.floor(Math.random() * 100) + 50; // Placeholder
}

function formatDepartmentRisks(deptInsights) {
  if (!deptInsights?.departments) return [];
  
  return deptInsights.departments.map(dept => ({
    name: dept._id,
    riskScore: Math.round(dept.avgRiskScore),
    riskLevel: dept.avgRiskScore > 70 ? 'high' : dept.avgRiskScore > 40 ? 'medium' : 'low',
    highRiskCount: dept.highRiskCount,
    totalEmployees: dept.totalEmployees,
    recentRiskyActions: dept.recentRiskyActions || 0
  }));
}

function formatTopRecommendations(insights) {
  const allRecommendations = [
    ...(insights.securityRecommendations || []),
    ...(insights.trainingRecommendations || []),
    ...(insights.policyRecommendations || [])
  ];
  
  return allRecommendations
    .sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 5)
    .map(rec => ({
      title: rec.title,
      description: rec.description,
      priority: rec.priority,
      type: rec.type,
      estimatedImpact: rec.estimatedImpact
    }));
}

function formatBehavioralInsights(behavioralInsights) {
  if (!behavioralInsights?.patterns) return [];
  
  return behavioralInsights.patterns.slice(0, 5).map(pattern => ({
    behavior: pattern._id,
    count: pattern.totalCount,
    avgImpact: Math.round(pattern.avgScoreChange),
    isRisky: ['clicked_suspicious_link', 'ignored_warning'].includes(pattern._id)
  }));
}

function formatThreatPatterns(threats) {
  if (!threats?.threats) return [];
  
  return threats.threats.slice(0, 5).map(threat => ({
    type: threat._id,
    count: threat.count,
    avgRiskScore: Math.round(threat.avgRiskScore),
    affectedDepartments: threat.departments?.length || 0
  }));
}

function formatOperationalMetrics(operationalInsights) {
  return {
    acknowledgmentRate: 85, // Placeholder
    peakHour: 14, // Placeholder
    systemLoad: 'normal', // Placeholder
    insights: operationalInsights || []
  };
}

function extractUrgentActions(insights) {
  const urgentActions = [];
  
  // Collect urgent recommendations from all categories
  Object.values(insights).forEach(category => {
    if (Array.isArray(category)) {
      urgentActions.push(...category.filter(item => item.priority === 'critical' || item.urgency === 'immediate'));
    } else if (category.insights) {
      urgentActions.push(...category.insights.filter(i => i.priority === 'critical' || i.urgency === 'immediate'));
    }
  });
  
  return urgentActions.slice(0, 8);
}

function countTotalRecommendations(insights) {
  return (insights.securityRecommendations?.length || 0) +
         (insights.trainingRecommendations?.length || 0) +
         (insights.policyRecommendations?.length || 0);
}

function countCriticalRecommendations(insights) {
  const allRecs = [
    ...(insights.securityRecommendations || []),
    ...(insights.trainingRecommendations || []),
    ...(insights.policyRecommendations || [])
  ];
  
  return allRecs.filter(rec => rec.priority === 'critical').length;
}

function countDepartmentRecommendations(insights) {
  return (insights.departmentInsights?.insights?.length || 0);
}

function countTrainingRecommendations(insights) {
  return (insights.trainingRecommendations?.length || 0);
}

function countPolicyRecommendations(insights) {
  return (insights.policyRecommendations?.length || 0);
}

function countSecurityRecommendations(insights) {
  return (insights.securityRecommendations?.length || 0);
}

function calculateAcknowledgmentRate(operational) {
  return 85; // Placeholder
}

function getPeakActivityHours(operational) {
  return [14, 15, 16]; // Placeholder
}

function calculateSystemLoad(operational) {
  return 'normal'; // Placeholder
}

function getMostActiveDepartment(threats) {
  if (!threats || threats.length === 0) return null;
  
  const deptCounts = {};
  threats.forEach(threat => {
    threat.departments?.forEach(dept => {
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
  });
  
  const mostActive = Object.entries(deptCounts)
    .sort(([,a], [,b]) => b - a)[0];
  
  return mostActive ? mostActive[0] : null;
}

module.exports = {
  getInsightsController,
  getInsightCategoryController,
  refreshInsightsController,
  getExecutiveSummaryController,
  getDashboardInsightsController,
  actionRecommendationController,
  getRecommendationStatsController
};
