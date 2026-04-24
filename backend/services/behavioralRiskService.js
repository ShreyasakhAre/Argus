/**
 * Behavioral Risk Scoring Service
 * Dataset-only version (no MongoDB)
 */

const datasetService = require('./datasetService');
const logger = require('../utils/logger');

const SCORING_RULES = {
  clicked_suspicious_link: 30,
  ignored_warning: 20,
  reported_phishing: -20,
  marked_safe_correctly: -10
};

const RISK_THRESHOLDS = {
  Low: { min: 0, max: 39 },
  Medium: { min: 40, max: 69 },
  High: { min: 70, max: 100 }
};

// In-memory user risk store keyed by email
const userRiskStore = {};

function calculateRiskLevel(score) {
  if (score >= RISK_THRESHOLDS.High.min) return 'High';
  if (score >= RISK_THRESHOLDS.Medium.min) return 'Medium';
  return 'Low';
}

async function updateRiskScore(userId, actionType, details = {}) {
  try {
    const scoreChange = SCORING_RULES[actionType];
    if (!scoreChange) throw new Error(`Invalid action type: ${actionType}`);

    const store = userRiskStore[userId] || { riskScore: 50, riskLevel: 'Low', behaviorHistory: [] };
    const oldScore = store.riskScore;
    const newScore = Math.max(0, Math.min(100, oldScore + scoreChange));
    const newRiskLevel = calculateRiskLevel(newScore);

    store.riskScore = newScore;
    store.riskLevel = newRiskLevel;
    store.lastRiskUpdate = new Date();
    store.behaviorHistory.push({ action: actionType, scoreChange, newScore, timestamp: new Date(), details });
    userRiskStore[userId] = store;

    logger.info(`Risk score updated for ${userId}: ${oldScore} → ${newScore} (${actionType})`);

    return { success: true, userId, oldScore, newScore, scoreChange, riskLevel: newRiskLevel, action: actionType };
  } catch (error) {
    logger.error('Update risk score failed:', error);
    return { success: false, error: error.message };
  }
}

async function getUserRiskProfile(userId) {
  try {
    const store = userRiskStore[userId] || { riskScore: 50, riskLevel: 'Low', behaviorHistory: [], lastRiskUpdate: new Date() };
    return {
      success: true,
      user: { id: userId, email: userId, riskScore: store.riskScore, riskLevel: store.riskLevel, lastRiskUpdate: store.lastRiskUpdate },
      recentBehavior: store.behaviorHistory.slice(-10).reverse(),
      behaviorStats: calculateBehaviorStats(store.behaviorHistory)
    };
  } catch (error) {
    logger.error('Get user risk profile failed:', error);
    return { success: false, error: error.message };
  }
}

async function getAllUsersRiskProfile(options = {}) {
  try {
    if (!datasetService._ready) return { success: true, users: [], total: 0, page: 1, totalPages: 1 };

    const { limit = 50, page = 1, riskLevel, department } = options;
    let allData = datasetService.query({}, { limit: 10000 }).data;

    // Build per-receiver profiles
    const userMap = {};
    allData.forEach(item => {
      const email = item.receiver || 'unknown';
      if (!userMap[email]) {
        userMap[email] = {
          id: email, email, name: email.split('@')[0], department: item.department || 'Unknown',
          riskScore: 0, totalAlerts: 0, maliciousCount: 0
        };
      }
      userMap[email].totalAlerts++;
      if (item.is_malicious) userMap[email].maliciousCount++;
    });

    let users = Object.values(userMap).map(u => {
      const score = Math.min(100, Math.round((u.maliciousCount / Math.max(u.totalAlerts, 1)) * 100));
      return { ...u, riskScore: score, riskLevel: calculateRiskLevel(score), behaviorCount: u.totalAlerts, recentBehavior: [] };
    });

    if (riskLevel) users = users.filter(u => u.riskLevel === riskLevel);
    if (department) users = users.filter(u => u.department === department);

    users.sort((a, b) => b.riskScore - a.riskScore);
    const total = users.length;
    const paginated = users.slice((page - 1) * limit, page * limit);

    return { success: true, users: paginated, total, page, totalPages: Math.ceil(total / limit) };
  } catch (error) {
    logger.error('Get all users risk profile failed:', error);
    return { success: false, error: error.message };
  }
}

function calculateBehaviorStats(behaviorHistory) {
  const stats = { totalActions: behaviorHistory.length, actionCounts: {}, lastActions: {}, riskTrend: [] };
  behaviorHistory.forEach(record => {
    stats.actionCounts[record.action] = (stats.actionCounts[record.action] || 0) + 1;
    stats.lastActions[record.action] = record.timestamp;
  });
  const recentActions = behaviorHistory.slice(-10);
  stats.riskTrend = recentActions.map(record => ({ date: record.timestamp, score: record.newScore, action: record.action }));
  return stats;
}

async function getDepartmentRiskSummary() {
  try {
    if (!datasetService._ready) return { success: true, departments: [] };

    const allData = datasetService.query({}, { limit: 10000 }).data;
    const deptMap = {};
    allData.forEach(item => {
      const dept = item.department || 'Unknown';
      if (!deptMap[dept]) deptMap[dept] = { total: 0, malicious: 0, riskScores: [] };
      deptMap[dept].total++;
      if (item.is_malicious) deptMap[dept].malicious++;
      deptMap[dept].riskScores.push(item.risk_score);
    });

    const departments = Object.entries(deptMap).map(([name, data]) => {
      const avgRiskScore = data.riskScores.reduce((s, r) => s + r, 0) / Math.max(data.riskScores.length, 1);
      const avgRoundedScore = Math.round(avgRiskScore * 100);
      return {
        name,
        avgRiskScore: avgRoundedScore,
        maxRiskScore: Math.round(Math.max(...data.riskScores) * 100),
        minRiskScore: Math.round(Math.min(...data.riskScores) * 100),
        employeeCount: data.total,
        riskDistribution: {
          high: data.riskScores.filter(s => s >= 0.7).length,
          medium: data.riskScores.filter(s => s >= 0.4 && s < 0.7).length,
          low: data.riskScores.filter(s => s < 0.4).length
        }
      };
    }).sort((a, b) => b.avgRiskScore - a.avgRiskScore);

    return { success: true, departments };
  } catch (error) {
    logger.error('Get department risk summary failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  updateRiskScore,
  getUserRiskProfile,
  getAllUsersRiskProfile,
  getDepartmentRiskSummary,
  calculateRiskLevel
};
