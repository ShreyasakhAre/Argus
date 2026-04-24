/**
 * Recommendation Engine Service
 * Dataset-only version — no MongoDB
 */

const datasetService = require('./datasetService');
const logger = require('../utils/logger');

class RecommendationEngine {
  constructor() {
    this.insightCache = new Map();
    this.lastCacheUpdate = null;
    this.cacheTimeout = 10 * 60 * 1000;
  }

  async generateInsights() {
    try {
      const insights = {
        riskTrends: await this.analyzeRiskTrends(),
        departmentInsights: await this.analyzeDepartmentRisks(),
        behavioralInsights: { patterns: [], insights: [] },
        securityRecommendations: await this.generateSecurityRecommendations(),
        trainingRecommendations: await this.generateTrainingRecommendations(),
        policyRecommendations: await this.generatePolicyRecommendations(),
        operationalInsights: await this.generateOperationalInsights(),
        threats: await this.analyzeThreatPatterns()
      };
      this.insightCache.set('current', insights);
      this.lastCacheUpdate = new Date();
      return { success: true, insights, generatedAt: new Date() };
    } catch (error) {
      logger.error('Failed to generate insights:', error);
      return { success: false, error: error.message };
    }
  }

  async analyzeRiskTrends() {
    try {
      if (!datasetService._ready) return { trends: [], trendDirection: 'stable', insights: [] };
      const data = datasetService.query({}, { limit: 10000 }).data;
      const maliciousCount = data.filter(d => d.is_malicious).length;
      const direction = maliciousCount > data.length * 0.25 ? 'increasing' : 'stable';
      return {
        trends: [],
        trendDirection: direction,
        insights: direction === 'increasing' ? [{
          type: 'warning',
          title: 'Rising Risk Levels',
          description: `${Math.round((maliciousCount / data.length) * 100)}% of notifications are malicious.`,
          priority: 'high',
          recommendation: 'Schedule security awareness training for all departments'
        }] : []
      };
    } catch (e) {
      return { trends: [], trendDirection: 'stable', insights: [] };
    }
  }

  async analyzeDepartmentRisks() {
    try {
      if (!datasetService._ready) return { departments: [], insights: [] };
      const data = datasetService.query({}, { limit: 10000 }).data;
      const deptMap = {};
      data.forEach(item => {
        const d = item.department || 'Unknown';
        if (!deptMap[d]) deptMap[d] = { total: 0, malicious: 0, riskSum: 0 };
        deptMap[d].total++;
        if (item.is_malicious) deptMap[d].malicious++;
        deptMap[d].riskSum += item.risk_score;
      });
      const departments = Object.entries(deptMap).map(([name, s]) => ({
        _id: name,
        totalEmployees: s.total,
        avgRiskScore: Math.round((s.riskSum / s.total) * 100),
        highRiskCount: s.malicious
      })).sort((a, b) => b.avgRiskScore - a.avgRiskScore);

      const insights = departments.filter(d => d.avgRiskScore > 50).map(d => ({
        type: 'warning',
        title: `Elevated Risk in ${d._id}`,
        description: `${d._id} has an average risk score of ${d.avgRiskScore}.`,
        priority: d.avgRiskScore > 70 ? 'high' : 'medium',
        recommendation: `Schedule targeted training for ${d._id}`
      }));

      return { departments, insights };
    } catch (e) {
      return { departments: [], insights: [] };
    }
  }

  async generateSecurityRecommendations() {
    try {
      if (!datasetService._ready) return [];
      const data = datasetService.query({}, { limit: 10000 }).data;
      const maliciousRate = data.filter(d => d.is_malicious).length / data.length;
      const recs = [];
      if (maliciousRate > 0.2) {
        recs.push({
          type: 'security',
          title: 'Implement Advanced Security Controls',
          description: `${Math.round(maliciousRate * 100)}% of notifications are malicious.`,
          priority: 'high',
          actions: ['Enable MFA for all users', 'Implement stricter email filtering', 'Conduct emergency training'],
          estimatedImpact: 'Reduce malicious events by 40-60%',
          timeframe: '2-4 weeks'
        });
      }
      return recs;
    } catch (e) {
      return [];
    }
  }

