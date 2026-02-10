import type { Notification, Stats, HeatmapData, Explanation, Feedback, SourceApp } from './ml-service';
import { scanTextForLinks } from './link-scanner';
import { generateLargeNotificationDataset } from './notifications-large';

const SOURCE_APPS: SourceApp[] = ['Email', 'Slack', 'Microsoft Teams', 'HR Portal', 'Finance System', 'Internal Mobile App'];

const notifications: Notification[] = generateLargeNotificationDataset([
  { notification_id: 'N001', org_id: 'ORG001', department: 'Finance', sender: 'john.doe@company.com', receiver: 'jane.smith@company.com', content: 'Please review the quarterly budget report attached. Access it at https://drive.google.com/finance-report-q4', timestamp: '2024-01-15 09:30:00', risk_score: 0.12, risk_level: 'Low', is_flagged: false, source_app: 'Email' },
  { notification_id: 'N002', org_id: 'ORG001', department: 'Finance', sender: 'unknown.sender@external.com', receiver: 'finance.team@company.com', content: 'URGENT: Wire transfer needed immediately to account 12345678. Verify at http://192.168.1.100/secure-login/verify-account', timestamp: '2024-01-15 10:15:00', risk_score: 0.92, risk_level: 'High', is_flagged: true, source_app: 'Email' },
  { notification_id: 'N003', org_id: 'ORG001', department: 'IT', sender: 'admin@company.com', receiver: 'all.employees@company.com', content: 'System maintenance scheduled for this weekend. Details at https://intranet.company.com/maintenance', timestamp: '2024-01-15 11:00:00', risk_score: 0.08, risk_level: 'Low', is_flagged: false, source_app: 'Slack' },
  { notification_id: 'N004', org_id: 'ORG001', department: 'HR', sender: 'hr.manager@company.com', receiver: 'new.employee@company.com', content: 'Welcome aboard! Please complete your onboarding documents at https://hr.company.com/onboarding', timestamp: '2024-01-15 11:30:00', risk_score: 0.05, risk_level: 'Low', is_flagged: false, source_app: 'HR Portal' },
  { notification_id: 'N005', org_id: 'ORG001', department: 'IT', sender: 'security.alert@unknown.com', receiver: 'admin@company.com', content: 'Your password expires in 24 hours click here to reset NOW http://security-verify-microsoft.xyz/password-reset?user=admin@company.com', timestamp: '2024-01-15 12:00:00', risk_score: 0.88, risk_level: 'High', is_flagged: true, source_app: 'Email' },
  { notification_id: 'N006', org_id: 'ORG002', department: 'Sales', sender: 'sales.rep@company.com', receiver: 'customer@client.com', content: 'Thank you for your interest in our products. View catalog at https://www.company.com/products', timestamp: '2024-01-15 13:00:00', risk_score: 0.11, risk_level: 'Low', is_flagged: false, source_app: 'Microsoft Teams' },
  { notification_id: 'N007', org_id: 'ORG001', department: 'Finance', sender: 'ceo.fake@company.com', receiver: 'accountant@company.com', content: 'Transfer $50000 to this account urgently confidential. Use this link http://secure-banking-portal.tk/transfer-auth', timestamp: '2024-01-15 14:00:00', risk_score: 0.95, risk_level: 'High', is_flagged: true, source_app: 'Slack' },
  { notification_id: 'N008', org_id: 'ORG002', department: 'Marketing', sender: 'marketing@company.com', receiver: 'all.staff@company.com', content: 'New campaign launching next week - please review materials at https://marketing.company.com/campaigns/q1-2024', timestamp: '2024-01-15 14:30:00', risk_score: 0.09, risk_level: 'Low', is_flagged: false, source_app: 'Microsoft Teams' },
  { notification_id: 'N009', org_id: 'ORG001', department: 'IT', sender: 'helpdesk@company.com', receiver: 'user123@company.com', content: 'Your ticket #4521 has been resolved. View details at https://helpdesk.company.com/tickets/4521', timestamp: '2024-01-15 15:00:00', risk_score: 0.06, risk_level: 'Low', is_flagged: false, source_app: 'Internal Mobile App' },
  { notification_id: 'N010', org_id: 'ORG001', department: 'Executive', sender: 'board@company.com', receiver: 'executives@company.com', content: 'Board meeting rescheduled to Friday 3PM. Calendar invite at https://calendar.company.com/board-meeting', timestamp: '2024-01-15 15:30:00', risk_score: 0.07, risk_level: 'Low', is_flagged: false, source_app: 'Email' },
  { notification_id: 'N011', org_id: 'ORG002', department: 'Finance', sender: 'suspicious@tempmail.com', receiver: 'cfo@company.com', content: 'Immediate action required wire transfer authorization. Complete form at http://urgent-finance-verify.click/auth?id=cfo', timestamp: '2024-01-16 08:00:00', risk_score: 0.91, risk_level: 'High', is_flagged: true, source_app: 'Finance System' },
  { notification_id: 'N012', org_id: 'ORG001', department: 'HR', sender: 'hr@company.com', receiver: 'managers@company.com', content: 'Annual performance review schedule attached. Access system at https://hr.company.com/performance', timestamp: '2024-01-16 09:00:00', risk_score: 0.10, risk_level: 'Low', is_flagged: false, source_app: 'HR Portal' },
  { notification_id: 'N013', org_id: 'ORG001', department: 'IT', sender: 'phishing@malicious.net', receiver: 'it.admin@company.com', content: 'Your account has been compromised verify credentials immediately at http://microsoft-secure-login.ml/verify?account=it.admin@company.com', timestamp: '2024-01-16 09:30:00', risk_score: 0.94, risk_level: 'High', is_flagged: true, source_app: 'Email' },
  { notification_id: 'N014', org_id: 'ORG002', department: 'Sales', sender: 'regional.manager@company.com', receiver: 'sales.team@company.com', content: 'Q1 targets have been updated - check dashboard at https://sales.company.com/dashboard', timestamp: '2024-01-16 10:00:00', risk_score: 0.08, risk_level: 'Low', is_flagged: false, source_app: 'Microsoft Teams' },
  { notification_id: 'N015', org_id: 'ORG001', department: 'Finance', sender: 'accounts@company.com', receiver: 'vendors@company.com', content: 'Invoice processing will be delayed this week. Check status at https://finance.company.com/vendor-portal', timestamp: '2024-01-16 10:30:00', risk_score: 0.12, risk_level: 'Low', is_flagged: false, source_app: 'Finance System' },
  { notification_id: 'N016', org_id: 'ORG001', department: 'Executive', sender: 'fake.ceo@external.net', receiver: 'assistant@company.com', content: 'Send me all employee SSN data urgently for audit. Upload files at http://secure-data-upload.ga/confidential-audit', timestamp: '2024-01-16 11:00:00', risk_score: 0.97, risk_level: 'High', is_flagged: true, source_app: 'Email' },
  { notification_id: 'N017', org_id: 'ORG002', department: 'IT', sender: 'sysadmin@company.com', receiver: 'developers@company.com', content: 'New deployment pipeline is now active. View docs at https://github.com/company/deployment-guide', timestamp: '2024-01-16 11:30:00', risk_score: 0.07, risk_level: 'Low', is_flagged: false, source_app: 'Slack' },
  { notification_id: 'N018', org_id: 'ORG001', department: 'Marketing', sender: 'promo@company.com', receiver: 'customers@company.com', content: 'Special offer just for you - 50% discount! Claim at https://www.company.com/special-offers', timestamp: '2024-01-16 12:00:00', risk_score: 0.25, risk_level: 'Low', is_flagged: false, source_app: 'Internal Mobile App' },
  { notification_id: 'N019', org_id: 'ORG001', department: 'HR', sender: 'benefits@company.com', receiver: 'all.employees@company.com', content: 'Open enrollment period starts next Monday. Enroll at https://benefits.company.com/enrollment', timestamp: '2024-01-16 13:00:00', risk_score: 0.06, risk_level: 'Low', is_flagged: false, source_app: 'HR Portal' },
  { notification_id: 'N020', org_id: 'ORG002', department: 'Finance', sender: 'attacker@darkweb.com', receiver: 'treasury@company.com', content: 'ACT NOW transfer funds to save company from penalty. Instructions at http://192.168.50.25/emergency-transfer-instructions.exe', timestamp: '2024-01-16 14:00:00', risk_score: 0.93, risk_level: 'High', is_flagged: true, source_app: 'Email' },
  { notification_id: 'N021', org_id: 'ORG001', department: 'IT', sender: 'ransomware@criminal.org', receiver: 'ciso@company.com', content: 'Your files are encrypted pay 5 BTC or lose everything. Payment portal http://darknet-payment-portal.onion/ransom?id=company001', timestamp: '2024-01-17 08:30:00', risk_score: 0.99, risk_level: 'High', is_flagged: true, source_app: 'Email' },
  { notification_id: 'N022', org_id: 'ORG001', department: 'Finance', sender: 'vendor.support@trusted.com', receiver: 'ap@company.com', content: 'Invoice #INV-2024-0123 attached for services rendered. View at https://vendor-portal.trusted.com/invoices/2024-0123', timestamp: '2024-01-17 09:15:00', risk_score: 0.15, risk_level: 'Low', is_flagged: false, source_app: 'Finance System' },
  { notification_id: 'N023', org_id: 'ORG002', department: 'HR', sender: 'recruiter@company.com', receiver: 'candidates@external.com', content: 'Thank you for applying we will review your application. Track status at https://careers.company.com/applications', timestamp: '2024-01-17 10:00:00', risk_score: 0.08, risk_level: 'Low', is_flagged: false, source_app: 'HR Portal' },
  { notification_id: 'N024', org_id: 'ORG001', department: 'Executive', sender: 'impostor.board@scam.net', receiver: 'ceo@company.com', content: 'Emergency board vote required transfer authorization needed immediately. Vote at http://board-vote-secure.pw/emergency-authorization', timestamp: '2024-01-17 11:00:00', risk_score: 0.96, risk_level: 'High', is_flagged: true, source_app: 'Microsoft Teams' },
  { notification_id: 'N025', org_id: 'ORG002', department: 'Sales', sender: 'partner@distributor.com', receiver: 'sales.director@company.com', content: 'Partnership renewal contract ready for signature. View at https://www.distributor.com/contracts/partnership-2024', timestamp: '2024-01-17 14:00:00', risk_score: 0.11, risk_level: 'Low', is_flagged: false, source_app: 'Email' },
]);

