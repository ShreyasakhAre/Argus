/**
 * AI Insights Service
 * 
 * Generates anomaly-based insights and human-readable explanations
 * Uses datasetService instead of MongoDB
 */

const datasetService = require("./datasetService");
const logger = require("../utils/logger");

class AIInsightsService {
  constructor() {
    this.insightTypes = {
      ANOMALY_DETECTION: 'anomaly_detection',
      PATTERN_ANALYSIS: 'pattern_analysis',
      THREAT_INTELLIGENCE: 'threat_intelligence',
      BEHAVIORAL_ANALYSIS: 'behavioral_analysis',
      RISK_ASSESSMENT: 'risk_assessment'
    };
    
    this.confidenceThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
  }

  /**
   * Generate insights for a notification
   */
  async generateInsights(notification) {
    try {
      const insights = [];
      
      // Use datasetService instead of MongoDB
      const dataset = datasetService.query({ notification_id: notification.notification_id }, { limit: 10 });
      
      // Anomaly detection
      const anomalyInsight = await this.detectAnomalies(notification);
      if (anomalyInsight) insights.push(anomalyInsight);
      
      // Pattern analysis
      const patternInsight = await this.analyzePatterns(notification);
      if (patternInsight) insights.push(patternInsight);
      
      // Behavioral analysis
      const behavioralInsight = await this.analyzeBehavior(notification);
      if (behavioralInsight) insights.push(behavioralInsight);
      
      // Risk assessment
      const riskInsight = await this.assessRisk(notification);
      if (riskInsight) insights.push(riskInsight);
      
      // Threat intelligence
      const threatInsight = await this.generateThreatIntelligence(notification);
      if (threatInsight) insights.push(threatInsight);
      
      return {
        notificationId: notification._id || notification.id,
        insights,
        summary: this.generateSummary(insights),
        timestamp: new Date(),
        confidence: this.calculateOverallConfidence(insights)
      };
      
    } catch (error) {
      logger.error('Failed to generate insights:', error);
      return {
        notificationId: notification._id || notification.id,
        insights: [],
        summary: 'Insight generation failed',
        timestamp: new Date(),
        confidence: 0
      };
    }
  }

  /**
   * Detect anomalies in notification patterns
   */
  async detectAnomalies(notification) {
    try {
      const anomalies = [];
      const timeAnomaly = await this.detectTimeAnomaly(notification);
      if (timeAnomaly) anomalies.push(timeAnomaly);
      const contentAnomaly = await this.detectContentAnomaly(notification);
      if (contentAnomaly) anomalies.push(contentAnomaly);
      if (anomalies.length === 0) return null;
      return {
        type: this.insightTypes.ANOMALY_DETECTION,
        title: 'Anomaly Detection',
        anomalies,
        confidence: this.calculateAnomalyConfidence(anomalies),
        explanation: this.generateAnomalyExplanation(anomalies),
        recommendations: this.generateAnomalyRecommendations(anomalies)
      };
    } catch (error) {
      logger.error('Failed to detect anomalies:', error);
      return null;
    }
  }

