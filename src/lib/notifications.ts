import { DatasetNotification, NotificationSeverity, Priority, Channel, DeviceType, ReviewStatus } from './types';

// LEGACY NOTIFICATION INTERFACE (for backward compatibility)
export interface Notification {
  id: string;
  type: 'scan_result' | 'threat_alert' | 'system';
  severity: 'safe' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  url?: string;
  risk_score?: number;
  timestamp: string;
  read: boolean;
}

// NEW DATASET NOTIFICATION HELPERS
export function createDatasetNotification(
  notification_id: string,
  org_id: string,
  department: string,
  channel: Channel,
  sender: string,
  receiver: string,
  sender_domain: string,
  content: string,
  contains_url: number,
  url: string | undefined,
  attachment_type: string,
  priority: Priority,
  threat_category: NotificationSeverity,
  risk_score: number,
  timestamp: string,
  country: string,
  device_type: DeviceType,
  is_malicious: number,
  review_status: ReviewStatus,
  analyst_feedback?: string
): DatasetNotification {
  return {
    notification_id,
    org_id,
    department,
    channel,
    sender,
    receiver,
    sender_domain,
    content,
    contains_url,
    url,
    attachment_type,
    priority,
    threat_category,
    risk_score,
    timestamp,
    country,
    device_type,
    is_malicious,
    review_status,
    analyst_feedback
  };
}

// Convert legacy notification to new dataset format
export function convertLegacyToDataset(legacy: Notification): DatasetNotification {
  return {
    notification_id: legacy.id,
    org_id: 'ORG001', // Default org
    department: 'IT', // Default department
    channel: 'Email',
    sender: 'system@argus.com',
    receiver: 'user@company.com',
    sender_domain: 'argus.com',
    content: legacy.message,
    contains_url: legacy.url ? 1 : 0,
    url: legacy.url,
    attachment_type: 'none',
    priority: mapSeverityToPriority(legacy.severity),
    threat_category: mapLegacySeverity(legacy.severity),
    risk_score: legacy.risk_score || 0,
    timestamp: legacy.timestamp,
    country: 'USA',
    device_type: 'Desktop',
    is_malicious: legacy.severity === 'critical' ? 1 : 0,
    review_status: 'Pending'
  };
}

// Helper functions for mapping
function mapSeverityToPriority(severity: string): Priority {
  switch (severity) {
    case 'safe': return 'low';
    case 'medium': return 'medium';
    case 'high': return 'high';
    case 'critical': return 'critical';
    default: return 'low';
  }
}

function mapLegacySeverity(severity: string): NotificationSeverity {
  switch (severity) {
    case 'safe': return 'safe';
    case 'medium': return 'low_risk_suspicious';
    case 'high': return 'high_risk_suspicious';
    case 'critical': return 'critical';
    default: return 'safe';
  }
}

export function createScanNotification(
  url: string,
  riskLevel: 'Safe' | 'Suspicious' | 'Critical',
  riskScore: number,
  explanation: string
): Notification {
  const severityMap: Record<typeof riskLevel, Notification['severity']> = {
    'Safe': 'safe',
    'Suspicious': 'high',
    'Critical': 'critical'
  };

  const notification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'scan_result',
    severity: severityMap[riskLevel],
    title: riskLevel === 'Safe' ? '✅ Safe Link Detected' : 
           riskLevel === 'Suspicious' ? '⚠️ Suspicious Link' : 
           '🚨 CRITICAL THREAT',
    message: explanation,
    url,
    risk_score: riskScore,
    timestamp: new Date().toISOString(),
    read: false
  };

  return notification;
}

// NEW: Create notification directly from dataset format
export function createNotificationFromDataset(
  datasetNotif: DatasetNotification
): Notification {
  const severityMap: Record<NotificationSeverity, Notification['severity']> = {
    'safe': 'safe',
    'low_risk_suspicious': 'medium',
    'suspicious': 'high',
    'high_risk_suspicious': 'high',
    'bec': 'critical',
    'ransomware': 'critical',
    'phishing': 'critical',
    'critical': 'critical'
  };

  return {
    id: datasetNotif.notification_id,
    type: datasetNotif.is_malicious ? 'threat_alert' : 'scan_result',
    severity: severityMap[datasetNotif.threat_category] || 'safe',
    title: generateTitleFromThreat(datasetNotif.threat_category, datasetNotif.priority),
    message: datasetNotif.content,
    url: datasetNotif.url,
    risk_score: datasetNotif.risk_score,
    timestamp: datasetNotif.timestamp,
    read: datasetNotif.review_status === 'Approved'
  };
}

function generateTitleFromThreat(threatCategory: NotificationSeverity, priority: Priority): string {
  const threatTitles: Record<NotificationSeverity, string> = {
    'safe': '✅ Safe Communication',
    'low_risk_suspicious': '⚠️ Low Risk Suspicious',
    'suspicious': '⚠️ Suspicious Activity',
    'high_risk_suspicious': '🚨 High Risk Suspicious',
    'bec': '🚨 BEC Attack Detected',
    'ransomware': '🚨 Ransomware Threat',
    'phishing': '🚨 Phishing Attempt',
    'critical': '🚨 Critical Threat'
  };
  
  return threatTitles[threatCategory] || '📊 Notification';
}