const feedbackStore: Feedback[] = [];

// ── Bell-compatible read tracking ──
const readNotificationIds = new Set<string>();

/** Transform an ML-service notification into the shape the bell & feed expect */
function toBellNotification(n: Notification) {
  return {
    ...n,
    _id: n.notification_id,
    title: `${n.risk_level} Risk: ${n.source_app} from ${n.sender.split('@')[0]}`,
    message: n.content,
    severity: n.risk_level === 'High' ? 'critical' : n.risk_level === 'Medium' ? 'high' : 'medium',
    read: readNotificationIds.has(n.notification_id),
  };
}

export interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  indicators: string[];
  detectedCount: number;
  lastDetected: string;
  status: 'Active' | 'Monitoring' | 'Resolved';
}

export interface Alert {
  id: string;
  notification_id: string;
  type: 'new_threat' | 'pattern_match' | 'high_risk' | 'bulk_attack' | 'anomaly';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  details: Record<string, unknown>;
}

export interface TimelineEvent {
  id: string;
  notification_id: string;
  event_type: 'detected' | 'reviewed' | 'approved' | 'rejected' | 'escalated';
  timestamp: string;
  actor?: string;
  details: string;
}

const threatPatterns: ThreatPattern[] = [
  {
    id: 'TP001',
    name: 'CEO Fraud / BEC Attack',
    description: 'Business Email Compromise attempts impersonating executives to request urgent transfers',
    severity: 'Critical',
    indicators: ['CEO impersonation', 'Urgent wire transfer', 'Confidential request', 'External sender'],
    detectedCount: 4,
    lastDetected: '2024-01-17 11:00:00',
    status: 'Active'
  },
  {
    id: 'TP002',
    name: 'Credential Phishing',
    description: 'Attempts to steal user credentials through fake password reset or account verification',
    severity: 'High',
    indicators: ['Password expiry', 'Click link', 'Verify credentials', 'Account compromised'],
    detectedCount: 3,
    lastDetected: '2024-01-16 09:30:00',
    status: 'Active'
  },
  {
    id: 'TP003',
    name: 'Ransomware Threat',
    description: 'Extortion attempts threatening data encryption or exposure',
    severity: 'Critical',
    indicators: ['Files encrypted', 'Pay bitcoin', 'Data leaked', 'Ransom demand'],
    detectedCount: 1,
    lastDetected: '2024-01-17 08:30:00',
    status: 'Monitoring'
  },
  {
    id: 'TP004',
    name: 'Data Exfiltration Request',
    description: 'Requests for sensitive employee or company data',
    severity: 'High',
    indicators: ['SSN data', 'Employee records', 'Confidential files', 'Urgent audit'],
    detectedCount: 2,
    lastDetected: '2024-01-16 11:00:00',
    status: 'Active'
  },
  {
    id: 'TP005',
    name: 'Invoice Fraud',
    description: 'Fake invoices or payment redirection attempts',
    severity: 'Medium',
    indicators: ['Invoice attached', 'Payment details changed', 'New bank account', 'Vendor impersonation'],
    detectedCount: 2,
    lastDetected: '2024-01-16 14:00:00',
    status: 'Monitoring'
  }
];

