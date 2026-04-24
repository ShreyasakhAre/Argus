const { analyzeNotification } = require('./backend/services/aiService');

// Example 1: Basic notification analysis
async function analyzeBasicNotification() {
  console.log('=== Basic Notification Analysis ===');

  const notification = {
    message: "URGENT: Please verify your account immediately",
    sender: "security@external.com",
    receiver: "user@company.com",
    type: "email",
    timestamp: new Date().toISOString()
  };

  try {
    const result = await analyzeNotification(notification);
    console.log('Analysis Result:', result);

    // Result structure:
    // {
    //   riskScore: 85,
    //   explanation: [
    //     'Message shows urgency pattern',
    //     'External sender identified',
    //     'Contains suspicious links'
    //   ],
    //   confidence: 'medium',
    //   source: 'fallback'
    // }

  } catch (error) {
    console.error('Analysis failed:', error);
    // Note: This should never happen due to fallback mechanisms
  }
}

// Example 2: API endpoint usage
async function createAlertEndpoint(req, res) {
  try {
    const { message, sender, type, details } = req.body;

    // Validate input
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Analyze with AI service (always succeeds)
    const analysis = await analyzeNotification({
      message,
      sender: sender || 'unknown',
      receiver: req.user?.email || 'unknown',
      type: type || 'notification',
      details: details || {},
      timestamp: new Date().toISOString()
    });

    // Create alert with AI analysis
    const alert = {
      id: `A${Date.now()}`,
      message,
      severity: getSeverityFromRiskScore(analysis.riskScore),
      riskScore: analysis.riskScore,
      explanation: analysis.explanation,
      source: analysis.source,
      confidence: analysis.confidence,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Return success with analysis
    res.status(201).json({
      success: true,
      alert,
      analysis: {
        riskScore: analysis.riskScore,
        riskLevel: getRiskLevel(analysis.riskScore),
        explanation: analysis.explanation,
        confidence: analysis.confidence,
        source: analysis.source
      }
    });

  } catch (error) {
    // This block should rarely execute due to fallback
    console.error('Alert creation error:', error);

    res.status(500).json({
      success: false,
      error: 'Service temporarily unavailable',
      fallbackAlert: {
        id: `A${Date.now()}`,
        message: req.body.message,
        severity: 'medium',
        riskScore: 50,
        explanation: ['Analysis service temporarily unavailable'],
        source: 'emergency_fallback'
      }
    });
  }
}

// Example 3: Frontend integration
async function analyzeNotificationOnFrontend(message) {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (data.success) {
      // Display analysis results
      displayAnalysisResults(data.analysis);
    } else {
      // Show user-friendly error message
      displayError(data.error);

      // Still show fallback analysis if available
      if (data.fallbackAnalysis) {
        displayAnalysisResults(data.fallbackAnalysis);
      }
    }

  } catch (error) {
    console.error('Frontend analysis error:', error);
    displayError('Analysis service temporarily unavailable');
  }
}

// Example 4: Batch analysis
async function analyzeMultipleNotifications(notifications) {
  console.log('=== Batch Analysis ===');

  const results = [];

  for (const notification of notifications) {
    try {
      const analysis = await analyzeNotification(notification);
      results.push({
        notification,
        analysis,
        success: true
      });
    } catch (error) {
      // Should not happen, but handle gracefully
      results.push({
        notification,
        analysis: {
          riskScore: 50,
          explanation: ['Analysis failed'],
          source: 'error'
        },
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

// Example 5: Demo mode testing
async function testDemoMode() {
  console.log('=== Demo Mode Test ===');

  // Set demo mode
  process.env.USE_MOCK_AI = 'true';

  const testNotifications = [
    {
      message: "Please transfer $1000 urgently",
      sender: "ceo@company.com",
      type: "email"
    },
    {
      message: "Team meeting at 3 PM",
      sender: "hr@company.com",
      type: "calendar"
    },
    {
      message: "Verify your account now or it will be suspended",
      sender: "security@external.com",
      type: "email"
    }
  ];

  for (const notification of testNotifications) {
    const result = await analyzeNotification(notification);
    console.log(`Message: "${notification.message}"`);
    console.log(`Risk Score: ${result.riskScore}`);
    console.log(`Source: ${result.source}`);
    console.log('---');
  }
}

// Helper functions
function getSeverityFromRiskScore(riskScore) {
  if (riskScore >= 70) return 'critical';
  if (riskScore >= 50) return 'high';
  if (riskScore >= 30) return 'medium';
  return 'low';
}

function getRiskLevel(riskScore) {
  if (riskScore >= 70) return 'critical';
  if (riskScore >= 50) return 'high';
  if (riskScore >= 30) return 'medium';
  return 'low';
}

function displayAnalysisResults(analysis) {
  console.log('Risk Score:', analysis.riskScore);
  console.log('Risk Level:', analysis.riskLevel);
  console.log('Explanation:', analysis.explanation.join(', '));
  console.log('Source:', analysis.source);
  console.log('Confidence:', analysis.confidence);
}

function displayError(message) {
  console.error('Error:', message);
  // In a real app, this would show a user-friendly UI message
}

// Export functions for use in other modules
module.exports = {
  analyzeBasicNotification,
  createAlertEndpoint,
  analyzeNotificationOnFrontend,
  analyzeMultipleNotifications,
  testDemoMode,
  getSeverityFromRiskScore,
  getRiskLevel
};

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    await analyzeBasicNotification();
    await testDemoMode();
  })();
}
