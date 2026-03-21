/**
 * Basic Threat Detection Heuristics
 * 
 * In a real-world scenario, this function would wrap a call to an 
 * external ML inference endpoint (like TensorFlow/PyTorch) or 
 * run a pre-trained model directly in Node.js via tfjs.
 * 
 * For now, this uses deterministic explainable rules to classify severity.
 */
function detectThreat(data) {
  const message = (data.message || '').toLowerCase();
  const type = (data.type || '').toLowerCase();
  const details = data.details || {};
  
  // Rule 1: High-severity triggers
  const highRiskKeywords = ['ransomware', 'exfiltration', 'breach', 'admin compromise'];
  const isHighRisk = highRiskKeywords.some(kw => message.includes(kw));
  if (isHighRisk || type === 'data_exfiltration' || details.risk_score > 0.8) {
    return 'critical';
  }

  // Rule 2: Medium-severity triggers
  const mediumRiskKeywords = ['failed login', 'multiple failures', 'phishing', 'brute force'];
  const isMediumRisk = mediumRiskKeywords.some(kw => message.includes(kw));
  if (isMediumRisk || details.failed_attempts >= 5) {
    return 'high';
  }
  
  // Rule 3: Low-severity triggers
  const lowRiskKeywords = ['unusual', 'warn', 'expired'];
  const isLowRisk = lowRiskKeywords.some(kw => message.includes(kw));
  if (isLowRisk || details.failed_attempts > 0) {
    return 'medium';
  }

  // Default baseline
  return 'low';
}

module.exports = {
  detectThreat
};
