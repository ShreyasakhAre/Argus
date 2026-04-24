/**
 * Explainable AI (XAI) Service
 * 
 * Provides comprehensive XAI explanations including:
 * - SHAP values for feature importance
 * - LIME explanations for local interpretability  
 * - Natural language reasoning
 * - Counterfactual analysis
 * - Feature contribution analysis
 */

const mlService = require('./mlService');
const logger = require('../utils/logger');

class XAIService {
  constructor() {
    this.explanationTypes = {
      SHAP: 'shap',
      LIME: 'lime', 
      NATURAL_LANGUAGE: 'natural_language',
      COUNTERFACTUAL: 'counterfactual',
      FEATURE_IMPORTANCE: 'feature_importance'
    };
    
    this.riskLevels = {
      LOW: { min: 0, max: 39, color: 'green', label: 'Safe' },
      MEDIUM: { min: 40, max: 69, color: 'yellow', label: 'Suspicious' },
      HIGH: { min: 70, max: 100, color: 'red', label: 'High Risk' }
    };
  }

  /**
   * Generate comprehensive XAI explanation for a notification
   */
  async generateExplanation(notification, options = {}) {
    try {
      const {
        includeShap = true,
        includeLime = false, // LIME requires additional setup
        includeCounterfactual = true,
        includeFeatureImportance = true,
        includeNaturalLanguage = true
      } = options;

      // Get ML prediction first
      const mlPrediction = await mlService.predict({
        subject: notification.subject || notification.title || '',
        body: notification.content || notification.message || '',
        sender: notification.sender || 'unknown@external.com',
        department: notification.department || 'Unknown',
        links: notification.contains_url ? 1 : 0,
        attachments: notification.attachment_type || 'none',
        channel: notification.channel || 'Email',
        receiver: notification.receiver || 'employee@company.com',
        timestamp: notification.timestamp,
      });

      const explanation = {
        notificationId: notification.notification_id || notification.id,
        prediction: mlPrediction,
        riskLevel: this.getRiskLevel(mlPrediction.riskScore),
        explanations: {},
        timestamp: new Date(),
        summary: ''
      };

      // Generate different types of explanations
      if (includeShap) {
        explanation.explanations.shap = this.generateShapExplanation(mlPrediction);
      }

      if (includeFeatureImportance) {
        explanation.explanations.featureImportance = this.generateFeatureImportanceExplanation(mlPrediction);
      }

      if (includeCounterfactual) {
        explanation.explanations.counterfactual = await this.generateCounterfactualExplanation(notification, mlPrediction);
      }

      if (includeNaturalLanguage) {
        explanation.explanations.naturalLanguage = this.generateNaturalLanguageExplanation(notification, mlPrediction);
      }

      // Generate summary
      explanation.summary = this.generateExplanationSummary(explanation);

      return explanation;

    } catch (error) {
      logger.error('Failed to generate XAI explanation:', error);
      return {
        notificationId: notification.notification_id || notification.id,
        error: error.message,
        explanations: {},
        summary: 'Explanation generation failed'
      };
    }
  }

