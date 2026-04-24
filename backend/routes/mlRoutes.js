const express = require('express');
const router = express.Router();

const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');
const mlService = require('../services/mlService');
const xaiService = require('../services/xaiService');
const modelRetrainingService = require('../services/modelRetrainingService');

router.post('/predict', authenticateUser, async (req, res) => {
  try {
    const payload = req.body || {};
    const prediction = await mlService.predict(payload);
    return res.json({ success: true, data: prediction });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/retrain', authenticateUser, authorizeRoles('admin', 'fraud_analyst'), async (_req, res) => {
  try {
    const metrics = await mlService.retrain();
    return res.json({ success: true, data: metrics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/metrics', authenticateUser, authorizeRoles('admin', 'fraud_analyst', 'auditor'), async (_req, res) => {
  try {
    await mlService.ensureModelArtifacts();
    const metrics = mlService.getMetrics();
    return res.json({ success: true, data: metrics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// XAI - Generate comprehensive explanation for a single notification
router.post('/explain', authenticateUser, async (req, res) => {
  try {
    const notification = req.body || {};
    const options = req.query || {};
    const explanation = await xaiService.generateExplanation(notification, options);
    return res.json({ success: true, data: explanation });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// XAI - Generate explanations for multiple notifications
router.post('/explain-batch', authenticateUser, async (req, res) => {
  try {
    const { notifications = [], options = {} } = req.body || {};
    const explanations = await xaiService.generateBatchExplanations(notifications, options);
    return res.json({ success: true, data: explanations });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// XAI - Get explanation statistics
router.get('/explain-stats', authenticateUser, authorizeRoles('admin', 'fraud_analyst', 'auditor'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const datasetService = require('../services/datasetService');
    const { data } = datasetService.query({}, { page: 1, limit: parseInt(limit), internal: true });
    
    const explanations = await xaiService.generateBatchExplanations(data.slice(0, 20)); // Sample for stats
    const stats = xaiService.getExplanationStatistics(explanations);
    
    return res.json({ success: true, data: stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Enhanced prediction with XAI explanation
router.post('/predict-explain', authenticateUser, async (req, res) => {
  try {
    const payload = req.body || {};
    const prediction = await mlService.predict(payload);
    const explanation = await xaiService.generateExplanation(payload, { includeShap: true, includeNaturalLanguage: true });
    
    return res.json({ 
      success: true, 
      data: {
        ...prediction,
        xai: explanation
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Model Retraining Endpoints
router.post('/retrain-detailed', authenticateUser, authorizeRoles('admin', 'fraud_analyst'), async (req, res) => {
  try {
    const { reason = 'manual', forceRetrain = false } = req.body || {};
    const result = await modelRetrainingService.retrainModel({
      reason,
      requestedBy: req.user?.email || 'unknown_user',
      forceRetrain
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/retrain-status', authenticateUser, authorizeRoles('admin', 'fraud_analyst', 'auditor'), async (_req, res) => {
  try {
    const currentModel = modelRetrainingService.getCurrentModelInfo();
    const shouldRetrain = modelRetrainingService.shouldRetrain();
    const feedbackStats = modelRetrainingService.getFeedbackStatistics();
    
    return res.json({ 
      success: true, 
      data: {
        currentModel,
        shouldRetrain,
        feedbackStats,
        lastRetrain: currentModel.lastRetrain
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/retrain-history', authenticateUser, authorizeRoles('admin', 'fraud_analyst', 'auditor'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = modelRetrainingService.getRetrainingHistory(parseInt(limit));
    return res.json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/model-registry', authenticateUser, authorizeRoles('admin', 'auditor'), async (_req, res) => {
  try {
    const registry = modelRetrainingService.getModelRegistry();
    return res.json({ success: true, data: registry });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/rollback', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { targetVersion } = req.body || {};
    if (!targetVersion) {
      return res.status(400).json({ success: false, message: 'Target version is required' });
    }
    
    const result = await modelRetrainingService.rollbackModel(targetVersion);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/performance-trends', authenticateUser, authorizeRoles('admin', 'fraud_analyst', 'auditor'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const trends = modelRetrainingService.getPerformanceTrends(parseInt(days));
    return res.json({ success: true, data: trends });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/schedule-retraining', authenticateUser, authorizeRoles('admin'), async (_req, res) => {
  try {
    modelRetrainingService.scheduleAutomaticRetraining();
    return res.json({ success: true, message: 'Automatic retraining scheduler started' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