const alerts: Alert[] = [
  {
    id: 'A001',
    notification_id: 'N021',
    type: 'new_threat',
    severity: 'critical',
    message: 'Ransomware threat detected - Immediate action required',
    timestamp: '2024-01-17 08:30:15',
    acknowledged: false,
    details: { pattern: 'TP003', sender: 'ransomware@criminal.org' }
  },
  {
    id: 'A002',
    notification_id: 'N024',
    type: 'pattern_match',
    severity: 'critical',
    message: 'CEO Fraud pattern detected - Executive impersonation attempt',
    timestamp: '2024-01-17 11:00:22',
    acknowledged: false,
    details: { pattern: 'TP001', target: 'ceo@company.com' }
  },
  {
    id: 'A003',
    notification_id: 'N016',
    type: 'high_risk',
    severity: 'high',
    message: 'Data exfiltration attempt - SSN data request flagged',
    timestamp: '2024-01-16 11:00:45',
    acknowledged: true,
    details: { pattern: 'TP004', risk_score: 0.97 }
  },
  {
    id: 'A004',
    notification_id: 'N013',
    type: 'pattern_match',
    severity: 'high',
    message: 'Credential phishing detected - Account compromise attempt',
    timestamp: '2024-01-16 09:30:33',
    acknowledged: true,
    details: { pattern: 'TP002', sender: 'phishing@malicious.net' }
  },
  {
    id: 'A005',
    notification_id: 'N007',
    type: 'bulk_attack',
    severity: 'high',
    message: 'Multiple wire transfer requests from suspicious sources',
    timestamp: '2024-01-15 14:00:18',
    acknowledged: true,
    details: { related_notifications: ['N002', 'N007', 'N011'] }
  }
];

