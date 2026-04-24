/**
 * Explainable AI (XAI) Engine
 * Generates natural language reasoning and signal extraction for fraud detection alerts.
 */

const logger = require('../utils/logger');

/**
 * Generates a structured explanation for a given notification/alert.
 * mapping dataset fields to logical security reasoning.
 */
function generateExplanation(alert) {
  // Normalize risk score using sigmoid to ensure 0-100% range
  const rawScore = alert.risk_score || 0;
  let normalizedScore;
  
  if (rawScore > 1) {
    // Apply sigmoid normalization for scores > 1
    const p = 1 / (1 + Math.exp(-rawScore));
    normalizedScore = Math.round(p * 100);
  } else {
    // Already in 0-1 range, convert to percentage
    normalizedScore = Math.round(rawScore * 100);
  }
  
  // Ensure score is within valid range
  const confidence = Math.max(0, Math.min(100, normalizedScore));
  
  const signals = [];
  const reasons = [];

  // Classification based on normalized confidence
  let classification;
  if (confidence <= 29) {
    classification = 'Safe';
  } else if (confidence <= 59) {
    classification = 'Suspicious';
  } else {
    classification = 'Malicious';
  }

  // Logic based on dataset fields
  if (alert.is_malicious || confidence >= 60) {
    signals.push('High-risk threat pattern detected');
    reasons.push(`The event was flagged as malicious with a confidence of ${confidence}%`);
  }

  if (alert.threat_category) {
    signals.push(`Category: ${alert.threat_category}`);
    reasons.push(`Classification identifies this as a potential ${alert.threat_category} attempt.`);
  }

  if (alert.priority === 'critical' || alert.priority === 'high') {
    signals.push('Elevated priority status');
    reasons.push('This alert was escalated due to its high organizational priority.');
  }

  if (alert.channel) {
    signals.push(`Vector: ${alert.channel}`);
    reasons.push(`Observation via ${alert.channel} indicates a targeted delivery vector.`);
  }

  // Additional signals based on content analysis
  if (alert.contains_url) {
    signals.push('URL detected in message');
    reasons.push('Message contains external links which may lead to malicious sites.');
  }

  if (alert.sender_domain && !alert.sender_domain.includes('company.com')) {
    signals.push('External sender domain');
    reasons.push('Sender originates from outside the organization network.');
  }

  // Content-based analysis
  if (alert.content) {
    const content = alert.content.toLowerCase();
    
    // Urgency indicators
    if (content.includes('urgent') || content.includes('immediate') || content.includes('asap')) {
      signals.push('Urgency language detected');
      reasons.push('Message uses urgency tactics commonly seen in phishing attempts.');
    }
    
    // Financial terms
    if (content.includes('payment') || content.includes('transfer') || content.includes('invoice') || content.includes('wire')) {
      signals.push('Financial terminology');
      reasons.push('Message contains financial terms which may indicate BEC or financial fraud.');
    }
    
    // Credential requests
    if (content.includes('password') || content.includes('login') || content.includes('account') || content.includes('verify')) {
      signals.push('Credential request detected');
      reasons.push('Message requests sensitive information or account access.');
    }
    
    // Attachment analysis
    if (alert.attachment_type && alert.attachment_type !== 'none') {
      signals.push(`Attachment type: ${alert.attachment_type}`);
      if (alert.attachment_type === 'zip' || alert.attachment_type === 'exe') {
        reasons.push('Dangerous attachment type detected - potential malware delivery.');
      } else {
        reasons.push('Message contains attachment requiring verification.');
      }
    }
  }

  // Sender-receiver relationship analysis
  let isInternalSender = false;
  let isInternalReceiver = false;
  if (alert.sender && alert.receiver) {
    // Check if sender is from internal domain
    isInternalSender = alert.sender.includes('company.com');
    isInternalReceiver = alert.receiver.includes('company.com');
    
    if (!isInternalSender && isInternalReceiver) {
      signals.push('External to internal communication');
      reasons.push('External sender targeting internal employee - requires verification.');
    }
  }

  // Threat category specific analysis
  if (alert.threat_category) {
    switch (alert.threat_category) {
      case 'BEC':
        signals.push('Business Email Compromise pattern');
        reasons.push('Message matches BEC characteristics - executive impersonation or financial fraud.');
        break;
      case 'Phishing':
        signals.push('Phishing attempt pattern');
        reasons.push('Message contains phishing indicators - credential harvesting or malware delivery.');
        break;
      case 'Ransomware':
        signals.push('Ransomware indicators');
        reasons.push('Message contains ransomware delivery vectors - malicious attachments or links.');
        break;
      case 'Safe':
        signals.push('Legitimate communication pattern');
        reasons.push('Message appears to be normal business communication.');
        break;
      default:
        signals.push(`${alert.threat_category} threat pattern`);
        reasons.push(`Message exhibits characteristics of ${alert.threat_category}.`);
    }
  }

  // Channel-based risk assessment
  if (alert.channel) {
    switch (alert.channel) {
      case 'Email':
        signals.push('Email channel');
        reasons.push('Standard email communication - requires spam/phishing filtering.');
        break;
      case 'Teams':
        signals.push('Teams channel');
        reasons.push('Internal Teams communication - generally lower risk but still monitored.');
        break;
      case 'Slack':
        signals.push('Slack channel');
        reasons.push('Slack communication - verify external integrations and links.');
        break;
      default:
        signals.push(`${alert.channel} channel`);
        reasons.push(`Communication via ${alert.channel} - channel-specific monitoring applied.`);
    }
  }

  // Fallback if no specific signals
  if (signals.length === 0) {
    signals.push('Baseline anomaly detection');
    reasons.push('Detected subtle behavioral deviations from standard user patterns.');
  }

  const ai_explanation = reasons.join(' ') || "No detailed reasoning available.";

  return {
    confidence,
    classification,
    ai_explanation,
    signals,
    risk_score: rawScore, // Keep original for reference
    detailed_analysis: {
      sender_analysis: isInternalSender ? 'Internal' : 'External',
      content_risks: signals.filter(s => s.includes('detected') || s.includes('language')),
      technical_indicators: signals.filter(s => s.includes('URL') || s.includes('Attachment')),
      behavioral_indicators: signals.filter(s => s.includes('pattern') || s.includes('communication'))
    }
  };
}

module.exports = {
  generateExplanation
};