  async generateTrainingRecommendations() {
    try {
      if (!datasetService._ready) return [];
      const data = datasetService.query({}, { limit: 10000 }).data;
      const deptMap = {};
      data.forEach(item => {
        const d = item.department || 'Unknown';
        if (!deptMap[d]) deptMap[d] = { total: 0, malicious: 0 };
        deptMap[d].total++;
        if (item.is_malicious) deptMap[d].malicious++;
      });
      return Object.entries(deptMap)
        .filter(([, s]) => s.malicious / s.total > 0.1)
        .map(([dept]) => ({
          type: 'training',
          title: `Urgent Training Needed: ${dept}`,
          description: `${dept} department has a high malicious notification rate.`,
          priority: 'critical',
          targetAudience: dept,
          trainingType: 'phishing_awareness',
          actions: ['Immediate phishing simulation', 'Email security workshop'],
          urgency: 'immediate'
        }));
    } catch (e) {
      return [];
    }
  }

  async generatePolicyRecommendations() {
    return [{
      type: 'policy',
      title: 'Enable High-Risk Auto-Block Policy',
      description: 'Automatically block senders with risk score >= 0.8.',
      priority: 'high',
      suggestedPolicy: { name: 'Auto-Block High Risk', conditions: { riskScore: { operator: 'gte', value: 0.8 } }, actions: [{ type: 'block_sender' }] }
    }];
  }

  async generateOperationalInsights() {
    try {
      if (!datasetService._ready) return [];
      const data = datasetService.query({}, { limit: 10000 }).data;
      const pending = data.filter(d => d.review_status === 'Pending').length;
      const insights = [];
      if (pending > data.length * 0.5) {
        insights.push({
          type: 'operational',
          title: 'High Pending Alert Backlog',
          description: `${pending} alerts are pending review.`,
          priority: 'medium',
          recommendation: 'Increase analyst capacity or automate triage.',
          metrics: { pendingAlerts: pending, totalAlerts: data.length }
        });
      }
      return insights;
    } catch (e) {
      return [];
    }
  }

  async analyzeThreatPatterns() {
    try {
      if (!datasetService._ready) return { threats: [], insights: [] };
      const data = datasetService.query({ is_malicious: true }, { limit: 10000 }).data;
      const typeMap = {};
      data.forEach(item => {
        const t = item.threat_category || 'unknown';
        typeMap[t] = (typeMap[t] || 0) + 1;
      });
      const threats = Object.entries(typeMap).map(([type, count]) => ({ _id: type, count, avgRiskScore: 75 })).sort((a, b) => b.count - a.count);
      const insights = threats.slice(0, 3).map(t => ({
        type: 'threat',
        title: `High Volume: ${t._id} Attacks`,
        description: `${t.count} ${t._id} attacks detected.`,
        priority: 'high',
        recommendation: `Implement specific defenses for ${t._id} attacks`
      }));
      return { threats, insights };
    } catch (e) {
      return { threats: [], insights: [] };
    }
  }

  async getInsights() {
    if (!this.lastCacheUpdate || (Date.now() - this.lastCacheUpdate.getTime()) > this.cacheTimeout) {
      return await this.generateInsights();
    }
    return { success: true, insights: this.insightCache.get('current'), cached: true, generatedAt: this.lastCacheUpdate };
  }

  async getInsightCategory(category) {
    const insights = await this.getInsights();
    if (!insights.success) return insights;
    return { success: true, category, data: insights.insights[category] || null, generatedAt: insights.generatedAt };
  }
}

const recommendationEngine = new RecommendationEngine();

module.exports = { RecommendationEngine, recommendationEngine };
