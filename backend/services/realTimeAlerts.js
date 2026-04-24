/**
 * Real-Time Alerts Service
 * Backend is the ONLY emitter of real-time Socket.IO events.
 * Picks notifications from the loaded dataset and emits "new_alert" every ~5 seconds.
 */

const datasetService = require('./datasetService');
const aiExplanationEngine = require('./aiExplanationEngine');
const logger = require('../utils/logger');

const EMIT_INTERVAL_MS = 30000; // 30 seconds between live events as required

class RealTimeAlertsService {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Set();
    this._intervalId = null;
    this._setupSocketHandlers();
  }

  _setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`[realtime] Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Subscribe client to the live_alerts room
      socket.join('live_alerts');

      // Send recent items on first connect - limited to 50 high risk to prevent DOM overflow
      try {
        const { data: recent } = datasetService.query(
          { review_status: 'Pending' },
          { page: 1, limit: 50, sortBy: 'risk_score', sortOrder: 'desc', internal: true }
        );
        socket.emit('recent_alerts', { alerts: recent, timestamp: new Date() });
      } catch (err) {
        // Dataset may not be ready yet on first connection — safe to ignore
      }

      socket.on('disconnect', () => {
        logger.info(`[realtime] Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  /**
   * Start the background emit loop.
   * Must only be called AFTER datasetService.load() resolves.
   */
  startEmitLoop() {
    if (this._intervalId) return; // already running

    logger.info('[realtime] Starting real-time alert emit loop (every 20 s)');

    this._intervalId = setInterval(() => {
      try {
        if (this.connectedClients.size === 0) return; // no clients — skip

        // Select the highest risk pending item instead of purely random to provide value
        const { data: candidates } = datasetService.query(
          { review_status: 'Pending' },
          { page: 1, limit: 20, sortBy: 'risk_score', sortOrder: 'desc', internal: true }
        );

        let item = candidates[Math.floor(Math.random() * candidates.length)] || datasetService.getRandom();
        if (!item) return;

        // Enrich the selected alert with AI reasoning before emitting
        if (!item.ai_explanation) {
          const enrichment = aiExplanationEngine.generateExplanation(item);
          item = { ...item, ...enrichment };
        }

        const payload = {
          id: item.notification_id,
          title: this._generateAlertTitle(item),
          sender: item.sender,
          department: item.department,
          threatType: item.threat_category,
          severity: this._mapSeverity(item.priority, item.risk_score),
          riskScore: Math.round(item.risk_score * 100),
          explanation: item.ai_explanation || this._generateBasicExplanation(item),
          timestamp: new Date().toISOString(),
          notification: item
        };

        this.io.to('live_alerts').emit('new_alert', payload);
        logger.info(
          `[realtime] Emitted new_alert → ${item.notification_id} ` +
          `(${item.threat_category}, risk=${Math.round(item.risk_score * 100)}%) ` +
          `to ${this.connectedClients.size} client(s)`
        );
      } catch (err) {
        logger.error('[realtime] Emit loop error:', err.message);
      }
    }, EMIT_INTERVAL_MS);
  }

  stopEmitLoop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      logger.info('[realtime] Stopped real-time alert emit loop');
    }
  }

  /**
   * Broadcast a specific notification immediately (e.g., after status change).
   */
  broadcastUpdate(notification, type = 'updated') {
    this.io.to('live_alerts').emit('new_alert', {
      type,
      severity: this._mapSeverity(notification.priority, notification.risk_score),
      notification,
      timestamp: new Date().toISOString(),
    });
  }

  _mapSeverity(priority, riskScore) {
    if (riskScore >= 0.8 || priority === 'critical') return 'critical';
    if (riskScore >= 0.65 || priority === 'high') return 'high';
    if (riskScore >= 0.4 || priority === 'medium') return 'medium';
    return 'safe';
  }

  _generateAlertTitle(item) {
    const threatType = item.threat_category?.toLowerCase() || 'suspicious';
    
    if (threatType.includes('phishing')) {
      return '🚨 Phishing attempt detected in ' + (item.department || 'organization');
    } else if (threatType.includes('malware') || threatType.includes('ransomware')) {
      return '⚠️ Malware threat detected in ' + (item.department || 'organization');
    } else if (threatType.includes('bec')) {
      return '🔒 Business Email Compromise attempt detected';
    } else if (threatType.includes('suspicious') || item.risk_score >= 0.4) {
      return '⚠ Suspicious activity detected in ' + (item.department || 'organization');
    } else {
      return '✅ Safe internal notification from ' + (item.department || 'organization');
    }
  }

  _generateBasicExplanation(item) {
    const riskScore = item.risk_score || 0;
    const threatType = item.threat_category?.toLowerCase() || 'unknown';
    
    if (riskScore >= 0.7) {
      return `High risk ${threatType} detected due to suspicious sender patterns and unusual content characteristics.`;
    } else if (riskScore >= 0.4) {
      return `Suspicious activity flagged for review. Sender verification and content analysis recommended.`;
    } else {
      return `Safe notification passing all security checks. Verified internal source.`;
    }
  }

  getConnectedClientsCount() {
    return this.connectedClients.size;
  }
}

// Singleton
let instance = null;

function initializeRealTimeAlerts(io) {
  if (!instance) {
    instance = new RealTimeAlertsService(io);
    logger.info('[realtime] RealTimeAlertsService initialized');
  }
  return instance;
}

function getRealTimeAlertsService() {
  return instance;
}

module.exports = {
  initializeRealTimeAlerts,
  getRealTimeAlertsService,
};
