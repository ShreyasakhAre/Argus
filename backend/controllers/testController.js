/**
 * Test API Route
 * 
 * Simple endpoint to test all new services without MongoDB
 */

const { processingLoop } = require("../services/processingLoop");
const { riskScoringService } = require("../services/riskScoringService");
const { aiInsightsService } = require("../services/aiInsightsService");
const { threatIntelligenceService } = require("../services/threatIntelligenceService");
const { getAttackMapData } = require("../services/attackMapService");

async function testAllServices(req, res) {
  try {
    console.log('🧪 Testing all ARGUS services...');
    
    const results = {
      timestamp: new Date(),
      services: {},
      summary: { total: 0, working: 0 }
    };

    // Test Processing Loop
    try {
      const processingStats = processingLoop.getStats();
      results.services.processingLoop = {
        status: 'working',
        stats: processingStats
      };
      results.summary.working++;
    } catch (error) {
      results.services.processingLoop = {
        status: 'error',
        error: error.message
      };
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
      results.services.riskScoring = {
        status: 'working',
        sampleResult: riskResult
      };
      results.summary.working++;
    } catch (error) {
      results.services.riskScoring = {
        status: 'error',
        error: error.message
      };
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
      results.services.aiInsights = {
        status: 'working',
        sampleResult: insightsResult
      };
      results.summary.working++;
    } catch (error) {
      results.services.aiInsights = {
        status: 'error',
        error: error.message
      };
    }
    results.summary.total++;

    // Test Threat Intelligence
    try {
      const threatResult = await threatIntelligenceService.getIpIntelligence('192.168.1.100');
      results.services.threatIntelligence = {
        status: 'working',
        sampleResult: threatResult
      };
      results.summary.working++;
    } catch (error) {
      results.services.threatIntelligence = {
        status: 'error',
        error: error.message
      };
    }
    results.summary.total++;

    // Test Attack Map
    try {
      const attackMapResult = await getAttackMapData('network');
      results.services.attackMap = {
        status: 'working',
        sampleResult: attackMapResult
      };
      results.summary.working++;
    } catch (error) {
      results.services.attackMap = {
        status: 'error',
        error: error.message
      };
    }
    results.summary.total++;

    console.log(`✅ Test complete: ${results.summary.working}/${results.summary.total} services working`);

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Test services error:', error);
    return res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message
    });
  }
}

module.exports = { testAllServices };
