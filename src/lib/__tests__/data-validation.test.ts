/**
 * DATA VALIDATION TESTS
 * Comprehensive test suite for new dataset validation
 */

import {
  validateDatasetNotification,
  validateFraudCase,
  validateNotificationBatch,
  isValidNotificationId,
  isValidEmail,
  isValidRiskScore,
  isValidThreatCategory,
  isValidPriority,
  isValidChannel,
  isValidDeviceType,
  isValidReviewStatus,
  isValidSenderDomain,
  checkDuplicateNotificationIds
} from '../data-validation';
import { DatasetNotification, NotificationSeverity, Priority, Channel, DeviceType, ReviewStatus } from '../types';

// ============================================
// MOCK DATA
// ============================================

const validNotification: DatasetNotification = {
  notification_id: 'N123456789012',
  org_id: 'ORG001',
  department: 'IT',
  channel: 'Email' as Channel,
  sender: 'user@company.com',
  receiver: 'analyst@company.com',
  sender_domain: 'company.com',
  content: 'Test notification content',
  contains_url: 0,
  url: undefined,
  attachment_type: 'none',
  priority: 'medium' as Priority,
  threat_category: 'suspicious' as NotificationSeverity,
  risk_score: 0.65,
  timestamp: '2024-01-15T10:30:00Z',
  country: 'US',
  device_type: 'Desktop' as DeviceType,
  is_malicious: 0,
  review_status: 'Pending' as ReviewStatus,
  analyst_feedback: undefined
};

const invalidNotification = {
  ...validNotification,
  notification_id: 'INVALID_ID',
  sender: 'invalid-email',
  risk_score: 1.5,
  priority: 'invalid' as Priority,
  threat_category: 'invalid' as NotificationSeverity,
  channel: 'invalid' as Channel,
  device_type: 'invalid' as DeviceType,
  review_status: 'invalid' as ReviewStatus
};

// ============================================
// VALIDATION FUNCTION TESTS
// ============================================

describe('Notification ID Validation', () => {
  test('should validate correct notification ID', () => {
    expect(isValidNotificationId('N123456789012')).toBe(true);
  });

  test('should reject invalid notification ID', () => {
    expect(isValidNotificationId('INVALID_ID')).toBe(false);
    expect(isValidNotificationId('')).toBe(false);
    expect(isValidNotificationId('N123')).toBe(false);
  });
});

