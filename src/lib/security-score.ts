import { DatasetNotification } from './types';

// Feedback interface for analyst reviews
export interface Feedback {
  notification_id: string;
  analyst_id: string;
  decision: 'confirm' | 'false_positive' | 'escalate';
  timestamp: string;
  comments?: string;
}

export interface SecurityScoreResult {
  score: number;
  grade: 'excellent' | 'good' | 'poor';
  color: string;
  breakdown: {
    baseScore: number;
    maliciousConfirmed: number;
    highRiskIgnored: number;
    incorrectSafeMarking: number;
    bonusPoints: number;
  };
}

/**
 * Calculate User Security Score based on notification and feedback data
 * Score range: 0-100
 * 
 * Deductions:
 * - Confirmed malicious clicked: -5 points
 * - High-risk ignored: -3 points  
 * - Incorrect safe marking: -10 points
 * 
 * Bonus:
 * - Quick response to threats: +2 points
 * - Consistent safe behavior: +5 points
 */
export function calculateSecurityScore(
  notifications: DatasetNotification[],
  feedback: Feedback[] = []
): SecurityScoreResult {
  // Start with base score of 100
  let baseScore = 100;
  let maliciousConfirmed = 0;
  let highRiskIgnored = 0;
  let incorrectSafeMarking = 0;
  let bonusPoints = 0;

  // Calculate deductions from feedback
  feedback.forEach(fb => {
    const notification = notifications.find(n => n.notification_id === fb.notification_id);
    
    if (!notification) return;

    // Deduction: Confirmed malicious but user marked safe
    if (fb.decision === 'false_positive' && notification.is_malicious === 1) {
      incorrectSafeMarking += 10;
    }

    // Deduction: User confirmed malicious (good action, but small deduction for complexity)
    if (fb.decision === 'confirm' && notification.is_malicious === 1) {
      maliciousConfirmed += 5;
    }

    // Bonus: Quick response (within 1 hour)
    if (fb.timestamp && notification.timestamp) {
      const feedbackTime = new Date(fb.timestamp);
      const notificationTime = new Date(notification.timestamp);
      const responseTimeHours = (feedbackTime.getTime() - notificationTime.getTime()) / (1000 * 60 * 60);
      
      if (responseTimeHours < 1 && notification.is_malicious === 1) {
        bonusPoints += 2;
      }
    }
  });

  // Calculate deductions from notification patterns
  const highRiskNotifications = notifications.filter(n => 
    n.risk_score > 0.7 && n.review_status === 'Pending'
  );
  
  // Check if high-risk notifications were ignored (no feedback provided)
  highRiskNotifications.forEach(notification => {
    const hasFeedback = feedback.some(fb => fb.notification_id === notification.notification_id);
    if (!hasFeedback) {
      highRiskIgnored += 3;
    }
  });

  // Bonus: Consistent safe behavior
  const safeNotifications = notifications.filter(n => n.is_malicious === 0);
  const safeBehaviorRatio = safeNotifications.length / notifications.length;
  if (safeBehaviorRatio > 0.8) {
    bonusPoints += 5;
  }

  // Calculate final score
  const totalDeductions = maliciousConfirmed + highRiskIgnored + incorrectSafeMarking;
  const finalScore = Math.max(0, Math.min(100, baseScore - totalDeductions + bonusPoints));

  // Determine grade and color
  let grade: 'excellent' | 'good' | 'poor';
  let color: string;

  if (finalScore >= 80) {
    grade = 'excellent';
    color = 'text-green-500';
  } else if (finalScore >= 50) {
    grade = 'good';
    color = 'text-yellow-500';
  } else {
    grade = 'poor';
    color = 'text-red-500';
  }

  return {
    score: Math.round(finalScore),
    grade,
    color,
    breakdown: {
      baseScore,
      maliciousConfirmed,
      highRiskIgnored,
      incorrectSafeMarking,
      bonusPoints
    }
  };
}

/**
 * Get average security score for a department
 */
export function calculateDepartmentSecurityScore(
  notifications: DatasetNotification[],
  feedback: Feedback[] = [],
  department?: string
): SecurityScoreResult {
  const deptNotifications = department 
    ? notifications.filter(n => n.department === department)
    : notifications;

  const deptFeedback = department
    ? feedback.filter(fb => {
        const notification = notifications.find(n => n.notification_id === fb.notification_id);
        return notification && notification.department === department;
      })
    : feedback;

  return calculateSecurityScore(deptNotifications, deptFeedback);
}

/**
 * Format score display with visual indicators
 */
export function formatSecurityScore(score: number): {
  display: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (score >= 80) {
    return {
      display: `${score}/100`,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30'
    };
  } else if (score >= 50) {
    return {
      display: `${score}/100`,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    };
  } else {
    return {
      display: `${score}/100`,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30'
    };
  }
}