const timelineEvents: TimelineEvent[] = [
  { id: 'E001', notification_id: 'N002', event_type: 'detected', timestamp: '2024-01-15 10:15:00', details: 'High-risk notification detected by ML model' },
  { id: 'E002', notification_id: 'N002', event_type: 'reviewed', timestamp: '2024-01-15 10:45:00', actor: 'analyst.john', details: 'Reviewed by fraud analyst' },
  { id: 'E003', notification_id: 'N002', event_type: 'approved', timestamp: '2024-01-15 10:50:00', actor: 'analyst.john', details: 'Confirmed as malicious - CEO fraud attempt' },
  { id: 'E004', notification_id: 'N005', event_type: 'detected', timestamp: '2024-01-15 12:00:00', details: 'Phishing attempt detected' },
  { id: 'E005', notification_id: 'N007', event_type: 'detected', timestamp: '2024-01-15 14:00:00', details: 'Wire fraud attempt detected' },
  { id: 'E006', notification_id: 'N007', event_type: 'escalated', timestamp: '2024-01-15 14:15:00', actor: 'system', details: 'Escalated to security team - high value target' },
  { id: 'E007', notification_id: 'N013', event_type: 'detected', timestamp: '2024-01-16 09:30:00', details: 'Credential phishing detected' },
  { id: 'E008', notification_id: 'N016', event_type: 'detected', timestamp: '2024-01-16 11:00:00', details: 'Data exfiltration attempt detected' },
  { id: 'E009', notification_id: 'N021', event_type: 'detected', timestamp: '2024-01-17 08:30:00', details: 'Ransomware threat detected - Critical severity' },
  { id: 'E010', notification_id: 'N024', event_type: 'detected', timestamp: '2024-01-17 11:00:00', details: 'Executive impersonation detected' },
];
   
