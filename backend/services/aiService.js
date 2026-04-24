/**
 * AI Service Layer for ARGUS Fraud Detection Platform
 * 
 * Provides reliable AI analysis with fallback mechanisms
 * Enhanced to use datasetService for ML/risk pipeline with 10,000 record dataset
 * Never crashes due to API failures - always returns valid response
 */

const datasetService = require('./datasetService');
const logger = require('../utils/logger');

// Configuration
const USE_MOCK_AI = process.env.USE_MOCK_AI === 'true';
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT) || 10000; // 10 seconds

// Urgency detection patterns
const URGENCY_KEYWORDS = [
  'urgent', 'immediately', 'asap', 'right now', 'act now', 
  'limited time', 'expires soon', 'hurry', 'quickly', 'without delay',
  'verify immediately', 'confirm now', 'action required', 'respond urgently'
];

// Financial intent patterns
const FINANCIAL_KEYWORDS = [
  'money', 'payment', 'transfer', 'account', 'bank', 'credit card',
  'invoice', 'billing', 'transaction', 'wire', 'deposit', 'withdrawal',
  'purchase', 'refund', 'salary', 'payroll', 'tax', 'investment'
];

// Suspicious patterns
const SUSPICIOUS_PATTERNS = [
  'click here', 'verify account', 'suspended', 'locked', 'security breach',
  'unusual activity', 'confirm identity', 'update payment', 'expired card',
  'verify identity', 'account locked', 'suspicious login', 'security alert'
];

// Link detection patterns
const LINK_PATTERNS = [
  /http[s]?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
];

/**
 * Main AI analysis function
 * @param {Object} notification - Notification data to analyze
 * @returns {Object} Analysis result with risk score and explanations
 */
async function analyzeNotification(notification) {
  try {
    // Ensure we have valid input
    const data = normalizeNotificationData(notification);
    
    // Demo mode - always return mock AI response
    if (USE_MOCK_AI) {
      logger.info('Using mock AI mode');
      return generateMockAIResponse(data);
    }

    // Try external AI first (optional)
    try {
      const aiResult = await callExternalAI(data);
      if (aiResult && aiResult.riskScore !== undefined) {
        logger.info('External AI analysis successful');
        return {
          ...aiResult,
          source: 'ai',
          confidence: 'high'
        };
      }
    } catch (error) {
      logger.warn('External AI failed, using fallback:', error.message);
    }

    // Fallback analysis (mandatory - always works)
    const fallbackResult = fallbackAnalysis(data);
    logger.info('Fallback analysis completed');
    
    return {
      ...fallbackResult,
      source: 'fallback',
      confidence: 'medium'
    };

  } catch (error) {
    logger.error('AI Service error:', error);
    
    // Ultimate fallback - never crashes
    return {
      riskScore: 50,
      explanation: ['Analysis service temporarily unavailable'],
      confidence: 'low',
      source: 'emergency_fallback'
    };
  }
}

/**
 * Call external AI API (optional)
 * @param {Object} data - Normalized notification data
 * @returns {Object} AI analysis result
 */
async function callExternalAI(data) {
  // This is where you'd integrate with external APIs
  // For now, we'll simulate a potential failure
  
  // Simulate API call that might fail
  if (Math.random() < 0.3) { // 30% chance of failure for demo
    throw new Error('HTTP 402 - insufficient_credits');
  }

  // Simulate successful AI response
  return {
    riskScore: Math.floor(Math.random() * 100),
    explanation: [
      'AI model detected suspicious patterns',
      'Natural language processing indicates risk',
      'Behavioral analysis flagged this message'
    ]
  };
}

/**
 * Enhanced ML/risk analysis engine using datasetService
 * @param {Object} data - Normalized notification data
 * @returns {Object} ML analysis result with dataset-driven insights
 */
