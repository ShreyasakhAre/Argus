/**
 * DATA VALIDATION UTILITIES
 * Comprehensive validation for new dataset structure
 */

import { DatasetNotification, FraudCase, NotificationSeverity, Priority, Channel, DeviceType, ReviewStatus } from './types';

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate notification ID format
 */
export function isValidNotificationId(id: string): boolean {
  const pattern = /^N[A-Z0-9]{12,}$/;
  return pattern.test(id);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Validate risk score range (0.0 - 1.0)
 */
export function isValidRiskScore(score: number): boolean {
  return typeof score === 'number' && score >= 0.0 && score <= 1.0;
}

/**
 * Validate timestamp format (ISO string)
 */
export function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && timestamp.includes('T');
}

/**
 * Validate threat category
 */
export function isValidThreatCategory(category: string): category is NotificationSeverity {
  const validCategories: NotificationSeverity[] = [
    'safe', 'low_risk_suspicious', 'suspicious', 
    'high_risk_suspicious', 'bec', 'ransomware', 'phishing', 'critical'
  ];
  return validCategories.includes(category as NotificationSeverity);
}

/**
 * Validate priority
 */
export function isValidPriority(priority: string): priority is Priority {
  const validPriorities: Priority[] = ['low', 'medium', 'high', 'critical'];
  return validPriorities.includes(priority as Priority);
}

/**
 * Validate channel
 */
export function isValidChannel(channel: string): channel is Channel {
  const validChannels: Channel[] = ['Email', 'Slack', 'Teams', 'ERP', 'HR Portal', 'Mobile'];
  return validChannels.includes(channel as Channel);
}

/**
 * Validate device type
 */
export function isValidDeviceType(device: string): device is DeviceType {
  const validDevices: DeviceType[] = ['Desktop', 'Laptop', 'Mobile', 'Tablet'];
  return validDevices.includes(device as DeviceType);
}

/**
 * Validate review status
 */
export function isValidReviewStatus(status: string): status is ReviewStatus {
  const validStatuses: ReviewStatus[] = ['Approved', 'Pending', 'Rejected'];
  return validStatuses.includes(status as ReviewStatus);
}

/**
 * Validate sender domain
 */
export function isValidSenderDomain(domain: string): boolean {
  if (!domain || domain.length < 4) return false;
  const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
  return domainPattern.test(domain);
}

// ============================================
// DATASET NOTIFICATION VALIDATION
// ============================================

/**
 * Comprehensive validation for DatasetNotification
 */
