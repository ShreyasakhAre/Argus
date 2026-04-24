/**
 * VALIDATION TESTS
 * Simple JavaScript tests for data validation
 */

const {
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
} = require('./data-validation');

// ============================================
// TEST RUNNER
// ============================================

function test(description, testFn) {
  try {
    console.log(`✓ ${description}`);
    const result = testFn();
    if (typeof result === 'boolean' && !result) {
      throw new Error(`Test failed: ${description}`);
    }
    return true;
  } catch (error) {
    console.error(`✗ ${description}: ${error.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================
// VALIDATION FUNCTION TESTS
// ============================================

function runAllTests() {
  console.log('🧪 Running Validation Tests...\n');

  let passedTests = 0;
  let totalTests = 0;

  // Notification ID Tests
  totalTests++;
  if (test('Notification ID Validation - Valid ID', () => {
    return assert(isValidNotificationId('N123456789012'), 'Should accept valid notification ID');
  })) passedTests++;

  totalTests++;
  if (test('Notification ID Validation - Invalid ID', () => {
    return assert(!isValidNotificationId('INVALID_ID'), 'Should reject invalid notification ID');
  })) passedTests++;

  // Email Validation Tests
  totalTests++;
  if (test('Email Validation - Valid Email', () => {
    return assert(isValidEmail('user@company.com'), 'Should accept valid email');
  })) passedTests++;

  totalTests++;
  if (test('Email Validation - Invalid Email', () => {
    return assert(!isValidEmail('invalid-email'), 'Should reject invalid email');
  })) passedTests++;

  // Risk Score Tests
  totalTests++;
  if (test('Risk Score Validation - Valid Range', () => {
    return assert(isValidRiskScore(0.5), 'Should accept valid risk score');
  })) passedTests++;

  totalTests++;
  if (test('Risk Score Validation - Out of Range', () => {
    return assert(!isValidRiskScore(1.5), 'Should reject out of range risk score');
  })) passedTests++;

  // Threat Category Tests
  totalTests++;
  if (test('Threat Category Validation - Valid Category', () => {
    return assert(isValidThreatCategory('phishing'), 'Should accept valid threat category');
  })) passedTests++;

  totalTests++;
  if (test('Threat Category Validation - Invalid Category', () => {
    return assert(!isValidThreatCategory('invalid'), 'Should reject invalid threat category');
  })) passedTests++;

  // Priority Tests
  totalTests++;
  if (test('Priority Validation - Valid Priority', () => {
    return assert(isValidPriority('high'), 'Should accept valid priority');
  })) passedTests++;

  totalTests++;
  if (test('Priority Validation - Invalid Priority', () => {
    return assert(!isValidPriority('invalid'), 'Should reject invalid priority');
  })) passedTests++;

  // Channel Tests
  totalTests++;
  if (test('Channel Validation - Valid Channel', () => {
    return assert(isValidChannel('Email'), 'Should accept valid channel');
  })) passedTests++;

  totalTests++;
  if (test('Channel Validation - Invalid Channel', () => {
    return assert(!isValidChannel('invalid'), 'Should reject invalid channel');
  })) passedTests++;

  // Device Type Tests
  totalTests++;
  if (test('Device Type Validation - Valid Device', () => {
    return assert(isValidDeviceType('Desktop'), 'Should accept valid device type');
  })) passedTests++;

  totalTests++;
  if (test('Device Type Validation - Invalid Device', () => {
    return assert(!isValidDeviceType('invalid'), 'Should reject invalid device type');
  })) passedTests++;

  // Review Status Tests
  totalTests++;
  if (test('Review Status Validation - Valid Status', () => {
    return assert(isValidReviewStatus('Approved'), 'Should accept valid review status');
  })) passedTests++;

  totalTests++;
  if (test('Review Status Validation - Invalid Status', () => {
    return assert(!isValidReviewStatus('invalid'), 'Should reject invalid review status');
  })) passedTests++;

  // ============================================
  // DATASET NOTIFICATION VALIDATION TESTS
  // ============================================

  const validNotification = {
    notification_id: 'N123456789012',
    org_id: 'ORG001',
    department: 'IT',
    channel: 'Email',
    sender: 'user@company.com',
    receiver: 'analyst@company.com',
    sender_domain: 'company.com',
    content: 'Test notification content',
    contains_url: 0,
    url: undefined,
    attachment_type: 'none',
    priority: 'medium',
    threat_category: 'suspicious',
    risk_score: 0.65,
    timestamp: '2024-01-15T10:30:00Z',
    country: 'US',
    device_type: 'Desktop',
    is_malicious: 0,
    review_status: 'Pending',
    analyst_feedback: undefined
  };

  const invalidNotification = {
    ...validNotification,
    notification_id: 'INVALID_ID',
    sender: 'invalid-email',
    risk_score: 1.5,
    priority: 'invalid',
    threat_category: 'invalid',
    channel: 'invalid',
    device_type: 'invalid',
    review_status: 'invalid'
  };

  // Valid Notification Test
  totalTests++;
  if (test('Dataset Notification Validation - Complete Valid', () => {
    const result = validateDatasetNotification(validNotification);
    assert(result.isValid, 'Should validate complete valid notification');
    assert(result.errors.length === 0, 'Should have no errors');
    return true;
  })) passedTests++;

  // Missing Required Fields Test
  totalTests++;
  if (test('Dataset Notification Validation - Missing Required Fields', () => {
    const incomplete = { ...validNotification };
    delete incomplete.notification_id;
    delete incomplete.sender;
    delete incomplete.content;

    const result = validateDatasetNotification(incomplete);
    assert(!result.isValid, 'Should reject notification with missing fields');
    assert(result.errors.includes('Notification ID is required'), 'Should detect missing notification ID');
    assert(result.errors.includes('Sender is required'), 'Should detect missing sender');
    assert(result.errors.includes('Content is required'), 'Should detect missing content');
    return true;
  })) passedTests++;

  // Invalid Formats Test
  totalTests++;
  if (test('Dataset Notification Validation - Invalid Formats', () => {
    const result = validateDatasetNotification(invalidNotification);
    assert(!result.isValid, 'Should reject notification with invalid formats');
    assert(result.errors.includes('Invalid notification ID format'), 'Should detect invalid notification ID');
    assert(result.errors.includes('Invalid sender email format'), 'Should detect invalid sender email');
    return true;
  })) passedTests++;

  // ============================================
  // FRAUD CASE VALIDATION TESTS
  // ============================================

  const validFraudCase = {
    case_id: 'FC123456789',
    notification_id: 'N123456789012',
    org_id: 'ORG001',
    department: 'IT',
    channel: 'Email',
    sender: 'user@company.com',
    receiver: 'analyst@company.com',
    content: 'Test fraud case content',
    threat_category: 'phishing',
    risk_score: 0.85,
    priority: 'medium',
    case_priority: 'high',
    timestamp: '2024-01-15T10:30:00Z',
    review_status: 'Pending',
    analyst_feedback: undefined
  };

  // Valid Fraud Case Test
  totalTests++;
  if (test('Fraud Case Validation - Complete Valid', () => {
    const result = validateFraudCase(validFraudCase);
    assert(result.isValid, 'Should validate complete valid fraud case');
    assert(result.errors.length === 0, 'Should have no errors');
    return true;
  })) passedTests++;

  // ============================================
  // BATCH VALIDATION TESTS
  // ============================================

  // Valid Batch Test
  totalTests++;
  if (test('Batch Validation - All Valid', () => {
    const notifications = [validNotification, validNotification, validNotification];
    const result = validateNotificationBatch(notifications);
    assert(result.isValid, 'Should validate all valid notifications');
    assert(result.validCount === 3, 'Should count 3 valid notifications');
    assert(result.invalidCount === 0, 'Should count 0 invalid notifications');
    return true;
  })) passedTests++;

  // Mixed Batch Test
  totalTests++;
  if (test('Batch Validation - Mixed Valid/Invalid', () => {
    const notifications = [validNotification, invalidNotification, validNotification];
    const result = validateNotificationBatch(notifications);
    assert(!result.isValid, 'Should reject batch with invalid notifications');
    assert(result.validCount === 2, 'Should count 2 valid notifications');
    assert(result.invalidCount === 1, 'Should count 1 invalid notification');
    return true;
  })) passedTests++;

  // Duplicate Detection Test
  totalTests++;
  if (test('Duplicate Detection - Should Find Duplicates', () => {
    const notifications = [
      validNotification,
      { ...validNotification, notification_id: 'DUPLICATE_ID' },
      { ...validNotification, notification_id: 'DUPLICATE_ID' }
    ];

    const duplicates = checkDuplicateNotificationIds(notifications);
    assert(duplicates.includes('DUPLICATE_ID'), 'Should detect duplicate IDs');
    assert(duplicates.length === 1, 'Should find exactly 1 duplicate');
    return true;
  })) passedTests++;

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  totalTests++;
  if (test('Integration - Real World Notification', () => {
    const realWorldNotification = {
      notification_id: 'N987654321098',
      org_id: 'ORG002',
      department: 'Finance',
      channel: 'Email',
      sender: 'attacker@suspicious-domain.com',
      receiver: 'employee@company.com',
      sender_domain: 'suspicious-domain.com',
      content: 'Urgent: Please verify your account immediately',
      contains_url: 1,
      url: 'http://phishing-site.com/login',
      attachment_type: 'pdf',
      priority: 'high',
      threat_category: 'phishing',
      risk_score: 0.85,
      timestamp: '2024-01-15T14:30:00Z',
      country: 'NG',
      device_type: 'Mobile',
      is_malicious: 1,
      review_status: 'Pending'
    };

    const result = validateDatasetNotification(realWorldNotification);
    assert(result.isValid, 'Should validate real-world notification');
    assert(result.errors.length === 0, 'Should have no errors for valid data');
    return true;
  })) passedTests++;

  // ============================================
  // RESULTS SUMMARY
  // ============================================

  console.log('\n📊 Test Results:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Validation system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the validation logic.');
  }

  return {
    total: totalTests,
    passed: passedTests,
    failed: totalTests - passedTests,
    successRate: Math.round((passedTests / totalTests) * 100)
  };
}

// ============================================
  // EXPORT FOR MODULE USAGE
  // ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    test
  };
}

if (typeof window !== 'undefined') {
  window.validationTests = {
    runAllTests,
    test
  };
}