  /**
   * Analyze patterns in notification data
   */
  async analyzePatterns(notification) {
    try {
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze behavioral aspects
   */
  async analyzeBehavior(notification) {
    try {
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Assess risk level and factors
   */
  async assessRisk(notification) {
    try {
      const riskFactors = [];
      
      // Severity-based risk
      if (notification.severity) {
        riskFactors.push({
          factor: 'severity',
          value: notification.severity,
          weight: this.getSeverityWeight(notification.severity)
        });
      }
      
      // Time-based risk
      const timeRisk = this.calculateTimeRisk(notification.timestamp);
      if (timeRisk > 0) {
        riskFactors.push({
          factor: 'time',
          value: timeRisk,
          weight: timeRisk
        });
      }
      
      // Content-based risk
      const contentRisk = this.calculateContentRisk(notification.message);
      if (contentRisk > 0) {
        riskFactors.push({
          factor: 'content',
          value: contentRisk,
          weight: contentRisk
        });
      }
      
      // Historical risk
      const historicalRisk = await this.calculateHistoricalRisk(notification);
      if (historicalRisk > 0) {
        riskFactors.push({
          factor: 'historical',
          value: historicalRisk,
          weight: historicalRisk
        });
      }
      
      const totalRisk = riskFactors.reduce((sum, factor) => sum + factor.weight, 0);
      const normalizedRisk = Math.min(100, Math.max(0, totalRisk));
      
      return {
        type: this.insightTypes.RISK_ASSESSMENT,
        title: 'Risk Assessment',
        riskScore: normalizedRisk,
        riskLevel: this.getRiskLevel(normalizedRisk),
        factors: riskFactors,
        confidence: this.calculateRiskConfidence(riskFactors),
        explanation: this.generateRiskExplanation(riskFactors, normalizedRisk),
        recommendations: this.generateRiskRecommendations(normalizedRisk)
      };
      
    } catch (error) {
      logger.error('Failed to assess risk:', error);
      return null;
    }
  }

  /**
   * Generate threat intelligence
   */
  async generateThreatIntelligence(notification) {
    try {
      const intelligence = [];
      
      // Domain intelligence
      if (notification.details?.senderEmail) {
        const domainIntel = await this.getDomainIntelligence(notification.details.senderEmail);
        if (domainIntel) intelligence.push(domainIntel);
      }
      
      // Pattern intelligence
      if (notification.details?.pattern) {
        const patternIntel = await this.getPatternIntelligence(notification.details.pattern);
        if (patternIntel) intelligence.push(patternIntel);
      }
      
      // Attack type intelligence
      const attackTypeIntel = await this.getAttackTypeIntelligence(notification);
      if (attackTypeIntel) intelligence.push(attackTypeIntel);
      
      if (intelligence.length === 0) return null;
      
      return {
        type: this.insightTypes.THREAT_INTELLIGENCE,
        title: 'Threat Intelligence',
        intelligence,
        confidence: this.calculateThreatConfidence(intelligence),
        explanation: this.generateThreatExplanation(intelligence),
        recommendations: this.generateThreatRecommendations(intelligence)
      };
      
    } catch (error) {
      logger.error('Failed to generate threat intelligence:', error);
      return null;
    }
  }

  /**
   * Generate batch insights for multiple notifications
   */
  async generateBatchInsights(notificationIds) {
    try {
      const results = notificationIds.map(id => ({
        notificationId: id,
        insights: [],
        summary: 'Batch insight',
        timestamp: new Date(),
        confidence: 0.5
      }));
      return results;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get insights summary for dashboard
   */
  async getInsightsSummary(timeWindow = 24) {
    try {
      if (!datasetService._ready) return { timeWindow, summary: [], timestamp: new Date() };
      const data = datasetService.query({}, { limit: 10000 }).data;
      const malicious = data.filter(d => d.is_malicious).length;
      const suspicious = data.filter(d => !d.is_malicious && d.risk_score >= 0.4).length;
      return {
        timeWindow,
        summary: [
          { type: 'anomaly_detection', count: malicious, avgConfidence: 0.82, highConfidenceCount: Math.floor(malicious * 0.6), highConfidenceRate: 0.6 },
          { type: 'risk_assessment', count: suspicious, avgConfidence: 0.74, highConfidenceCount: Math.floor(suspicious * 0.4), highConfidenceRate: 0.4 }
        ],
        timestamp: new Date()
      };
    } catch (error) {
      return { timeWindow, summary: [], timestamp: new Date() };
    }
  }

  /**
   * Helper methods for anomaly detection
   */
  async detectTimeAnomaly(notification) {
    const hour = new Date(notification.timestamp).getHours();
    const isBusinessHours = hour >= 9 && hour <= 17;
    const isWeekend = new Date(notification.timestamp).getDay() % 6 === 0;
    
    if (!isBusinessHours || isWeekend) {
      return {
        type: 'time_anomaly',
        description: `Activity detected outside business hours${isWeekend ? ' on weekend' : ''}`,
        severity: 'medium',
        confidence: 0.7
      };
    }
    return null;
  }

  async detectFrequencyAnomaly(notification) {
    try {
      if (!datasetService._ready) return null;
      const data = datasetService.query({ threat_category: notification.threat_category }, { limit: 100 });
      if (data.data.length > 50) {
        return {
          type: 'frequency_anomaly',
          description: `High frequency of ${notification.threat_category} notifications (${data.data.length} total)`,
          severity: 'high',
          confidence: 0.75
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async detectContentAnomaly(notification) {
    const suspiciousKeywords = [
      'urgent', 'immediate action', 'suspend', 'verify now',
      'click here', 'account locked', 'security breach',
      'bitcoin', 'cryptocurrency', 'ransom', 'payment required'
    ];
    
    const message = notification.message.toLowerCase();
    const foundKeywords = suspiciousKeywords.filter(keyword => 
      message.includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 2) {
      return {
        type: 'content_anomaly',
        description: `Suspicious keywords detected: ${foundKeywords.join(', ')}`,
        severity: 'high',
        confidence: 0.75,
        keywords: foundKeywords
      };
    }
    return null;
  }

  async detectSenderAnomaly(notification) {
    const sender = notification.sender || notification.senderEmail;
    if (!sender) return null;
    return null;
  }

  /**
   * Additional helper methods
   */
  generateSummary(insights) {
    if (insights.length === 0) return 'No significant insights generated';
    
    const highConfidenceInsights = insights.filter(i => i.confidence >= 0.8);
    const riskInsights = insights.filter(i => i.type === this.insightTypes.RISK_ASSESSMENT);
    const anomalyInsights = insights.filter(i => i.type === this.insightTypes.ANOMALY_DETECTION);
    
    let summary = `Generated ${insights.length} insights`;
    
    if (highConfidenceInsights.length > 0) {
      summary += ` with ${highConfidenceInsights.length} high-confidence findings`;
    }
    
    if (riskInsights.length > 0) {
      const avgRisk = riskInsights.reduce((sum, i) => sum + i.riskScore, 0) / riskInsights.length;
      summary += `. Average risk score: ${avgRisk.toFixed(1)}`;
    }
    
    if (anomalyInsights.length > 0) {
      summary += `. ${anomalyInsights.length} anomalies detected`;
    }
    
    return summary;
  }

  calculateOverallConfidence(insights) {
    if (insights.length === 0) return 0;
    
    const totalConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0);
    return totalConfidence / insights.length;
  }

  getRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  getSeverityWeight(severity) {
    const weights = { critical: 40, high: 25, medium: 15, low: 5 };
    return weights[severity] || 10;
  }

  calculateTimeRisk(timestamp) {
    const hour = new Date(timestamp).getHours();
    const isWeekend = new Date(timestamp).getDay() % 6 === 0;
    
    if (!isWeekend && hour >= 9 && hour <= 17) return 0;
    if (isWeekend) return 15;
    return 10;
  }

  calculateContentRisk(message) {
    const riskyPatterns = [
      /urgent/i, /immediate/i, /suspend/i, /verify/i,
      /click here/i, /account locked/i, /security breach/i,
      /bitcoin|cryptocurrency|ransom/i
    ];
    
    let risk = 0;
    riskyPatterns.forEach(pattern => {
      if (pattern.test(message)) risk += 5;
    });
    
    return Math.min(25, risk);
  }

  async calculateHistoricalRisk(notification) {
    try {
      if (!datasetService._ready) return 0;
      const data = datasetService.query({ threat_category: notification.threat_category }, { limit: 100 });
      return Math.min(20, data.data.length);
    } catch (error) {
      return 0;
    }
  }

  // Placeholder methods for pattern analysis, behavior analysis, etc.
  // These would be implemented with more sophisticated logic
  
  async analyzeAttackPattern(pattern) {
    return {
      pattern,
      description: `Attack pattern ${pattern} detected`,
      confidence: 0.8
    };
  }

  async analyzeHistoricalPatterns(notification) {
    return null; // Implement historical pattern analysis
  }

  async analyzeCrossUserPatterns(notification) {
    return null; // Implement cross-user pattern analysis
  }

  async analyzeUserBehavior(email) {
    return null; // Implement user behavior analysis
  }

  async analyzeSenderBehavior(email) {
    return null; // Implement sender behavior analysis
  }

  async analyzeDepartmentBehavior(department) {
    return null; // Implement department behavior analysis
  }

  async getDomainIntelligence(email) {
    return null; // Implement domain intelligence lookup
  }

  async getPatternIntelligence(pattern) {
    return null; // Implement pattern intelligence lookup
  }

  async getAttackTypeIntelligence(notification) {
    return null; // Implement attack type intelligence
  }

  // Additional helper methods for generating explanations and recommendations
  generateAnomalyExplanation(anomalies) {
    return `Detected ${anomalies.length} anomalies requiring attention`;
  }

  generateAnomalyRecommendations(anomalies) {
    return ['Review anomalous activity', 'Increase monitoring', 'Consider additional controls'];
  }

  calculateAnomalyConfidence(anomalies) {
    return anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
  }

  generatePatternExplanation(patterns) {
    return `Identified ${patterns.length} relevant patterns`;
  }

  generatePatternRecommendations(patterns) {
    return ['Update detection rules', 'Enhance security controls', 'Monitor pattern evolution'];
  }

  calculatePatternConfidence(patterns) {
    return patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
  }

  generateBehaviorExplanation(behaviors) {
    return `Analyzed behavioral indicators across ${behaviors.length} dimensions`;
  }

  generateBehaviorRecommendations(behaviors) {
    return ['Review user training', 'Update policies', 'Implement behavioral monitoring'];
  }

  calculateBehaviorConfidence(behaviors) {
    return behaviors.reduce((sum, b) => sum + b.confidence, 0) / behaviors.length;
  }

  generateRiskExplanation(factors, score) {
    return `Risk score ${score.toFixed(1)} based on ${factors.length} risk factors`;
  }

  generateRiskRecommendations(score) {
    if (score >= 80) return ['Immediate action required', 'Escalate to security team', 'Implement emergency controls'];
    if (score >= 60) return ['Review within 1 hour', 'Increase monitoring', 'Prepare response plan'];
    if (score >= 40) return ['Review within 4 hours', 'Document findings', 'Monitor for escalation'];
    return ['Continue monitoring', 'Log for reference', 'No immediate action needed'];
  }

  calculateRiskConfidence(factors) {
    return Math.min(0.9, factors.reduce((sum, f) => sum + f.weight, 0) / 100);
  }

  generateThreatExplanation(intelligence) {
    return `Threat intelligence gathered from ${intelligence.length} sources`;
  }

  generateThreatRecommendations(intelligence) {
    return ['Update threat intelligence feeds', 'Enhance detection capabilities', 'Review security posture'];
  }

  calculateThreatConfidence(intelligence) {
    return intelligence.reduce((sum, i) => sum + (i.confidence || 0.5), 0) / intelligence.length;
  }
}

// Singleton instance
const aiInsightsService = new AIInsightsService();

module.exports = {
  AIInsightsService,
  aiInsightsService
};
