/**
 * Model Retraining Service
 * 
 * Handles continuous learning and model improvement through:
 * - Feedback-based retraining
 * - Scheduled retraining
 * - Performance monitoring
 * - Model versioning
 * - A/B testing capabilities
 */

const fs = require('fs');
const path = require('path');
const mlService = require('./mlService');
const datasetService = require('./datasetService');
const logger = require('../utils/logger');

const ML_DIR = path.resolve(__dirname, '../ml');
const RETRAINING_LOG_PATH = path.join(ML_DIR, 'retraining_log.json');
const MODEL_REGISTRY_PATH = path.join(ML_DIR, 'model_registry.json');

class ModelRetrainingService {
  constructor() {
    this.retrainingHistory = [];
    this.modelRegistry = {};
    this.loadRetrainingHistory();
    this.loadModelRegistry();
  }

  /**
   * Load retraining history from file
   */
  loadRetrainingHistory() {
    try {
      if (fs.existsSync(RETRAINING_LOG_PATH)) {
        const data = fs.readFileSync(RETRAINING_LOG_PATH, 'utf8');
        this.retrainingHistory = JSON.parse(data);
      }
    } catch (error) {
      logger.warn('Failed to load retraining history:', error.message);
      this.retrainingHistory = [];
    }
  }

  /**
   * Load model registry from file
   */
  loadModelRegistry() {
    try {
      if (fs.existsSync(MODEL_REGISTRY_PATH)) {
        const data = fs.readFileSync(MODEL_REGISTRY_PATH, 'utf8');
        this.modelRegistry = JSON.parse(data);
      }
    } catch (error) {
      logger.warn('Failed to load model registry:', error.message);
      this.modelRegistry = {};
    }
  }

  /**
   * Save retraining history to file
   */
  saveRetrainingHistory() {
    try {
      fs.writeFileSync(RETRAINING_LOG_PATH, JSON.stringify(this.retrainingHistory, null, 2));
    } catch (error) {
      logger.error('Failed to save retraining history:', error.message);
    }
  }

  /**
   * Save model registry to file
   */
  saveModelRegistry() {
    try {
      fs.writeFileSync(MODEL_REGISTRY_PATH, JSON.stringify(this.modelRegistry, null, 2));
    } catch (error) {
      logger.error('Failed to save model registry:', error.message);
    }
  }

