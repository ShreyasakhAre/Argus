import type { Notification } from './ml-service';

export interface XAIExplanation {
  summary: string;
  confidence: number;
  riskFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
    evidence: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: 'immediate' | 'soon' | 'monitor';
    description: string;
  }>;
  featureImportance: Array<{
    feature: string;
    importance: number;
    value: string | number;
    threshold: number;
  }>;
  similarCases: Array<{
    case_id: string;
    similarity: number;
    outcome: string;
    date: string;
  }>;
}

export class XAIService {
  /**
   * Generate comprehensive AI explanation for a notification
   */
  static generateExplanation(notification: Notification): XAIExplanation {
    const riskScore = notification.risk_score;
    const isMalicious = notification.is_malicious === 1;
    const threatCategory = notification.threat_category;
    
    // Analyze risk factors
    const riskFactors = this.analyzeRiskFactors(notification);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(notification, riskFactors);
    
    // Calculate feature importance
    const featureImportance = this.calculateFeatureImportance(notification);
    
    // Find similar cases (mock implementation)
    const similarCases = this.findSimilarCases(notification);
    
    const confidence = this.calculateConfidence(notification, riskFactors);
    
    // Generate summary
    const summary = this.generateSummary(notification, riskFactors, confidence);
    
    return {
      summary,
      confidence,
      riskFactors,
      recommendations,
      featureImportance,
      similarCases
    };
  }

  /**
   * Analyze specific risk factors for the notification
   */
  private static analyzeRiskFactors(notification: Notification) {
    const factors = [];
    
    // Sender domain analysis
    if (notification.sender_domain && !notification.sender_domain.includes('company.com')) {
      factors.push({
        factor: 'External Sender Domain',
        impact: 'high' as const,
        description: 'Sender is from an external domain not associated with the company',
        evidence: `Domain: ${notification.sender_domain}`
      });
    }
    
    // URL presence analysis
    if (notification.contains_url === 1) {
      factors.push({
        factor: 'Suspicious URL Detected',
        impact: 'high' as const,
        description: 'Message contains URLs that may lead to malicious sites',
        evidence: `URL: ${notification.url || 'Present but not specified'}`
      });
    }
    
    // Attachment analysis
    if (notification.attachment_type && notification.attachment_type !== 'none') {
      factors.push({
        factor: 'Risky Attachment',
        impact: 'medium' as const,
        description: 'Message contains potentially dangerous file attachments',
        evidence: `Attachment type: ${notification.attachment_type}`
      });
    }
    
    // Content analysis for urgency keywords
    const urgencyKeywords = ['urgent', 'immediate', 'asap', 'critical', 'emergency', 'payment', 'transfer'];
    const hasUrgency = urgencyKeywords.some(keyword => 
      notification.content.toLowerCase().includes(keyword)
    );
    
    if (hasUrgency) {
      factors.push({
        factor: 'Urgency Language',
        impact: 'medium' as const,
        description: 'Message uses urgency tactics common in social engineering',
        evidence: 'Urgent keywords detected in content'
      });
    }
    
    // Executive impersonation analysis
    const executiveTerms = ['ceo', 'cfo', 'president', 'director', 'manager'];
    const hasExecutiveTerms = executiveTerms.some(term => 
      notification.content.toLowerCase().includes(term)
    );
    
    if (hasExecutiveTerms) {
      factors.push({
        factor: 'Executive Impersonation',
        impact: 'high' as const,
        description: 'Message may be attempting to impersonate executive authority',
        evidence: 'Executive terms detected in content'
      });
    }
    
    // Financial keywords analysis
    const financialKeywords = ['payment', 'invoice', 'bank', 'account', 'transfer', 'wire', 'money'];
    const hasFinancialTerms = financialKeywords.some(keyword => 
      notification.content.toLowerCase().includes(keyword)
    );
    
    if (hasFinancialTerms) {
      factors.push({
        factor: 'Financial Motive',
        impact: 'high' as const,
        description: 'Message contains financial terms suggesting monetary motivation',
        evidence: 'Financial keywords detected in content'
      });
    }
    
    // Time-based analysis (after hours)
    const messageTime = new Date(notification.timestamp);
    const hour = messageTime.getHours();
    const isAfterHours = hour < 6 || hour > 18;
    
    if (isAfterHours) {
      factors.push({
        factor: 'After Hours Communication',
        impact: 'medium' as const,
        description: 'Message sent outside normal business hours',
        evidence: `Sent at ${hour}:00`
      });
    }
    
    return factors;
  }

