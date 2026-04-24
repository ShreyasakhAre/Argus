/**
 * ARGUS Express Backend — Main Entry Point
 *
 * Startup order:
 *   1. Load argus_notifications_10000.csv into datasetService
 *   2. Create HTTP + Socket.IO server
 *   3. Register all routes
 *   4. Start listening
 *   5. Start real-time alert emit loop (ONLY after dataset is loaded)
 *
 * Backend is the ONLY source of truth.
 * No MongoDB required — all data served from in-memory dataset.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const datasetService = require('./services/datasetService');
const { initializeRealTimeAlerts } = require('./services/realTimeAlerts');
const { JWT_SECRET } = require('./middleware/authMiddleware');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/authRoutes');
const alertRoutes = require('./routes/alertRoutes');
const fraudAnalystRoutes = require('./routes/fraudAnalystRoutes');
const attackMapRoutes = require('./routes/attackMapRoutes');
const aiInsightsRoutes = require('./routes/aiInsightsRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const policyRoutes = require('./routes/policyRoutes');
const riskScoringRoutes = require('./routes/riskScoringRoutes');
const threatIntelligenceRoutes = require('./routes/threatIntelligenceRoutes');
const agentRoutes = require('./routes/agentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const scanRoutes = require('./routes/scanRoutes');
const statsRoutes = require('./routes/statsRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const dashboardAnalyticsService = require('./services/dashboardAnalyticsService');

// ─── Express App ───────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// ─── HTTP + Socket.IO ──────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      process.env.FRONTEND_URL || 'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);
global.io = io;

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'ARGUS backend is running.',
    dataset: {
      loaded: datasetService._ready,
      size: datasetService.size,
    },
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/fraud-analyst', fraudAnalystRoutes);
app.use('/api/risk-scoring', riskScoringRoutes);
app.use('/api/risk', riskScoringRoutes);
app.use('/api/attacks', attackMapRoutes);
app.use('/api/insights', aiInsightsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/threats', threatIntelligenceRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/scan-link', scanRoutes);
app.use('/api/scan-qr', scanRoutes);

app.get('/api/analytics', (req, res) => {
  try {
    return res.json(dashboardAnalyticsService.getAnalytics(req.query));
  } catch (err) {
    console.error('GET /api/analytics error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/notifications', (req, res) => {
  try {
    const summary = dashboardAnalyticsService.buildNotificationSummary(req.query, {
      limit: Number.parseInt(req.query.limit || '1000', 10) || 1000,
    });
    return res.json({ success: true, ...summary });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/notifications/read', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Notification ID is required.' });
    }

    const updated = datasetService.updateStatus(id, { review_status: 'Approved' });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('POST /api/notifications/read error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/notifications/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = datasetService.updateStatus(id, { review_status: 'Rejected' });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('DELETE /api/notifications/:id error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Test endpoint without authentication for verification
app.get('/api/test-data', (req, res) => {
  try {
    const stats = datasetService.getStats({});
    const alerts = datasetService.query({}, { limit: 100 });
    
    return res.json({
      success: true,
      data: {
        totalAlerts: stats.totalAlerts,
        sampleAlerts: alerts.data.slice(0, 5),
        datasetSize: datasetService.size
      }
    });
  } catch (err) {
    console.error('GET /api/test-data error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Authentication bypass for testing
const jwt = require('jsonwebtoken');

app.post('/api/auth/test-login', (req, res) => {
  try {
    const { role = 'admin' } = req.body;
    
    // Create proper JWT token
    const payload = {
      email: 'test@argus.com',
      role: role,
      org_id: 'ORG001',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    const testToken = jwt.sign(payload, JWT_SECRET);
    
    return res.json({
      success: true,
      token: testToken,
      user: {
        email: 'test@argus.com',
        name: 'Test User',
        role: role,
        org_id: 'ORG001'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Retrain endpoint for admin dashboard
app.post('/api/retrain', (req, res) => {
  try {
    console.log('Retraining model...');
    // Simulate retraining
    setTimeout(() => {
      console.log('Model retraining completed');
    }, 3000);
    
    return res.json({
      success: true,
      message: 'Model retraining initiated'
    });
  } catch (err) {
    console.error('POST /api/retrain error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Export endpoint for admin dashboard
app.get('/api/export', (req, res) => {
  try {
    const { format, org_id } = req.query;
    const filters = org_id ? { org_id } : {};
    const result = datasetService.query(filters, { limit: 10000 });
    
    if (format === 'csv') {
      const csv = [
        'notification_id,timestamp,department,threat_category,risk_score,is_malicious,review_status',
        ...result.data.map(item => 
          `${item.notification_id},${item.timestamp},${item.department},${item.threat_category},${item.risk_score},${item.is_malicious},${item.review_status}`
        )
      ].join('\n');
      
      return res.json({
        success: true,
        content: csv,
        filename: `argus_export_${new Date().toISOString().split('T')[0]}.csv`
      });
    } else {
      return res.json({
        success: true,
        content: JSON.stringify(result.data, null, 2),
        filename: `argus_export_${new Date().toISOString().split('T')[0]}.json`
      });
    }
  } catch (err) {
    console.error('GET /api/export error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Stats shorthand — same as analytics but lighter
app.get('/api/stats', (req, res) => {
  try {
    console.log(`[api] GET /api/stats - Query:`, JSON.stringify(req.query));
    const stats = datasetService.getStats(req.query);
    console.log(`[api] Stats response calculated for ${stats.totalAlerts} alerts`);
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error(`[api] GET /api/stats error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// AI Explanation endpoint
app.get('/api/explain/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[api] GET /api/explain/${id}`);
    
    const notification = datasetService.getById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    const aiExplanationEngine = require('./services/aiExplanationEngine');
    const explanation = aiExplanationEngine.generateExplanation(notification);
    
    return res.json({ success: true, data: explanation });
  } catch (err) {
    console.error(`[api] GET /api/explain/${req.params.id} error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Live Attack Map endpoint
app.get('/api/attacks', (req, res) => {
  try {
    console.log(`[api] GET /api/attacks`);

    const map = dashboardAnalyticsService.getAttackMapData(req.query || {});
    const departments = Array.isArray(map.departments) ? map.departments : [];

    return res.json({
      success: true,
      data: {
        departments,
        nodes: departments.map((dept) => ({
          id: dept.id,
          label: dept.name,
          val: dept.totalAttacks,
          risk: dept.riskScore,
        })),
        summary: {
          totalDepartments: departments.length,
          highestRiskDept: map.summary?.mostTargetedDepartment || 'N/A',
          totalAttacks: map.summary?.totalAttacks || 0,
          activeThreats: map.summary?.highRiskDepartments || 0,
        },
      },
    });
  } catch (err) {
    console.error(`[api] GET /api/attacks error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Risk Assessment endpoint
app.get('/api/risk', (req, res) => {
  try {
    console.log(`[api] GET /api/risk`);
    
    const stats = datasetService.getStats(req.query);
    const riskData = {
      overallRisk: Math.round((stats.flagged / stats.totalAlerts) * 100),
      riskLevels: {
        critical: stats.highRiskCount || 0,
        high: stats.maliciousCount || 0,
        medium: Math.floor(stats.totalAlerts * 0.2),
        low: stats.benign || 0
      },
      riskByDepartment: Object.entries(stats.department_stats || {}).map(([dept, data]) => ({
        department: dept,
        riskScore: Math.round((data.flagged / data.total) * 100),
        totalAlerts: data.total,
        flaggedAlerts: data.flagged,
        riskLevel: data.flagged / data.total > 0.2 ? 'High' : data.flagged / data.total > 0.1 ? 'Medium' : 'Low'
      })),
      trends: {
        last24h: Math.floor(stats.totalAlerts * 0.3),
        last7d: stats.totalAlerts,
        riskTrend: 'stable'
      }
    };
    
    return res.json({ success: true, data: riskData });
  } catch (err) {
    console.error(`[api] GET /api/risk error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Catch-all for unknown routes
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Startup ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    // Step 1: Load dataset — MUST succeed before anything else
    console.log('[server] Loading dataset...');
    await datasetService.load();
    console.log('[server] Dataset loaded. Initializing services...');

    // Step 1.5: Initialize services that depend on dataset
    try {
      const { initializePolicyEngine } = require('./services/policyEngine');
      await initializePolicyEngine();
      logger.info('[server] Policy engine initialized');
    } catch (err) {
      logger.error('[server] Failed to initialize policy engine:', err.message);
    }

    try {
      const { threatIntelligenceService } = require('./services/threatIntelligenceService');
      threatIntelligenceService.ensureInitialized();
      logger.info('[server] Threat intelligence service initialized');
    } catch (err) {
      logger.error('[server] Failed to initialize threat intelligence service:', err.message);
    }

    // Step 2: Initialize real-time service (socket handlers registered)
    const rtService = initializeRealTimeAlerts(io);

    // Step 3: Start listening with port conflict handling
    let serverStarted = false;
    let recoveryInProgress = false;

    const startServer = (port) => {
      if (serverStarted) {
        logger.warn(`[server] startServer(${port}) ignored because server is already running.`);
        return;
      }

      server.listen(port, () => {
        if (serverStarted) return;
        serverStarted = true;
        recoveryInProgress = false;

        logger.info(`[server] ARGUS backend listening on port ${port}`);
        logger.info(`[server] Dataset: ${datasetService.size} records loaded`);
        logger.info('[server] Socket.IO ready');

        // Step 4: Start emit loop ONLY after dataset is confirmed loaded
        rtService.startEmitLoop();
        logger.info('[server] Real-time alert emit loop started');
      });
    };

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        if (recoveryInProgress || serverStarted) {
          logger.warn('[server] Port recovery already in progress or server already started; skipping duplicate recovery.');
          return;
        }

        recoveryInProgress = true;
        logger.warn(`[server] Port ${PORT} is already in use.`);
        
        // Attempt to kill the process on that port if on Windows
        if (process.platform === 'win32') {
          logger.info(`[server] Attempting to resolve port conflict on ${PORT}...`);
          try {
            const { execSync } = require('child_process');
            // Find PID on port
            const stdout = execSync(`netstat -ano | findstr :${PORT}`).toString();
            const lines = stdout.split('\n').filter(l => l.includes('LISTENING'));
            if (lines.length > 0) {
              const pid = lines[0].trim().split(/\s+/).pop();
              if (pid && pid !== '0' && pid !== process.pid.toString()) {
                logger.info(`[server] Killing process ${pid} on port ${PORT}...`);
                execSync(`taskkill /F /PID ${pid}`);
                // Give it a moment to release
                setTimeout(() => startServer(PORT), 1000);
                return;
              }
            }
          } catch (err) {
            logger.error(`[server] Failed to kill process on port ${PORT}: ${err.message}`);
          }
        }

        const FALLBACK_PORT = parseInt(PORT) + 1;
        logger.info(`[server] Falling back to port ${FALLBACK_PORT}...`);
        startServer(FALLBACK_PORT);
      } else {
        logger.error(`[server] Server error: ${e.message}`);
      }
    });

    startServer(PORT);
  } catch (error) {
    // If dataset fails to load, the server MUST NOT start
    logger.error('[server] FATAL startup error:', error.message);
    process.exit(1);
  }
}

start();
