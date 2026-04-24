const datasetService = require('./datasetService');
const logger = require('../utils/logger');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRisk(score) {
  const raw = typeof score === 'number' ? score : 0;
  return clamp(Math.round(raw * 100), 0, 100);
}

function riskLevel(score) {
  if (score >= 75) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

class RiskScoringService {
  async calculateNotificationRisk(notification) {
    try {
      const factors = [];
      let score = normalizeRisk(notification.risk_score || 0);

      const content = String(notification.content || '').toLowerCase();
      const sender = String(notification.sender || '');

      if (notification.contains_url) {
        score += 8;
        factors.push({ type: 'contains_url', value: 8 });
      }
      if (notification.attachment_type && notification.attachment_type !== 'none') {
        score += 6;
        factors.push({ type: 'attachment', value: 6 });
      }
      if (/urgent|verify|reset|password|wire|invoice/.test(content)) {
        score += 10;
        factors.push({ type: 'phishing_language', value: 10 });
      }
      if (/bit\.ly|tinyurl|verify-now|secure-/.test(sender.toLowerCase())) {
        score += 14;
        factors.push({ type: 'suspicious_sender', value: 14 });
      }
      if (/company\.com$/i.test(notification.sender_domain || '')) {
        score -= 10;
        factors.push({ type: 'trusted_domain', value: -10 });
      }

      score = clamp(score, 0, 100);

      return {
        score,
        level: riskLevel(score),
        factors,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to calculate notification risk:', error);
      return { score: 50, level: 'medium', factors: [], timestamp: new Date() };
    }
  }

  async calculateUserRisk(userId, timeWindow = 24) {
    try {
      const { data } = datasetService.query({}, { page: 1, limit: 10000, internal: true });
      const subset = data.filter((n) =>
        n.receiver === userId || n.sender === userId || n.receiver.includes(userId) || n.sender.includes(userId)
      );

      const scoped = subset.length > 0 ? subset : data.filter((n) => n.receiver === userId || n.sender === userId);
      const alerts = scoped.length;
      const avg = alerts > 0 ? scoped.reduce((s, n) => s + normalizeRisk(n.risk_score), 0) / alerts : 0;
      const malicious = scoped.filter((n) => n.is_malicious === 1).length;
      const pending = scoped.filter((n) => n.review_status === 'Pending').length;

      const score = clamp(Math.round(avg * 0.7 + malicious * 4 + pending * 1.5), 0, 100);

      return {
        userId,
        score,
        level: riskLevel(score),
        factors: [
          { type: 'avg_risk', value: Math.round(avg) },
          { type: 'malicious_count', value: malicious },
          { type: 'pending_count', value: pending },
        ],
        alertCount: alerts,
        timeWindow,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to calculate user risk for ${userId}:`, error);
      return { userId, score: 50, level: 'medium', factors: [], alertCount: 0, timeWindow, timestamp: new Date() };
    }
  }

  async mapNotificationToEntities(notification) {
    const sender = String(notification.sender || '');
    const receiver = String(notification.receiver || '');
    const senderDomain = notification.sender_domain || (sender.includes('@') ? sender.split('@')[1] : null);

    return {
      users: [receiver, sender].filter(Boolean).map((email) => ({
        id: email,
        email,
        role: 'user',
        department: notification.department || 'Unknown',
      })),
      departments: [notification.department || 'Unknown'],
      domains: senderDomain ? [senderDomain] : [],
      ips: [],
    };
  }

  async getBatchUserRisks(userIds, timeWindow = 24) {
    try {
      const risks = await Promise.all((userIds || []).map((id) => this.calculateUserRisk(id, timeWindow)));
      return risks.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Failed to get batch user risks:', error);
      return [];
    }
  }

  async getDepartmentRisks() {
    try {
      const { data } = datasetService.query({}, { page: 1, limit: 10000, internal: true });
      const map = new Map();

      data.forEach((n) => {
        const dept = n.department || 'Unknown';
        if (!map.has(dept)) {
          map.set(dept, { totalAlerts: 0, malicious: 0, riskSum: 0 });
        }
        const item = map.get(dept);
        item.totalAlerts += 1;
        item.riskSum += normalizeRisk(n.risk_score);
        if (n.is_malicious === 1) item.malicious += 1;
      });

      return Array.from(map.entries()).map(([department, item]) => {
        const score = item.totalAlerts > 0 ? Math.round(item.riskSum / item.totalAlerts) : 0;
        return {
          department,
          totalAlerts: item.totalAlerts,
          criticalAlerts: item.malicious,
          highAlerts: Math.round(item.malicious * 0.7),
          riskScore: score,
          riskLevel: riskLevel(score),
        };
      });
    } catch (error) {
      logger.error('Failed to get department risks:', error);
      return [];
    }
  }
}

const riskScoringService = new RiskScoringService();

module.exports = {
  RiskScoringService,
  riskScoringService,
};