  /**
   * Generate actionable recommendations based on analysis
   */
  private static generateRecommendations(notification: Notification, riskFactors: any[]) {
    const recommendations = [];
    
    const highImpactFactors = riskFactors.filter(f => f.impact === 'high');
    const hasExternalSender = riskFactors.some(f => f.factor === 'External Sender Domain');
    const hasURL = riskFactors.some(f => f.factor === 'Suspicious URL Detected');
    const hasAttachment = riskFactors.some(f => f.factor === 'Risky Attachment');
    
    if (highImpactFactors.length >= 2) {
      recommendations.push({
        action: 'Immediate Review Required',
        priority: 'immediate' as const,
        description: 'Multiple high-risk factors detected. This message requires immediate security team review.'
      });
    }
    
    if (hasExternalSender && notification.risk_score > 0.7) {
      recommendations.push({
        action: 'Verify Sender Identity',
        priority: 'immediate' as const,
        description: 'External sender with high risk score. Verify sender identity through alternative communication channel.'
      });
    }
    
    if (hasURL) {
      recommendations.push({
        action: 'Scan URLs for Malware',
        priority: 'immediate' as const,
        description: 'Scan all URLs in the message using threat intelligence databases before allowing access.'
      });
    }
    
    if (hasAttachment) {
      recommendations.push({
        action: 'Quarantine Attachments',
        priority: 'immediate' as const,
        description: 'Move attachments to secure quarantine environment and scan with multiple antivirus engines.'
      });
    }
    
    if (notification.threat_category === 'BEC') {
      recommendations.push({
        action: 'Financial Verification Protocol',
        priority: 'immediate' as const,
        description: 'Initiate financial verification protocol for any payment or transfer requests.'
      });
    }
    
    recommendations.push({
      action: 'Employee Training Opportunity',
      priority: 'monitor' as const,
      description: 'Use this as a training example to educate employees about similar threat patterns.'
    });
    
    return recommendations;
  }