export function validateDatasetNotification(notification: Partial<DatasetNotification>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!notification.notification_id) {
    errors.push('Notification ID is required');
  } else if (!isValidNotificationId(notification.notification_id)) {
    errors.push('Invalid notification ID format');
  }

  if (!notification.org_id) {
    errors.push('Organization ID is required');
  }

  if (!notification.department) {
    errors.push('Department is required');
  }

  if (!notification.channel) {
    errors.push('Channel is required');
  } else if (!isValidChannel(notification.channel)) {
    errors.push('Invalid channel value');
  }

  if (!notification.sender) {
    errors.push('Sender is required');
  } else if (!isValidEmail(notification.sender)) {
    errors.push('Invalid sender email format');
  }

  if (!notification.receiver) {
    errors.push('Receiver is required');
  } else if (!isValidEmail(notification.receiver)) {
    errors.push('Invalid receiver email format');
  }

  if (!notification.content) {
    errors.push('Content is required');
  } else if (notification.content.length > 10000) {
    warnings.push('Content is very long (>10,000 characters)');
  }

  if (notification.sender_domain && !isValidSenderDomain(notification.sender_domain)) {
    errors.push('Invalid sender domain format');
  }

  if (notification.risk_score !== undefined && !isValidRiskScore(notification.risk_score)) {
    errors.push('Risk score must be between 0.0 and 1.0');
  }

  if (notification.priority && !isValidPriority(notification.priority)) {
    errors.push('Invalid priority value');
  }

  if (notification.threat_category && !isValidThreatCategory(notification.threat_category)) {
    errors.push('Invalid threat category');
  }

  if (notification.timestamp && !isValidTimestamp(notification.timestamp)) {
    errors.push('Invalid timestamp format');
  }

  if (notification.device_type && !isValidDeviceType(notification.device_type)) {
    errors.push('Invalid device type');
  }

  if (notification.review_status && !isValidReviewStatus(notification.review_status)) {
    errors.push('Invalid review status');
  }

  // Logical consistency checks
  if (notification.contains_url === 1 && !notification.url) {
    warnings.push('URL flag is set but no URL provided');
  }

  if (notification.url && notification.contains_url === 0) {
    warnings.push('URL provided but contains_url flag is not set');
  }

  if (notification.is_malicious === 1 && notification.risk_score < 0.7) {
    warnings.push('Item marked malicious but has low risk score');
  }

  if (notification.is_malicious === 0 && notification.risk_score > 0.8) {
    warnings.push('Item marked safe but has high risk score');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================
// FRAUD CASE VALIDATION
// ============================================

/**
 * Comprehensive validation for FraudCase
 */
export function validateFraudCase(fraudCase: Partial<FraudCase>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!fraudCase.case_id) {
    errors.push('Case ID is required');
  }

  if (!fraudCase.notification_id) {
    errors.push('Notification ID is required');
  }

  if (!fraudCase.org_id) {
    errors.push('Organization ID is required');
  }

  if (!fraudCase.department) {
    errors.push('Department is required');
  }

  if (!fraudCase.channel) {
    errors.push('Channel is required');
  }

  if (!fraudCase.sender) {
    errors.push('Sender is required');
  }

  if (!fraudCase.receiver) {
    errors.push('Receiver is required');
  }

  if (!fraudCase.content) {
    errors.push('Content is required');
  }

  if (fraudCase.risk_score !== undefined && !isValidRiskScore(fraudCase.risk_score)) {
    errors.push('Risk score must be between 0.0 and 1.0');
  }

  if (fraudCase.priority && !isValidPriority(fraudCase.priority)) {
    errors.push('Invalid priority value');
  }

  if (fraudCase.case_priority && !isValidPriority(fraudCase.case_priority)) {
    errors.push('Invalid case priority value');
  }

  if (fraudCase.threat_category && !isValidThreatCategory(fraudCase.threat_category)) {
    errors.push('Invalid threat category');
  }

  if (fraudCase.review_status && !isValidReviewStatus(fraudCase.review_status)) {
    errors.push('Invalid review status');
  }

  // Workflow validation
  if (fraudCase.review_status === 'Approved' && !fraudCase.analyst_feedback) {
    warnings.push('Case approved without analyst feedback');
  }

  if (fraudCase.review_status === 'Rejected' && !fraudCase.analyst_feedback) {
    warnings.push('Case rejected without analyst feedback');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================
// BATCH VALIDATION
// ============================================

/**
 * Validate array of notifications
 */
export function validateNotificationBatch(notifications: Partial<DatasetNotification>[]): {
  isValid: boolean;
  errors: string[];
  validCount: number;
  invalidCount: number;
} {
  const errors: string[] = [];
  let validCount = 0;
  let invalidCount = 0;

  notifications.forEach((notification, index) => {
    const validation = validateDatasetNotification(notification);
    if (!validation.isValid) {
      invalidCount++;
      errors.push(`Item ${index + 1}: ${validation.errors.join(', ')}`);
    } else {
      validCount++;
    }
  });

  return {
    isValid: invalidCount === 0,
    errors,
    validCount,
    invalidCount
  };
}

// ============================================
// SANITIZATION UTILITIES
// ============================================

/**
 * Sanitize string content
 */
export function sanitizeContent(content: string): string {
  if (!content) return '';
  
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .substring(0, 10000); // Limit length
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  return email
    .toLowerCase()
    .trim()
    .substring(0, 254); // RFC compliant length
}

/**
 * Sanitize sender domain
 */
export function sanitizeDomain(domain: string): string {
  if (!domain) return '';
  
  return domain
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9.-]/g, '')
    .substring(0, 253);
}

// ============================================
// ERROR HANDLING HELPERS
// ============================================

/**
 * Create standardized error object
 */
export function createValidationError(field: string, message: string) {
  return {
    field,
    message,
    code: `VALIDATION_ERROR_${field.toUpperCase()}`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create validation warning object
 */
export function createValidationWarning(field: string, message: string) {
  return {
    field,
    message,
    code: `VALIDATION_WARNING_${field.toUpperCase()}`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format validation errors for API responses
 */
export function formatValidationErrors(errors: string[]): string {
  return errors.map(error => `• ${error}`).join('\n');
}

/**
 * Check for duplicate notification IDs
 */
export function checkDuplicateNotificationIds(notifications: DatasetNotification[]): string[] {
  const idCounts = new Map<string, number>();
  const duplicates: string[] = [];

  notifications.forEach(notification => {
    const count = idCounts.get(notification.notification_id) || 0;
    idCounts.set(notification.notification_id, count + 1);
    
    if (count === 1) {
      duplicates.push(notification.notification_id);
    }
  });

  return duplicates;
}