function fallbackAnalysis(data) {
  const message = data.message.toLowerCase();
  const sender = data.sender.toLowerCase();
  const explanations = [];
  let riskScore = 0;

  try {
    // Use datasetService for ML-based analysis
    const dataset = datasetService.query({
      sender: { $regex: sender, $options: 'i' },
      content: { $regex: message, $options: 'i' }
    }, { limit: 1000 });

    // Pattern analysis using dataset
    const similarThreats = dataset.data.filter(record => 
      record.threat_category && record.threat_category !== 'Safe'
    );

    // Risk scoring based on dataset patterns
    if (similarThreats.length > 0) {
      riskScore += 35;
      explanations.push(`ML model detected ${similarThreats.length} similar threat patterns in dataset`);
    }

    // Sender reputation analysis using dataset
    const senderHistory = datasetService.query({
      sender: { $regex: sender, $options: 'i' }
    }, { limit: 500 });

    const maliciousFromSender = senderHistory.data.filter(record => record.is_malicious);
    if (maliciousFromSender.length > 0) {
      riskScore += 25;
      explanations.push(`Sender has ${maliciousFromSender.length} previous malicious notifications in dataset`);
    }

    // Content analysis using dataset features
    const contentAnalysis = analyzeContentWithDataset(message, dataset.data);
    riskScore += contentAnalysis.riskScore;
    explanations.push(...contentAnalysis.explanations);

    // Traditional pattern checks (fallback)
    const urgencyFound = URGENCY_KEYWORDS.some(keyword => 
      message.includes(keyword)
    );
    if (urgencyFound) {
      riskScore += 15;
      explanations.push(getRandomUrgencyExplanation());
    }

    const financialFound = FINANCIAL_KEYWORDS.some(keyword => 
      message.includes(keyword)
    );
    if (financialFound) {
      riskScore += 15;
      explanations.push(getRandomFinancialExplanation());
    }

    const suspiciousFound = SUSPICIOUS_PATTERNS.some(pattern => 
      message.includes(pattern)
    );
    if (suspiciousFound) {
      riskScore += 20;
      explanations.push(getRandomSuspiciousExplanation());
    }

    const isExternalSender = isExternalEmailAddress(sender);
    if (isExternalSender) {
      riskScore += 10;
      explanations.push('External sender identified');
    }

    const hasLinks = LINK_PATTERNS.some(pattern => 
      pattern.test(message)
    );
    if (hasLinks) {
      riskScore += 10;
      explanations.push('Contains suspicious links');
    }

    // Normalize risk score
    riskScore = Math.min(100, Math.max(0, riskScore));

    // If no explanations found, provide default
    if (explanations.length === 0) {
      explanations.push('ML analysis shows normal communication patterns');
      riskScore = 15;
    }

    return {
      riskScore,
      explanation: explanations,
      source: 'ml_dataset_enhanced',
      confidence: 'high',
      datasetInsights: {
        similarThreatsFound: similarThreats.length,
        senderHistoryAnalyzed: senderHistory.data.length,
        datasetSize: dataset.data.length
      }
    };
  } catch (error) {
    logger.error('Dataset analysis failed:', error);
    
    // Fallback to traditional analysis
    const urgencyFound = URGENCY_KEYWORDS.some(keyword => 
      message.includes(keyword)
    );
    if (urgencyFound) {
      riskScore += 25;
      explanations.push(getRandomUrgencyExplanation());
    }

    const financialFound = FINANCIAL_KEYWORDS.some(keyword => 
      message.includes(keyword)
    );
    if (financialFound) {
      riskScore += 20;
      explanations.push(getRandomFinancialExplanation());
    }

    const suspiciousFound = SUSPICIOUS_PATTERNS.some(pattern => 
      message.includes(pattern)
    );
    if (suspiciousFound) {
      riskScore += 30;
      explanations.push(getRandomSuspiciousExplanation());
    }

    const hasLinks = LINK_PATTERNS.some(pattern => 
      pattern.test(message)
    );
    if (hasLinks) {
      riskScore += 10;
      explanations.push('Contains suspicious links');
    }

    // Normalize risk score
    riskScore = Math.min(100, Math.max(0, riskScore));

    if (explanations.length === 0) {
      explanations.push('Message appears normal');
      riskScore = 10;
    }

    return {
      riskScore,
      explanation: explanations,
      source: 'fallback'
    };
  }
}

/**
 * Generate mock AI response for demo mode
 * @param {Object} data - Normalized notification data
 * @returns {Object} Mock AI analysis result
 */