describe('Email Validation', () => {
  test('should validate correct email', () => {
    expect(isValidEmail('user@company.com')).toBe(true);
    expect(isValidEmail('test.email+tag@domain.co.uk')).toBe(true);
  });

  test('should reject invalid email', () => {
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('Risk Score Validation', () => {
  test('should validate correct risk scores', () => {
    expect(isValidRiskScore(0)).toBe(true);
    expect(isValidRiskScore(0.5)).toBe(true);
    expect(isValidRiskScore(1.0)).toBe(true);
  });

  test('should reject invalid risk scores', () => {
    expect(isValidRiskScore(-0.1)).toBe(false);
    expect(isValidRiskScore(1.1)).toBe(false);
    expect(isValidRiskScore(NaN)).toBe(false);
  });
});

describe('Threat Category Validation', () => {
  test('should validate correct threat categories', () => {
    expect(isValidThreatCategory('safe')).toBe(true);
    expect(isValidThreatCategory('phishing')).toBe(true);
    expect(isValidThreatCategory('critical')).toBe(true);
  });

  test('should reject invalid threat categories', () => {
    expect(isValidThreatCategory('invalid')).toBe(false);
    expect(isValidThreatCategory('')).toBe(false);
  });
});

describe('Priority Validation', () => {
  test('should validate correct priorities', () => {
    expect(isValidPriority('low')).toBe(true);
    expect(isValidPriority('medium')).toBe(true);
    expect(isValidPriority('high')).toBe(true);
    expect(isValidPriority('critical')).toBe(true);
  });

  test('should reject invalid priorities', () => {
    expect(isValidPriority('invalid')).toBe(false);
    expect(isValidPriority('')).toBe(false);
  });
});

describe('Channel Validation', () => {
  test('should validate correct channels', () => {
    expect(isValidChannel('Email')).toBe(true);
    expect(isValidChannel('Slack')).toBe(true);
    expect(isValidChannel('Teams')).toBe(true);
    expect(isValidChannel('ERP')).toBe(true);
    expect(isValidChannel('HR Portal')).toBe(true);
    expect(isValidChannel('Mobile')).toBe(true);
  });

  test('should reject invalid channels', () => {
    expect(isValidChannel('invalid')).toBe(false);
    expect(isValidChannel('')).toBe(false);
  });
});

describe('Device Type Validation', () => {
  test('should validate correct device types', () => {
    expect(isValidDeviceType('Desktop')).toBe(true);
    expect(isValidDeviceType('Laptop')).toBe(true);
    expect(isValidDeviceType('Mobile')).toBe(true);
    expect(isValidDeviceType('Tablet')).toBe(true);
  });

  test('should reject invalid device types', () => {
    expect(isValidDeviceType('invalid')).toBe(false);
    expect(isValidDeviceType('')).toBe(false);
  });
});

describe('Review Status Validation', () => {
  test('should validate correct review statuses', () => {
    expect(isValidReviewStatus('Approved')).toBe(true);
    expect(isValidReviewStatus('Pending')).toBe(true);
    expect(isValidReviewStatus('Rejected')).toBe(true);
  });

  test('should reject invalid review statuses', () => {
    expect(isValidReviewStatus('invalid')).toBe(false);
    expect(isValidReviewStatus('')).toBe(false);
  });
});

// ============================================
// DATASET NOTIFICATION VALIDATION TESTS
// ============================================

describe('Dataset Notification Validation', () => {
  test('should validate complete valid notification', () => {
    const result = validateDatasetNotification(validNotification);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should detect missing required fields', () => {
    const incomplete = { ...validNotification };
    delete (incomplete as any).notification_id;
    delete (incomplete as any).sender;
    delete (incomplete as any).content;

    const result = validateDatasetNotification(incomplete);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Notification ID is required');
    expect(result.errors).toContain('Sender is required');
    expect(result.errors).toContain('Content is required');
  });

  test('should detect invalid formats', () => {
    const result = validateDatasetNotification(invalidNotification);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid notification ID format');
    expect(result.errors).toContain('Invalid sender email format');
    expect(result.errors).toContain('Invalid priority value');
  });

  test('should generate warnings for logical inconsistencies', () => {
    const warningNotification = {
      ...validNotification,
      contains_url: 1,
      url: undefined,
      is_malicious: 1,
      risk_score: 0.5
    };

    const result = validateDatasetNotification(warningNotification);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain('URL flag is set but no URL provided');
    expect(result.warnings).toContain('Item marked malicious but has low risk score');
  });
});

// ============================================
// BATCH VALIDATION TESTS
// ============================================

describe('Batch Validation', () => {
  test('should validate all valid notifications', () => {
    const notifications = [validNotification, validNotification, validNotification];
    const result = validateNotificationBatch(notifications);
    expect(result.isValid).toBe(true);
    expect(result.validCount).toBe(3);
    expect(result.invalidCount).toBe(0);
  });

  test('should handle mixed valid/invalid notifications', () => {
    const notifications = [validNotification, invalidNotification, validNotification];
    const result = validateNotificationBatch(notifications);
    expect(result.isValid).toBe(false);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  test('should detect duplicate IDs', () => {
    const notifications = [
      validNotification,
      { ...validNotification, notification_id: 'DUPLICATE_ID' },
      { ...validNotification, notification_id: 'DUPLICATE_ID' }
    ];

    const duplicates = checkDuplicateNotificationIds(notifications);
    expect(duplicates).toContain('DUPLICATE_ID');
    expect(duplicates).toHaveLength(1);
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Integration Tests', () => {
  test('should handle real-world notification validation', () => {
    const realWorldNotification = {
      notification_id: 'N987654321098',
      org_id: 'ORG002',
      department: 'Finance',
      channel: 'Email' as Channel,
      sender: 'attacker@suspicious-domain.com',
      receiver: 'employee@company.com',
      sender_domain: 'suspicious-domain.com',
      content: 'Urgent: Please verify your account immediately by clicking this link',
      contains_url: 1,
      url: 'http://phishing-site.com/login',
      attachment_type: 'pdf',
      priority: 'high' as Priority,
      threat_category: 'phishing' as NotificationSeverity,
      risk_score: 0.85,
      timestamp: '2024-01-15T14:30:00Z',
      country: 'NG',
      device_type: 'Mobile' as DeviceType,
      is_malicious: 1,
      review_status: 'Pending' as ReviewStatus
    };

    const result = validateDatasetNotification(realWorldNotification);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should handle edge cases', () => {
    const edgeCases = [
      { notification_id: '', sender: 'test@test.com' }, // Missing ID
      { notification_id: 'N123', sender: '' }, // Invalid ID, missing sender
      { notification_id: 'N123', sender: 'test@test.com', risk_score: NaN }, // Invalid risk score
      { notification_id: 'N123', sender: 'test@test.com', timestamp: 'invalid-date' } // Invalid timestamp
    ];

    edgeCases.forEach((testCase, index) => {
      const result = validateDatasetNotification(testCase);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
