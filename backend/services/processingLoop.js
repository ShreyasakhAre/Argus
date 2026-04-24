/**
 * ARGUS Processing Loop
 * 
 * Continuous processing engine using datasetService (no MongoDB)
 */

const datasetService = require('./datasetService');
const logger = require('../utils/logger');

class ProcessingLoop {
  constructor() {
    this.isRunning = false;
    this.processingInterval = null;
    this.batchSize = 10;
    this.processingDelay = 5000;
    this.lastProcessedIndex = 0;
    this.stats = {
      totalBatches: 0,
      totalProcessed: 0,
      errors: 0,
      startTime: null
    };
    this.activityLog = [];
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Processing loop is already running');
      return;
    }
    this.isRunning = true;
    this.stats.startTime = new Date();
    logger.info('Starting ARGUS processing loop (dataset mode)');

    this.processingInterval = setInterval(async () => {
      try {
        await this.processBatch();
      } catch (error) {
        logger.error('Processing batch error:', error);
        this.stats.errors++;
      }
    }, this.processingDelay);
  }

  async stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    logger.info('Processing loop stopped');
  }

  async processBatch() {
    try {
      if (!datasetService._ready) return;
      const allData = datasetService.query({ review_status: 'Pending' }, { limit: this.batchSize });
      if (!allData.data || allData.data.length === 0) return;

      for (const notification of allData.data) {
        this.activityLog.unshift({
          id: notification.notification_id,
          message: notification.content ? notification.content.substring(0, 60) + '...' : '',
          severity: notification.risk_score >= 0.7 ? 'critical' : notification.risk_score >= 0.4 ? 'high' : 'low',
          timestamp: notification.timestamp || new Date(),
          status: notification.review_status || 'Pending',
          actionsTaken: 1,
          policiesExecuted: 0,
          lastProcessed: new Date()
        });
        this.stats.totalProcessed++;
      }

      if (this.activityLog.length > 200) {
        this.activityLog = this.activityLog.slice(0, 200);
      }

      this.stats.totalBatches++;
    } catch (error) {
      logger.error('Batch processing failed:', error);
      this.stats.errors++;
    }
  }

  getStats() {
    const uptime = this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0;
    return {
      ...this.stats,
      isRunning: this.isRunning,
      uptime,
      processingRate: uptime > 0 ? (this.stats.totalProcessed / (uptime / 1000)).toFixed(2) : 0,
      errorRate: this.stats.totalProcessed > 0 ? ((this.stats.errors / this.stats.totalProcessed) * 100).toFixed(2) : 0
    };
  }

  updateConfig(newConfig) {
    if (newConfig.batchSize) this.batchSize = Math.max(1, Math.min(50, newConfig.batchSize));
    if (newConfig.processingDelay) {
      this.processingDelay = Math.max(1000, Math.min(30000, newConfig.processingDelay));
      if (this.isRunning && this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = setInterval(async () => {
          try { await this.processBatch(); }
          catch (error) { logger.error('Processing batch error:', error); this.stats.errors++; }
        }, this.processingDelay);
      }
    }
  }

  async processAlert(alertId) {
    try {
      const result = datasetService.query({ notification_id: alertId }, { limit: 1 });
      if (!result.data || result.data.length === 0) throw new Error(`Alert not found: ${alertId}`);
      this.stats.totalProcessed++;
      return { success: true, notification: result.data[0] };
    } catch (error) {
      logger.error(`Manual processing failed for alert ${alertId}:`, error);
      this.stats.errors++;
      throw error;
    }
  }

  async getActivity(limit = 50) {
    return this.activityLog.slice(0, limit);
  }
}

const processingLoop = new ProcessingLoop();

module.exports = {
  ProcessingLoop,
  processingLoop
};