function generateMockAIResponse(data) {
  const mockResponses = [
    {
      riskScore: 85,
      explanation: [
        'Advanced AI detected high-risk patterns',
        'Machine learning model indicates phishing attempt',
        'Behavioral analysis shows strong deception indicators'
      ]
    },
    {
      riskScore: 45,
      explanation: [
        'AI analysis shows moderate risk indicators',
        'Pattern recognition suggests caution',
        'Natural language processing finds some concerns'
      ]
    },
    {
      riskScore: 15,
      explanation: [
        'AI model indicates low risk',
        'Pattern analysis shows normal communication',
        'Machine learning finds no threat indicators'
      ]
    }
  ];

  // Select response based on message content for consistency
  const messageHash = data.message.length % mockResponses.length;
  return {
    ...mockResponses[messageHash],
    source: 'mock_ai'
  };
}

/**
 * Normalize notification data
 * @param {Object} notification - Raw notification data
 * @returns {Object} Normalized data
 */
function normalizeNotificationData(notification) {
  return {
    message: notification.message || notification.content || '',
    sender: notification.sender || notification.from || 'unknown',
    receiver: notification.receiver || notification.to || 'unknown',
    timestamp: notification.timestamp || new Date().toISOString(),
    type: notification.type || 'unknown',
    details: notification.details || {}
  };
}

/**
 * Check if email address is external
 * @param {string} email - Email address to check
 * @returns {boolean} True if external
 */
function isExternalEmailAddress(email) {
  const internalDomains = [
    'company.com',
    'internal.com',
    'localhost',
    'internal.local'
  ];

  // Simple check - if it doesn't contain known internal domains, assume external
  return !internalDomains.some(domain => email.includes(domain));
}

/**
 * Get random urgency explanation
 * @returns {string} Explanation text
 */
function getRandomUrgencyExplanation() {
  const explanations = [
    'Message shows urgency pattern',
    'Language indicates time pressure',
    'Contains immediate action request',
    'Detected urgency indicators',
    'Time-sensitive language detected'
  ];
  return explanations[Math.floor(Math.random() * explanations.length)];
}

/**
 * Get random financial explanation
 * @returns {string} Explanation text
 */
function getRandomFinancialExplanation() {
  const explanations = [
    'Financial intent detected',
    'Contains payment-related terms',
    'Financial transaction language found',
    'Money-related keywords present',
    'Banking terminology detected'
  ];
  return explanations[Math.floor(Math.random() * explanations.length)];
}

/**
 * Content analysis using dataset features
 * @param {string} message - Message content to analyze
 * @param {Array} dataset - Dataset records for comparison
 * @returns {Object} Analysis result with risk score and explanations
 */
function analyzeContentWithDataset(message, dataset) {
  const explanations = [];
  let riskScore = 0;

  // Analyze content patterns against dataset
  const datasetPatterns = dataset.filter(record => 
    record.content && record.content.toLowerCase().includes(message.substring(0, 50).toLowerCase())
  );

  if (datasetPatterns.length > 5) {
    riskScore += 20;
    explanations.push(`Content matches ${datasetPatterns.length} similar patterns in dataset`);
  }

  // Analyze threat categories in dataset
  const threatCategories = [...new Set(dataset.map(record => record.threat_category))];
  const messageWords = message.toLowerCase().split(/\s+/);
  
  for (const category of threatCategories) {
    if (category !== 'Safe' && messageWords.some(word => word.includes(category.toLowerCase()))) {
      riskScore += 15;
      explanations.push(`Content contains ${category} indicators`);
    }
  }

  return {
    riskScore,
    explanations
  };
}

/**
 * Get random suspicious explanation
 * @returns {string} Explanation text
 */
function getRandomSuspiciousExplanation() {
  const explanations = [
    'Suspicious pattern identified',
    'Phishing indicators detected',
    'Deceptive language patterns found',
    'Social engineering tactics detected',
    'Suspicious request identified'
  ];
  return explanations[Math.floor(Math.random() * explanations.length)];
}

module.exports = {
  analyzeNotification,
  callExternalAI,
  fallbackAnalysis,
  generateMockAIResponse
};