  /**
   * Generate SHAP-based explanation
   */
  generateShapExplanation(mlPrediction) {
    const shapValues = mlPrediction.shapValues || {};
    const topFeatures = mlPrediction.topFeatures || [];

    // Process SHAP values into human-readable format
    const features = Object.entries(shapValues)
      .map(([feature, value]) => ({
        name: feature,
        impact: parseFloat(value),
        importance: Math.abs(parseFloat(value)),
        direction: parseFloat(value) > 0 ? 'increases_risk' : 'decreases_risk'
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);

    // Combine with top features from model
    const combinedFeatures = [...features, ...topFeatures.map(f => ({
      name: f.feature,
      impact: f.impact,
      importance: Math.abs(f.impact),
      direction: f.impact > 0 ? 'increases_risk' : 'decreases_risk'
    }))];

    return {
      type: this.explanationTypes.SHAP,
      features: combinedFeatures.slice(0, 10),
      summary: this.generateShapSummary(combinedFeatures.slice(0, 5)),
      chartData: this.generateShapChartData(combinedFeatures.slice(0, 10))
    };
  }

  /**
   * Generate feature importance explanation
   */
  generateFeatureImportanceExplanation(mlPrediction) {
    const topFeatures = mlPrediction.topFeatures || [];
    const reasons = mlPrediction.reasons || [];

    return {
      type: this.explanationTypes.FEATURE_IMPORTANCE,
      textFeatures: topFeatures.filter(f => this.isTextFeature(f.feature)),
      metadataFeatures: topFeatures.filter(f => !this.isTextFeature(f.feature)),
      reasons: reasons,
      summary: this.generateFeatureImportanceSummary(topFeatures, reasons)
    };
  }

  /**
   * Generate counterfactual explanation (what would need to change to get different result)
   */
  async generateCounterfactualExplanation(notification, mlPrediction) {
    const counterfactuals = [];

    // Generate counterfactual scenarios based on key features
    if (mlPrediction.riskScore > 40) {
      // High risk - what would make it safe?
      const scenarios = [
        {
          scenario: 'Remove urgent language',
          changes: ['Remove words like "urgent", "immediate", "asap"'],
          expectedRiskReduction: 15
        },
        {
          scenario: 'Use trusted sender domain',
          changes: ['Change sender to internal company domain'],
          expectedRiskReduction: 25
        },
        {
          scenario: 'Remove suspicious links',
          changes: ['Remove external URLs or verify domain'],
          expectedRiskReduction: 20
        },
        {
          scenario: 'Remove credential requests',
          changes: ['Remove password/login/verification requests'],
          expectedRiskReduction: 30
        }
      ];

      counterfactuals.push(...scenarios);
    }

    return {
      type: this.explanationTypes.COUNTERFACTUAL,
      scenarios: counterfactuals,
      summary: counterfactuals.length > 0 
        ? `This could be made safer by: ${counterfactuals.map(c => c.scenario).join(', ')}`
        : 'No significant counterfactual scenarios identified'
    };
  }

  /**
   * Generate natural language explanation
   */
  generateNaturalLanguageExplanation(notification, mlPrediction) {
    const { label, riskScore, confidence, reasons } = mlPrediction;
    const riskLevel = this.getRiskLevel(riskScore);

    let explanation = `This notification was classified as **${label}** with a risk score of **${riskScore}/100** (${riskLevel.label}). `;

    if (confidence >= 0.9) {
      explanation += 'The model is **very confident** in this prediction. ';
    } else if (confidence >= 0.7) {
      explanation += 'The model is **moderately confident** in this prediction. ';
    } else {
      explanation += 'The model has **low confidence** in this prediction. ';
    }

    if (reasons && reasons.length > 0) {
      explanation += '\n\n**Key indicators:**\n';
      reasons.forEach((reason, index) => {
        explanation += `${index + 1}. ${reason}\n`;
      });
    }

    // Add contextual explanation
    if (notification.sender && !notification.sender.includes('company.com')) {
      explanation += '\n**External Sender Warning:** This message comes from outside the organization.';
    }

    if (notification.contains_url) {
      explanation += '\n**Link Detection:** This message contains external links that may lead to malicious sites.';
    }

    if (notification.attachment_type && notification.attachment_type !== 'none') {
      explanation += `\n**Attachment Alert:** This message contains a ${notification.attachment_type} attachment.`;
    }

    return {
      type: this.explanationTypes.NATURAL_LANGUAGE,
      text: explanation,
      riskAssessment: this.generateRiskAssessment(mlPrediction),
      recommendations: [mlPrediction.recommendedAction],
      keyFactors: reasons?.slice(0, 3) || []
    };
  }

  /**
   * Get risk level based on score
   */
  getRiskLevel(score) {
    for (const [key, level] of Object.entries(this.riskLevels)) {
      if (score >= level.min && score <= level.max) {
        return { ...level, key };
      }
    }
    return this.riskLevels.LOW;
  }

  /**
   * Generate SHAP summary text
   */
  generateShapSummary(features) {
    if (features.length === 0) return 'No significant feature contributions identified.';

    const topRiskIncreasing = features.filter(f => f.direction === 'increases_risk').slice(0, 3);
    const topRiskDecreasing = features.filter(f => f.direction === 'decreases_risk').slice(0, 2);

    let summary = 'Top risk factors: ';
    
    if (topRiskIncreasing.length > 0) {
      summary += topRiskIncreasing.map(f => f.name.replace(/_/g, ' ')).join(', ');
    }

    if (topRiskDecreasing.length > 0) {
      summary += ' | Protective factors: ' + topRiskDecreasing.map(f => f.name.replace(/_/g, ' ')).join(', ');
    }

    return summary;
  }

  /**
   * Generate chart data for SHAP visualization
   */
  generateShapChartData(features) {
    return {
      labels: features.map(f => f.name.replace(/_/g, ' ')),
      values: features.map(f => f.impact),
      colors: features.map(f => f.direction === 'increases_risk' ? '#ef4444' : '#22c55e')
    };
  }

  /**
   * Generate feature importance summary
   */
  generateFeatureImportanceSummary(features, reasons) {
    const textFeatures = features.filter(f => this.isTextFeature(f.feature));
    const metaFeatures = features.filter(f => !this.isTextFeature(f.feature));

    let summary = '';
    
    if (textFeatures.length > 0) {
      summary += `Key text indicators: ${textFeatures.slice(0, 3).map(f => f.feature).join(', ')}. `;
    }

    if (metaFeatures.length > 0) {
      summary += `Metadata factors: ${metaFeatures.slice(0, 2).map(f => f.feature).join(', ')}. `;
    }

    return summary || 'No dominant features identified.';
  }

  /**
   * Generate risk assessment text
   */
  generateRiskAssessment(mlPrediction) {
    const { label, riskScore, confidence } = mlPrediction;
    const riskLevel = this.getRiskLevel(riskScore);

    let assessment = '';

    if (riskLevel.key === 'LOW') {
      assessment = 'This appears to be legitimate communication with minimal risk indicators.';
    } else if (riskLevel.key === 'MEDIUM') {
      assessment = 'This shows some suspicious characteristics that warrant review.';
    } else {
      assessment = 'This exhibits high-risk characteristics and requires immediate attention.';
    }

    return assessment;
  }

  /**
   * Generate overall explanation summary
   */
  generateExplanationSummary(explanation) {
    const { prediction, explanations } = explanation;
    const { label, riskScore, confidence } = prediction;

    let summary = `**${label}** detected with ${riskScore}/100 risk score. `;

    if (explanations.naturalLanguage) {
      summary += explanations.naturalLanguage.text.split('\n')[0] + ' ';
    }

    if (explanations.shap) {
      summary += explanations.shap.summary;
    }

    return summary;
  }

  /**
   * Check if feature is a text feature
   */
  isTextFeature(featureName) {
    const textIndicators = ['verify', 'password', 'login', 'urgent', 'click', 'account', 'immediate'];
    return textIndicators.some(indicator => featureName.toLowerCase().includes(indicator));
  }

  /**
   * Generate batch explanations for multiple notifications
   */
  async generateBatchExplanations(notifications, options = {}) {
    const explanations = [];
    
    for (const notification of notifications) {
      const explanation = await this.generateExplanation(notification, options);
      explanations.push(explanation);
    }

    return explanations;
  }

  /**
   * Get explanation statistics for analytics
   */
  getExplanationStatistics(explanations) {
    const stats = {
      totalExplanations: explanations.length,
      riskDistribution: {},
      averageConfidence: 0,
      topFeatures: {},
      explanationTypes: {}
    };

    explanations.forEach(exp => {
      // Risk distribution
      const riskLevel = exp.riskLevel?.key || 'UNKNOWN';
      stats.riskDistribution[riskLevel] = (stats.riskDistribution[riskLevel] || 0) + 1;

      // Confidence
      if (exp.prediction?.confidence) {
        stats.averageConfidence += exp.prediction.confidence;
      }

      // Top features
      if (exp.explanations?.shap?.features) {
        exp.explanations.shap.features.forEach(feature => {
          stats.topFeatures[feature.name] = (stats.topFeatures[feature.name] || 0) + 1;
        });
      }

      // Explanation types
      Object.keys(exp.explanations || {}).forEach(type => {
        stats.explanationTypes[type] = (stats.explanationTypes[type] || 0) + 1;
      });
    });

    stats.averageConfidence = explanations.length > 0 ? stats.averageConfidence / explanations.length : 0;

    return stats;
  }
}

module.exports = new XAIService();