  /**
   * Calculate feature importance for the prediction
   */
  private static calculateFeatureImportance(notification: Notification) {
    const features = [];
    
    // Sender domain importance
    const senderDomainRisk = notification.sender_domain && !notification.sender_domain.includes('company.com') ? 0.9 : 0.1;
    features.push({
      feature: 'Sender Domain',
      importance: senderDomainRisk,
      value: notification.sender_domain || 'N/A',
      threshold: 0.5
    });
    
    // Risk score importance
    features.push({
      feature: 'ML Risk Score',
      importance: notification.risk_score,
      value: Math.round(notification.risk_score * 100),
      threshold: 0.7
    });
    
    // URL presence importance
    features.push({
      feature: 'URL Presence',
      importance: notification.contains_url * 0.7,
      value: notification.contains_url === 1 ? 'Yes' : 'No',
      threshold: 0.3
    });
    
    // Attachment risk importance
    const attachmentRisk = notification.attachment_type && notification.attachment_type !== 'none' ? 0.6 : 0.1;
    features.push({
      feature: 'Attachment Risk',
      importance: attachmentRisk,
      value: notification.attachment_type || 'None',
      threshold: 0.4
    });
    
    // Content pattern importance
    const contentRisk = this.calculateContentRisk(notification.content);
    features.push({
      feature: 'Content Patterns',
      importance: contentRisk,
      value: Math.round(contentRisk * 100),
      threshold: 0.5
    });
    
    // Time-based importance
    const messageTime = new Date(notification.timestamp);
    const hour = messageTime.getHours();
    const timeRisk = (hour < 6 || hour > 18) ? 0.4 : 0.1;
    features.push({
      feature: 'Time Anomaly',
      importance: timeRisk,
      value: `${hour}:00`,
      threshold: 0.3
    });
    
    return features.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Calculate content risk based on pattern analysis
   */
  private static calculateContentRisk(content: string): number {
    let riskScore = 0;
    
    // Urgency keywords
    const urgencyKeywords = ['urgent', 'immediate', 'asap', 'critical'];
    urgencyKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) riskScore += 0.2;
    });
    
    // Financial keywords
    const financialKeywords = ['payment', 'invoice', 'bank', 'transfer'];
    financialKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) riskScore += 0.15;
    });
    
    // Executive keywords
    const executiveKeywords = ['ceo', 'cfo', 'president'];
    executiveKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) riskScore += 0.25;
    });
    
    return Math.min(riskScore, 1.0);
  }

  /**
   * Find similar historical cases (mock implementation)
   */
  private static findSimilarCases(notification: Notification) {
    // In a real implementation, this would query a database of historical cases
    // For now, return mock similar cases
    return [
      {
        case_id: 'CASE_001',
        similarity: 0.92,
        outcome: 'Blocked - Phishing Attempt',
        date: '2024-01-15'
      },
      {
        case_id: 'CASE_002', 
        similarity: 0.87,
        outcome: 'Investigated - False Positive',
        date: '2024-01-10'
      },
      {
        case_id: 'CASE_003',
        similarity: 0.81,
        outcome: 'Blocked - BEC Attempt',
        date: '2024-01-08'
      }
    ];
  }

  /**
   * Generate summary explanation
   */
  private static generateSummary(notification: Notification, riskFactors: any[], confidence: number) {
    const isMalicious = notification.is_malicious === 1;
    const highRiskFactors = riskFactors.filter(f => f.impact === 'high');
    
    if (isMalicious && highRiskFactors.length > 0) {
      return `This message was classified as ${notification.threat_category} with ${Math.round(confidence * 100)}% confidence. Key risk factors include ${highRiskFactors.map(f => f.factor).join(', ')}. Immediate security review is recommended.`;
    } else if (isMalicious) {
      return `This message was flagged as suspicious (${notification.threat_category}) with ${Math.round(confidence * 100)}% confidence based on multiple behavioral patterns. Security team review advised.`;
    } else {
      return `This message appears to be legitimate communication with ${Math.round(confidence * 100)}% confidence. No significant threat indicators were detected.`;
    }
  }

  /**
   * Calculate overall confidence score
   */
  private static calculateConfidence(notification: Notification, riskFactors: any[]): number {
    let confidence = notification.risk_score;
    
    // Adjust confidence based on number of risk factors
    const factorCount = riskFactors.length;
    const highRiskCount = riskFactors.filter(f => f.impact === 'high').length;
    
    if (highRiskCount >= 2) {
      confidence = Math.min(confidence + 0.15, 1.0);
    } else if (factorCount >= 3) {
      confidence = Math.min(confidence + 0.1, 1.0);
    } else if (factorCount === 0) {
      confidence = Math.max(confidence - 0.1, 0.5);
    }
    
    return confidence;
  }

  /**
   * Get threat-specific explanation template
   */
  static getThreatExplanation(threatCategory: string): string {
    const explanations = {
      'Phishing': 'This message attempts to trick recipients into revealing sensitive information like passwords or financial details through fake login pages or urgent requests.',
      'BEC': 'Business Email Compromise involves spoofing executive identities to authorize fraudulent financial transfers or sensitive data requests.',
      'Ransomware': 'This message attempts to deliver malware that encrypts files and demands payment for their restoration, often through malicious attachments.',
      'Credential Theft': 'This message tries to harvest user credentials through fake authentication portals or password reset requests.',
      'Low Risk Suspicious': 'This message contains some suspicious elements but may be legitimate. Further verification recommended.',
      'Safe': 'This message appears to be legitimate communication with no significant threat indicators detected.'
    };
    
    return explanations[threatCategory as keyof typeof explanations] || 'Unknown threat category.';
  }

  /**
   * Generate human-readable risk assessment
   */
  static generateRiskAssessment(notification: Notification): {
    level: 'Low' | 'Medium' | 'High' | 'Critical';
    color: string;
    description: string;
    actions: string[];
  } {
    const riskScore = notification.risk_score;
    const isMalicious = notification.is_malicious === 1;
    
    let level: 'Low' | 'Medium' | 'High' | 'Critical';
    let color: string;
    let description: string;
    let actions: string[];
    
    if (riskScore >= 0.8 || isMalicious) {
      level = 'Critical';
      color = 'red';
      description = 'Immediate threat detected requiring urgent action';
      actions = ['Block sender', 'Quarantine message', 'Notify security team', 'Scan for malware'];
    } else if (riskScore >= 0.6) {
      level = 'High';
      color = 'orange';
      description = 'High-risk message requiring prompt investigation';
      actions = ['Verify sender', 'Scan attachments', 'Review with manager', 'Monitor account'];
    } else if (riskScore >= 0.4) {
      level = 'Medium';
      color = 'yellow';
      description = 'Suspicious message that warrants caution';
      actions = ['Verify content', 'Check links', 'Confirm with sender', 'Monitor for follow-up'];
    } else {
      level = 'Low';
      color = 'green';
      description = 'Message appears safe with minimal risk';
      actions = ['Standard processing', 'Archive if needed', 'No special action required'];
    }
    
    return { level, color, description, actions };
  }
}