// export const mockData = {
//   getNotifications: (params?: { 
//     org_id?: string; 
//     department?: string; 
//     flagged_only?: boolean;
//     search?: string;
//     risk_level?: string;
//     date_from?: string;
//     date_to?: string;
//     sender_domain?: string;
//     source_app?: string;
//   }): { notifications: Notification[]; total: number } => {
//     let filtered = [...notifications];
//     if (params?.org_id) filtered = filtered.filter(n => n.org_id === params.org_id);
//     if (params?.department) filtered = filtered.filter(n => n.department === params.department);
//     if (params?.flagged_only) filtered = filtered.filter(n => n.is_flagged);
//     if (params?.risk_level) filtered = filtered.filter(n => n.risk_level === params.risk_level);
//     if (params?.source_app) filtered = filtered.filter(n => n.source_app === params.source_app);
//     if (params?.search) {
//       const searchLower = params.search.toLowerCase();
//       filtered = filtered.filter(n => 
//         n.content.toLowerCase().includes(searchLower) ||
//         n.sender.toLowerCase().includes(searchLower) ||
//         n.receiver.toLowerCase().includes(searchLower) ||
//         n.notification_id.toLowerCase().includes(searchLower)
//       );
//     }
//     if (params?.sender_domain) {
//       filtered = filtered.filter(n => n.sender.includes(params.sender_domain));
//     }
//     if (params?.date_from) {
//       filtered = filtered.filter(n => n.timestamp >= params.date_from!);
//     }
//     if (params?.date_to) {
//       filtered = filtered.filter(n => n.timestamp <= params.date_to!);
//     }
//     return { notifications: filtered, total: filtered.length };
//   },
export const mockData = {
  getNotifications: (params?: {
    org_id?: string;
    department?: string;
    flagged_only?: boolean;
    search?: string;
    risk_level?: string;
    date_from?: string;
    date_to?: string;
    sender_domain?: string;
    source_app?: string;
  }): { notifications: Notification[]; total: number } => {

    let filtered = [...notifications];

    if (params?.org_id) filtered = filtered.filter(n => n.org_id === params.org_id);
    if (params?.department) filtered = filtered.filter(n => n.department === params.department);
    if (params?.flagged_only) filtered = filtered.filter(n => n.is_flagged);
    if (params?.risk_level) filtered = filtered.filter(n => n.risk_level === params.risk_level);
    if (params?.source_app) filtered = filtered.filter(n => n.source_app === params.source_app);

    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter(n =>
        n.content.toLowerCase().includes(s) ||
        n.sender.toLowerCase().includes(s) ||
        n.receiver.toLowerCase().includes(s)
      );
    }

    if (params?.sender_domain) {
      filtered = filtered.filter(n => n.sender.includes(params.sender_domain!));
    }
    if (params?.date_from) {
      filtered = filtered.filter(n => n.timestamp >= params.date_from!);
    }
    if (params?.date_to) {
      filtered = filtered.filter(n => n.timestamp <= params.date_to!);
    }

    return { notifications: filtered.map(toBellNotification), total: filtered.length };
  },

  /** Mark a notification as read by _id (which equals notification_id) */
  markAsRead: (id: string): boolean => {
    const exists = notifications.some(n => n.notification_id === id);
    if (exists) {
      readNotificationIds.add(id);
      return true;
    }
    return false;
  },

  /** Get the count of unread notifications */
  getUnreadCount: (): number => {
    return notifications.filter(n => !readNotificationIds.has(n.notification_id)).length;
  },

  getSourceApps: (): { source_apps: SourceApp[] } => {
    return { source_apps: SOURCE_APPS };
  },

  getHeatmap: (org_id?: string): { heatmap: HeatmapData } => {
    let filtered = org_id ? notifications.filter(n => n.org_id === org_id) : notifications;
    const heatmap: HeatmapData = {};

    filtered.forEach(n => {
      if (!heatmap[n.department]) {
        heatmap[n.department] = { total: 0, flagged: 0, high_risk: 0, medium_risk: 0, low_risk: 0, avg_risk_score: 0, flagged_percentage: 0 };
      }
      heatmap[n.department].total++;
      if (n.is_flagged) heatmap[n.department].flagged++;
      if (n.risk_level === 'High') heatmap[n.department].high_risk++;
      else if (n.risk_level === 'Medium') heatmap[n.department].medium_risk++;
      else heatmap[n.department].low_risk++;
      heatmap[n.department].avg_risk_score += n.risk_score;
    });

    Object.keys(heatmap).forEach(dept => {
      heatmap[dept].avg_risk_score /= heatmap[dept].total;
      heatmap[dept].flagged_percentage = (heatmap[dept].flagged / heatmap[dept].total) * 100;
    });

    return { heatmap };
  },

    getExplanation: (notification_id: string): Explanation | null => {
      const notification = notifications.find(n => n.notification_id === notification_id);
      if (!notification) return null;
  
      const linkScans = scanTextForLinks(notification.content);
      const hasMaliciousLink = linkScans.some(s => s.is_malicious);
  
      const topFeatures = notification.is_flagged 
        ? [
            ...(hasMaliciousLink ? [{ feature: 'malicious_link_detected', impact: 0.45, direction: 'increases' }] : []),
            { feature: 'has_urgent', impact: 0.35, direction: 'increases' },
            { feature: 'is_external_sender', impact: 0.28, direction: 'increases' },
            { feature: 'has_money_keywords', impact: 0.22, direction: 'increases' }
          ]
        : [
            { feature: 'is_external_sender', impact: -0.25, direction: 'decreases' },
            { feature: 'has_urgent', impact: -0.18, direction: 'decreases' }
          ];
  
      return {
        notification_id,
        prediction: {
          notification_id,
          risk_score: notification.risk_score,
          risk_level: notification.risk_level,
          is_flagged: notification.is_flagged
        },
        explanation: {
          top_features: topFeatures,
          explanation_text: notification.is_flagged 
            ? `${hasMaliciousLink ? 'Malicious URL detected. ' : ''}Flagged because: urgency keywords detected, sender is from external domain, financial/money keywords detected`
            : 'No significant risk factors identified',
          all_impacts: topFeatures,
          link_scans: linkScans
        }
      };
    },


  submitFeedback: (feedback: Feedback): { message: string; total_feedback: number } => {
    feedbackStore.push({ ...feedback, timestamp: new Date().toISOString() });
    return { message: 'Feedback recorded', total_feedback: feedbackStore.length };
  },

  submitBulkFeedback: (feedbackList: Feedback[]): { message: string; processed: number; total_feedback: number } => {
    feedbackList.forEach(fb => {
      feedbackStore.push({ ...fb, timestamp: new Date().toISOString() });
    });
    return { 
      message: `${feedbackList.length} feedback items recorded`, 
      processed: feedbackList.length,
      total_feedback: feedbackStore.length 
    };
  },

  getFeedback: (): { feedback: Feedback[]; total: number } => {
    return { feedback: feedbackStore, total: feedbackStore.length };
  },

  retrain: (): { message: string; old_accuracy: number; new_accuracy: number; metrics: Stats['model_metrics']; feedback_samples_used: number } => {
    return {
      message: 'Model retrained successfully',
      old_accuracy: 0.95,
      new_accuracy: 0.96,
      metrics: {
        accuracy: 0.96,
        precision: 0.93,
        recall: 0.89,
        f1_score: 0.91,
        total_samples: 100,
        malicious_samples: 22,
        benign_samples: 78
      },
      feedback_samples_used: feedbackStore.filter(f => f.corrected_label !== undefined).length
    };
  },

  getDepartments: (): { departments: string[] } => {
    return { departments: [...new Set(notifications.map(n => n.department))] };
  },

  getOrganizations: (): { organizations: string[] } => {
    return { organizations: [...new Set(notifications.map(n => n.org_id))] };
  },

  getThreatPatterns: (): { patterns: ThreatPattern[]; total: number } => {
    return { patterns: threatPatterns, total: threatPatterns.length };
  },

  getAlerts: (acknowledged?: boolean): { alerts: Alert[]; total: number; unacknowledged: number } => {
    let filtered = [...alerts];
    if (acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === acknowledged);
    }
    return { 
      alerts: filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      total: filtered.length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length
    };
  },

  acknowledgeAlert: (alertId: string): { success: boolean; alert: Alert | null } => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return { success: true, alert };
    }
    return { success: false, alert: null };
  },

  getTimeline: (notification_id?: string): { events: TimelineEvent[]; total: number } => {
    let filtered = notification_id 
      ? timelineEvents.filter(e => e.notification_id === notification_id)
      : timelineEvents;
    return { 
      events: filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      total: filtered.length 
    };
  },

  getAnalytics: () => {
    const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      total: Math.floor(Math.random() * 10) + 2,
      flagged: Math.floor(Math.random() * 3)
    }));

    const weeklyTrend = [
      { week: 'Week 1', detected: 12, falsePositive: 2, confirmed: 10 },
      { week: 'Week 2', detected: 15, falsePositive: 3, confirmed: 12 },
      { week: 'Week 3', detected: 8, falsePositive: 1, confirmed: 7 },
      { week: 'Week 4', detected: 18, falsePositive: 4, confirmed: 14 },
    ];

    const attackVectors = [
      { name: 'CEO Fraud', value: 35 },
      { name: 'Phishing', value: 28 },
      { name: 'Invoice Fraud', value: 18 },
      { name: 'Data Theft', value: 12 },
      { name: 'Ransomware', value: 7 },
    ];

    const riskTrend = [
      { date: '2024-01-15', avgRisk: 0.32, maxRisk: 0.95 },
      { date: '2024-01-16', avgRisk: 0.38, maxRisk: 0.97 },
      { date: '2024-01-17', avgRisk: 0.41, maxRisk: 0.99 },
    ];

    return {
      hourlyDistribution,
      weeklyTrend,
      attackVectors,
      riskTrend,
      summary: {
        avgResponseTime: '12 min',
        detectionRate: '94.5%',
        falsePositiveRate: '8.2%',
        threatsBlocked: 47,
        totalAnalyzed: 2847
      }
    };
  },

  exportReport: (format: 'csv' | 'json', filters?: Record<string, unknown>) => {
    const data = mockData.getNotifications(filters as Parameters<typeof mockData.getNotifications>[0]);
    
    if (format === 'csv') {
      const headers = ['notification_id', 'org_id', 'department', 'sender', 'receiver', 'content', 'timestamp', 'risk_score', 'risk_level', 'is_flagged'];
      const rows = data.notifications.map(n => 
        headers.map(h => JSON.stringify((n as Record<string, unknown>)[h])).join(',')
      );
      return {
        format: 'csv',
        filename: `argus_report_${new Date().toISOString().split('T')[0]}.csv`,
        content: [headers.join(','), ...rows].join('\n'),
        records: data.notifications.length
      };
    }
    
    return {
      format: 'json',
      filename: `argus_report_${new Date().toISOString().split('T')[0]}.json`,
      content: JSON.stringify(data, null, 2),
      records: data.notifications.length
    };
  },

  getStats: (): Stats => {
    const allNotifications = notifications;
    const flagged = allNotifications.filter(n => n.is_flagged);
    const benign = allNotifications.filter(n => !n.is_flagged);

    const departmentStats: Record<string, { total: number; flagged: number; avg_risk: number }> = {};
    allNotifications.forEach(n => {
      if (!departmentStats[n.department]) {
        departmentStats[n.department] = { total: 0, flagged: 0, avg_risk: 0 };
      }
      departmentStats[n.department].total++;
      if (n.is_flagged) departmentStats[n.department].flagged++;
      departmentStats[n.department].avg_risk += n.risk_score;
    });
    Object.keys(departmentStats).forEach(dept => {
      departmentStats[dept].avg_risk /= departmentStats[dept].total;
    });

    return {
      total_notifications: allNotifications.length,
      flagged_notifications: flagged.length,
      benign_notifications: benign.length,
      model_metrics: {
        accuracy: 0.95,
        precision: 0.92,
        recall: 0.88,
        f1_score: 0.90,
        total_samples: allNotifications.length,
        malicious_samples: flagged.length,
        benign_samples: benign.length,
      },
      department_stats: departmentStats,
      feature_importance: {
        has_urgent: 0.35,
        is_external_sender: 0.28,
        has_money_keywords: 0.22,
        malicious_link_detected: 0.45,
        sender_reputation: 0.18,
      },
    };
  }
};