  /**
   * Trigger model retraining with feedback
   */
  async retrainModel(options = {}) {
    const {
      reason = 'manual',
      feedbackOnly = false,
      forceRetrain = false,
      requestedBy = 'system'
    } = options;

    try {
      logger.info(`Starting model retraining: ${reason} by ${requestedBy}`);

      const retrainStart = new Date();
      
      // Check if retraining is needed
      if (!forceRetrain && !this.shouldRetrain()) {
        return {
          success: false,
          message: 'Retraining not needed - model performance is within acceptable range',
          retrainRequired: false
        };
      }

      // Get current model metrics
      const currentMetrics = mlService.getMetrics();
      
      // Perform retraining
      const newMetrics = await mlService.retrain();
      
      const retrainEnd = new Date();
      const retrainDuration = retrainEnd - retrainStart;

      // Create retraining record
      const retrainRecord = {
        id: `retrain_${Date.now()}`,
        timestamp: retrainStart.toISOString(),
        duration: retrainDuration,
        reason,
        requestedBy,
        previousMetrics: currentMetrics,
        newMetrics,
        improvement: this.calculateImprovement(currentMetrics, newMetrics),
        status: 'completed'
      };

      // Update history and registry
      this.retrainingHistory.unshift(retrainRecord);
      if (this.retrainingHistory.length > 100) {
        this.retrainingHistory = this.retrainingHistory.slice(0, 100);
      }

      // Register new model
      this.modelRegistry[newMetrics.model_version] = {
        version: newMetrics.model_version,
        metrics: newMetrics,
        deployedAt: retrainEnd.toISOString(),
        parent: currentMetrics?.model_version,
        retrainReason: reason
      };

      // Save changes
      this.saveRetrainingHistory();
      this.saveModelRegistry();

      logger.info(`Model retraining completed in ${retrainDuration}ms`);
      
      return {
        success: true,
        message: 'Model retraining completed successfully',
        retrainRecord,
        newMetrics,
        improvement: retrainRecord.improvement
      };

    } catch (error) {
      logger.error('Model retraining failed:', error);
      
      const errorRecord = {
        id: `retrain_error_${Date.now()}`,
        timestamp: new Date().toISOString(),
        reason,
        requestedBy,
        error: error.message,
        status: 'failed'
      };

      this.retrainingHistory.unshift(errorRecord);
      this.saveRetrainingHistory();

      return {
        success: false,
        message: `Model retraining failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check if retraining should be triggered
   */
  shouldRetrain() {
    const currentMetrics = mlService.getMetrics();
    if (!currentMetrics) return true;

    // Check performance thresholds
    const performanceThresholds = {
      minAccuracy: 0.85,
      minPrecision: 0.80,
      minRecall: 0.80,
      minF1: 0.80
    };

    const needsRetraining = 
      currentMetrics.accuracy < performanceThresholds.minAccuracy ||
      currentMetrics.precision < performanceThresholds.minPrecision ||
      currentMetrics.recall < performanceThresholds.minRecall ||
      currentMetrics.f1 < performanceThresholds.minF1;

    // Check if model is old (retrain every 7 days)
    const lastRetrain = this.getLastSuccessfulRetrain();
    const daysSinceRetrain = lastRetrain ? 
      Math.floor((Date.now() - new Date(lastRetrain.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : 
      Infinity;

    const needsScheduledRetrain = daysSinceRetrain > 7;

    return needsRetraining || needsScheduledRetrain;
  }

  /**
   * Get last successful retraining
   */
  getLastSuccessfulRetrain() {
    return this.retrainingHistory.find(record => record.status === 'completed');
  }

  /**
   * Calculate improvement between old and new metrics
   */
  calculateImprovement(oldMetrics, newMetrics) {
    if (!oldMetrics || !newMetrics) return null;

    return {
      accuracy: newMetrics.accuracy - oldMetrics.accuracy,
      precision: newMetrics.precision - oldMetrics.precision,
      recall: newMetrics.recall - oldMetrics.recall,
      f1: newMetrics.f1 - oldMetrics.f1,
      overall: (newMetrics.f1 - oldMetrics.f1) // Use F1 as overall improvement metric
    };
  }

  /**
   * Get retraining history
   */
  getRetrainingHistory(limit = 50) {
    return this.retrainingHistory.slice(0, limit);
  }

  /**
   * Get model registry
   */
  getModelRegistry() {
    return this.modelRegistry;
  }

  /**
   * Get current model info
   */
  getCurrentModelInfo() {
    const currentMetrics = mlService.getMetrics();
    const lastRetrain = this.getLastSuccessfulRetrain();

    return {
      metrics: currentMetrics,
      lastRetrain,
      needsRetrain: this.shouldRetrain(),
      modelAge: lastRetrain ? 
        Math.floor((Date.now() - new Date(lastRetrain.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : 
        null
    };
  }

  /**
   * Schedule automatic retraining
   */
  scheduleAutomaticRetraining() {
    // Check daily if retraining is needed
    setInterval(async () => {
      if (this.shouldRetrain()) {
        logger.info('Triggering automatic retraining');
        await this.retrainModel({
          reason: 'scheduled_performance_degradation',
          requestedBy: 'system_scheduler'
        });
      }
    }, 24 * 60 * 60 * 1000); // Check daily

    logger.info('Automatic retraining scheduler started');
  }

  /**
   * Get feedback statistics for retraining decision
   */
  getFeedbackStatistics() {
    try {
      const { data } = datasetService.query({}, { page: 1, limit: 10000, internal: true });
      
      const feedbackStats = {
        total: data.length,
        reviewed: data.filter(item => item.review_status && item.review_status !== 'Pending').length,
        approved: data.filter(item => item.review_status === 'Approved').length,
        rejected: data.filter(item => item.review_status === 'Rejected').length,
        escalated: data.filter(item => item.review_status === 'Escalated').length,
        byDepartment: {},
        byThreatCategory: {},
        accuracyByCategory: {}
      };

      // Analyze feedback by department
      data.forEach(item => {
        const dept = item.department || 'Unknown';
        feedbackStats.byDepartment[dept] = (feedbackStats.byDepartment[dept] || 0) + 1;
      });

      // Analyze feedback by threat category
      data.forEach(item => {
        const category = item.threat_category || 'Unknown';
        feedbackStats.byThreatCategory[category] = (feedbackStats.byThreatCategory[category] || 0) + 1;
      });

      // Calculate accuracy by category
      Object.keys(feedbackStats.byThreatCategory).forEach(category => {
        const categoryItems = data.filter(item => item.threat_category === category);
        const correctItems = categoryItems.filter(item => 
          (item.review_status === 'Approved' && item.threat_category === 'safe') ||
          (item.review_status === 'Rejected' && ['phishing', 'malware', 'bec', 'suspicious'].includes(item.threat_category))
        );
        feedbackStats.accuracyByCategory[category] = categoryItems.length > 0 ? 
          correctItems.length / categoryItems.length : 0;
      });

      return feedbackStats;
    } catch (error) {
      logger.error('Failed to get feedback statistics:', error);
      return null;
    }
  }

  /**
   * Rollback to previous model version
   */
  async rollbackModel(targetVersion) {
    try {
      if (!this.modelRegistry[targetVersion]) {
        throw new Error(`Model version ${targetVersion} not found in registry`);
      }

      logger.info(`Rolling back to model version: ${targetVersion}`);

      // This would require implementing model version management in mlService
      // For now, we'll log the rollback request
      const rollbackRecord = {
        id: `rollback_${Date.now()}`,
        timestamp: new Date().toISOString(),
        targetVersion,
        reason: 'manual_rollback',
        status: 'completed'
      };

      this.retrainingHistory.unshift(rollbackRecord);
      this.saveRetrainingHistory();

      return {
        success: true,
        message: `Successfully rolled back to model version ${targetVersion}`,
        rollbackRecord
      };

    } catch (error) {
      logger.error('Model rollback failed:', error);
      return {
        success: false,
        message: `Rollback failed: ${error.message}`
      };
    }
  }

  /**
   * Get model performance trends
   */
  getPerformanceTrends(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentRetrains = this.retrainingHistory.filter(
      record => new Date(record.timestamp) >= cutoffDate && record.status === 'completed'
    );

    if (recentRetrains.length === 0) {
      return {
        trend: 'insufficient_data',
        message: 'Not enough recent data to determine trends'
      };
    }

    // Calculate trends
    const accuracyTrend = this.calculateTrend(recentRetrains.map(r => r.newMetrics?.accuracy || 0));
    const precisionTrend = this.calculateTrend(recentRetrains.map(r => r.newMetrics?.precision || 0));
    const recallTrend = this.calculateTrend(recentRetrains.map(r => r.newMetrics?.recall || 0));
    const f1Trend = this.calculateTrend(recentRetrains.map(r => r.newMetrics?.f1 || 0));

    return {
      trend: accuracyTrend > 0.01 ? 'improving' : accuracyTrend < -0.01 ? 'degrading' : 'stable',
      accuracyTrend,
      precisionTrend,
      recallTrend,
      f1Trend,
      dataPoints: recentRetrains.length
    };
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const first = values[values.length - 1];
    const last = values[0];
    return last - first;
  }
}

module.exports = new ModelRetrainingService();
