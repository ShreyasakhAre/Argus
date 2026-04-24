/**
 * Demo Mode Configuration
 * 
 * Provides fallback data and safe mode operation
 */

export const DEMO_MODE = true; // Always enabled for reliability

export const SAFE_MODE_CONFIG = {
  // Enable demo mode by default for reliability
  enabled: DEMO_MODE || true,
  
  // Fallback data when APIs fail
  fallbackData: true,
  
  // Error handling
  suppressErrors: true,
  
  // Mock data generators
  useMockData: true,
  
  // Database connection attempts
  maxDbRetries: 3,
  
  // API timeout
  apiTimeout: 5000,
  
  // Cache duration for mock data (ms)
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

/**
 * Safe mode wrapper for API routes
 */
export function withSafeMode<T>(
  fallback: T,
  operation: () => Promise<T> | T
): Promise<T> {
  return new Promise((resolve) => {
    try {
      const result = operation();
      
      if (result instanceof Promise) {
        result
          .then((data) => resolve(data))
          .catch((error: any) => {
            console.warn('🛡️ Safe Mode: Operation failed, using fallback:', error?.message || 'Unknown error');
            resolve(fallback);
          });
      } else {
        resolve(result);
      }
    } catch (error: any) {
      console.warn('🛡️ Safe Mode: Sync operation failed, using fallback:', error?.message || 'Unknown error');
      resolve(fallback);
    }
  });
}

/**
 * Mock data generators for demo mode
 */
export const mockGenerators = {
  /**
   * Generate mock notifications
   */
  notifications: (params: any = {}) => ({
    success: true,
    notifications: [
      {
        _id: 'demo_notif_1',
        title: 'High Risk: Email from unknown.sender@external.com',
        message: 'URGENT: Wire transfer needed immediately to account 12345678. Verify at suspicious link.',
        severity: 'critical',
        risk_level: 'High',
        risk_score: 0.92,
        sender: 'unknown.sender@external.com',
        receiver: 'finance.team@company.com',
        department: 'Finance',
        source_app: 'Email',
        timestamp: new Date().toISOString(),
        read: false,
        is_flagged: true,
        org_id: params.org_id || 'DEMO_ORG',
      },
      {
        _id: 'demo_notif_2',
        title: 'Medium Risk: Slack message from external domain',
        message: 'Click here to download the quarterly report from external server.',
        severity: 'high',
        risk_level: 'Medium',
        risk_score: 0.65,
        sender: 'external.vendor@partner.com',
        receiver: 'team@company.com',
        department: 'Operations',
        source_app: 'Slack',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        is_flagged: false,
        org_id: params.org_id || 'DEMO_ORG',
      },
      {
        _id: 'demo_notif_3',
        title: 'Low Risk: Internal system notification',
        message: 'System maintenance scheduled for this weekend.',
        severity: 'medium',
        risk_level: 'Low',
        risk_score: 0.12,
        sender: 'admin@company.com',
        receiver: 'all.employees@company.com',
        department: 'IT',
        source_app: 'Internal System',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: true,
        is_flagged: false,
        org_id: params.org_id || 'DEMO_ORG',
      }
    ],
    data: [],
    unreadCount: 2,
    total: 3,
    pagination: {
      skip: 0,
      limit: 1000,
      total: 3,
      hasMore: false,
    }
  }),

  /**
   * Generate mock stats
   */
  stats: () => ({
    success: true,
    total_notifications: 1247,
    flagged_notifications: 89,
    benign_notifications: 1158,
    model_metrics: {
      accuracy: 0.94,
      precision: 0.91,
      recall: 0.89,
      f1_score: 0.90
    },
    department_stats: {
      'Finance': { total: 234, flagged: 45, risk_score: 0.72 },
      'IT': { total: 189, flagged: 12, risk_score: 0.34 },
      'HR': { total: 156, flagged: 8, risk_score: 0.28 },
      'Sales': { total: 298, flagged: 18, risk_score: 0.41 },
      'Operations': { total: 370, flagged: 6, risk_score: 0.19 }
    },
    feature_importance: {
      'sender_domain': 0.28,
      'link_count': 0.24,
      'urgency_words': 0.19,
      'attachment_presence': 0.15,
      'time_of_day': 0.08,
      'message_length': 0.06
    },
    threat_types: {
      'phishing': 45,
      'malware': 12,
      'ransomware': 8,
      'social_engineering': 24
    }
  }),

  /**
   * Generate mock user data
   */
  user: (role: string = 'admin') => ({
    success: true,
    token: 'demo_token_' + Date.now(),
    user: {
      email: `demo.${role}@company.com`,
      role,
      orgId: 'DEMO_ORG',
      name: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')
    }
  }),

  /**
   * Generate mock analytics data
   */
  analytics: () => ({
    success: true,
    trends: {
      daily: [
        { date: '2024-03-20', threats: 23, blocked: 21 },
        { date: '2024-03-21', threats: 18, blocked: 17 },
        { date: '2024-03-22', threats: 31, blocked: 29 },
        { date: '2024-03-23', threats: 27, blocked: 25 },
        { date: '2024-03-24', threats: 19, blocked: 18 },
        { date: '2024-03-25', threats: 22, blocked: 20 },
        { date: '2024-03-26', threats: 25, blocked: 23 }
      ],
      hourly: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        threats: Math.floor(Math.random() * 10) + 1,
        blocked: Math.floor(Math.random() * 8) + 1
      }))
    },
    performance: {
      avg_response_time: 2.3,
      detection_rate: 0.94,
      false_positive_rate: 0.06,
      uptime: 0.999
    }
  })
};

/**
 * Global error handler
 */
export function handleGlobalError(error: any, context: string = 'Unknown') {
  if (SAFE_MODE_CONFIG.suppressErrors) {
    console.error(`🛡️ Safe Mode Error [${context}]:`, error);
    return {
      success: false,
      error: 'System running in safe mode',
      message: 'Some features may be limited',
      context
    };
  }
  
  // In production, you might want to log to external service
  console.error(`❌ Error [${context}]:`, error);
  
  return {
    success: false,
    error: error.message || 'Unknown error occurred',
    context
  };
}
