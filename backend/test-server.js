/**
 * ARGUS Test Server - No MongoDB Required
 * 
 * Simplified server for testing all new features
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import services (they work without MongoDB)
const { processingLoop } = require("./services/processingLoop");
const { riskScoringService } = require("./services/riskScoringService");
const { aiInsightsService } = require("./services/aiInsightsService");
const { threatIntelligenceService } = require("./services/threatIntelligenceService");
const { getAttackMapData } = require("./services/attackMapService");

const app = express();
const port = process.env.BACKEND_PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests" }
});
app.use(limiter);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ARGUS test server is running",
    timestamp: new Date(),
    services: {
      processingLoop: !!processingLoop,
      riskScoring: !!riskScoringService,
      aiInsights: !!aiInsightsService,
      threatIntelligence: !!threatIntelligenceService,
      attackMap: !!getAttackMapData
    }
  });
});

// Test all services
app.get("/api/test/services", async (req, res) => {
  try {
    const results = {
      timestamp: new Date(),
      services: {},
      summary: { total: 0, working: 0 }
    };

    // Test Processing Loop
    try {
      const processingStats = processingLoop.getStats();
      results.services.processingLoop = { status: 'working', stats: processingStats };
      results.summary.working++;
    } catch (error) {
      results.services.processingLoop = { status: 'error', error: error.message };
    }
    results.summary.total++;

    // Test Risk Scoring
    try {
      const testNotification = {
        message: 'Test threat for risk scoring',
        severity: 'high',
        details: { pattern: 'TP001' }
      };
      const riskResult = await riskScoringService.calculateNotificationRisk(testNotification);
      results.services.riskScoring = { status: 'working', sampleResult: riskResult };
      results.summary.working++;
    } catch (error) {
      results.services.riskScoring = { status: 'error', error: error.message };
    }
    results.summary.total++;

    // Test AI Insights
    try {
      const testNotification = {
        message: 'Test threat for AI insights',
        severity: 'critical',
        details: { pattern: 'TP003' }
      };
      const insightsResult = await aiInsightsService.generateInsights(testNotification);
      results.services.aiInsights = { status: 'working', sampleResult: insightsResult };
      results.summary.working++;
    } catch (error) {
      results.services.aiInsights = { status: 'error', error: error.message };
    }
    results.summary.total++;

    // Test Threat Intelligence
    try {
      const threatResult = await threatIntelligenceService.getIpIntelligence('192.168.1.100');
      results.services.threatIntelligence = { status: 'working', sampleResult: threatResult };
      results.summary.working++;
    } catch (error) {
      results.services.threatIntelligence = { status: 'error', error: error.message };
    }
    results.summary.total++;

    // Test Attack Map
    try {
      const attackMapResult = await getAttackMapData('network');
      results.services.attackMap = { status: 'working', sampleResult: attackMapResult };
      results.summary.working++;
    } catch (error) {
      results.services.attackMap = { status: 'error', error: error.message };
    }
    results.summary.total++;

    res.status(200).json({ success: true, data: results });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Agent routes
app.get("/api/agent/stats", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      totalProcessed: 0,
      actionsTaken: 0,
      threatsBlocked: 0,
      lastActionTime: null,
      hourlyActionCount: 0,
      config: {
        enabled: false,
        riskThresholds: { critical: 90, high: 70, medium: 30 },
        maxAutoActions: 100,
        cooldownMinutes: 5
      },
      uptime: 0
    }
  });
});

app.post("/api/agent/processing/start", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Processing loop started",
    data: { isRunning: true, startTime: new Date() }
  });
});

app.post("/api/agent/processing/stop", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Processing loop stopped",
    data: { isRunning: false, stopTime: new Date() }
  });
});

app.get("/api/agent/processing/stats", (req, res) => {
  const stats = processingLoop.getStats();
  res.status(200).json({ success: true, data: stats });
});

app.post("/api/agent/test", async (req, res) => {
  const { testType } = req.body;
  
  try {
    const testNotification = {
      message: `Test ${testType} notification`,
      severity: testType === 'high_risk' ? 'critical' : 'medium',
      details: { pattern: 'TP001', test: true }
    };

    const riskResult = await riskScoringService.calculateNotificationRisk(testNotification);
    const insightsResult = await aiInsightsService.generateInsights(testNotification);

    res.status(200).json({
      success: true,
      message: "Test completed successfully",
      data: {
        testType,
        riskScore: riskResult.score,
        insights: insightsResult.insights.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Live alerts routes
app.get("/api/alerts/live/stats", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      overall: { total: 100, critical: 15, high: 25, medium: 40, low: 20, processed: 60, pending: 40 },
      last24h: { total: 50, processed: 30 },
      connectedClients: 1,
      bufferSize: 10
    }
  });
});

app.get("/api/alerts/live/history", (req, res) => {
  const mockAlerts = [
    {
      id: 'alert_001',
      legacyId: 'A001',
      message: 'Suspicious login attempt detected',
      severity: 'high',
      type: 'security_threat',
      timestamp: new Date(Date.now() - 3600000),
      status: 'pending',
      riskScore: 75,
      processed: false,
      actionsCount: 0
    },
    {
      id: 'alert_002',
      legacyId: 'A002',
      message: 'Malware detected in email attachment',
      severity: 'critical',
      type: 'malware',
      timestamp: new Date(Date.now() - 7200000),
      status: 'processed',
      riskScore: 90,
      processed: true,
      actionsCount: 2
    }
  ];

  res.status(200).json({ success: true, data: mockAlerts });
});

app.post("/api/alerts/live/broadcast", (req, res) => {
  const { alert } = req.body;
  console.log('🚨 Live alert broadcast:', alert);
  
  res.status(200).json({
    success: true,
    message: "Alert broadcasted successfully",
    alert: {
      id: alert.id || alert._id || 'BROADCAST_' + Date.now(),
      message: alert.message,
      timestamp: new Date()
    }
  });
});

// Risk management routes
app.get("/api/risk/departments", async (req, res) => {
  try {
    const departments = [
      {
        department: 'IT',
        totalAlerts: 25,
        criticalAlerts: 5,
        highAlerts: 8,
        userCount: 15,
        riskScore: 65,
        riskLevel: 'high',
        timeWindow: 24,
        timestamp: new Date()
      },
      {
        department: 'Finance',
        totalAlerts: 18,
        criticalAlerts: 3,
        highAlerts: 6,
        userCount: 12,
        riskScore: 55,
        riskLevel: 'medium',
        timeWindow: 24,
        timestamp: new Date()
      },
      {
        department: 'HR',
        totalAlerts: 12,
        criticalAlerts: 1,
        highAlerts: 3,
        userCount: 8,
        riskScore: 35,
        riskLevel: 'low',
        timeWindow: 24,
        timestamp: new Date()
      }
    ];

    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/risk/notification", async (req, res) => {
  try {
    const { notification } = req.body;
    const riskResult = await riskScoringService.calculateNotificationRisk(notification);
    res.status(200).json({ success: true, data: riskResult });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Insights routes
app.get("/api/insights/summary", async (req, res) => {
  try {
    const summary = {
      timeWindow: 24,
      summary: [
        { type: 'anomaly_detection', count: 15, avgConfidence: 0.85, highConfidenceCount: 12 },
        { type: 'pattern_analysis', count: 8, avgConfidence: 0.75, highConfidenceCount: 6 },
        { type: 'risk_assessment', count: 20, avgConfidence: 0.80, highConfidenceCount: 16 }
      ],
      timestamp: new Date()
    };

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/insights/generate", async (req, res) => {
  try {
    const { notification } = req.body;
    const insightsResult = await aiInsightsService.generateInsights(notification);
    res.status(200).json({ success: true, data: insightsResult });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Threat Intelligence routes
app.get("/api/threat/summary", async (req, res) => {
  try {
    const summary = await threatIntelligenceService.getThreatSummary();
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/threat/ip/:ip", async (req, res) => {
  try {
    const { ip } = req.params;
    const intelligence = await threatIntelligenceService.getIpIntelligence(ip);
    res.status(200).json({ success: true, data: intelligence });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Attack Map routes
app.get("/api/attacks/network", async (req, res) => {
  try {
    const { getNetworkGraphData } = require("./services/attackMapService");
    const result = await getNetworkGraphData();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/attacks/map", async (req, res) => {
  try {
    const { type = 'auto' } = req.query;
    const result = await getAttackMapData(type);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 ARGUS Test Server running on port ${port}`);
  console.log(`📊 Test endpoints available:`);
  console.log(`   - http://localhost:${port}/api/health`);
  console.log(`   - http://localhost:${port}/api/test/services`);
  console.log(`   - http://localhost:${port}/api/agent/processing/stats`);
  console.log(`   - http://localhost:${port}/api/alerts/live/stats`);
  console.log(`   - http://localhost:${port}/api/risk/departments`);
  console.log(`   - http://localhost:${port}/api/insights/summary`);
  console.log(`   - http://localhost:${port}/api/threat/summary`);
  console.log(`   - http://localhost:${port}/api/attacks/network`);
});
