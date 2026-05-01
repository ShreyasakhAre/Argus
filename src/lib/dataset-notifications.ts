import type { HeatmapData, Notification, SourceApp, Stats } from '@/lib/ml-service';

export type AlertSeverity = 'low' | 'medium' | 'high';

let cachedNotifications: Notification[] | null = null;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

export function getFallbackStats(): Stats {
  return {
    total_notifications: 0,
    flagged_notifications: 0,
    benign_notifications: 0,
    model_metrics: {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1_score: 0,
      total_samples: 0,
      malicious_samples: 0,
      benign_samples: 0,
    },
    department_stats: {},
    feature_importance: {},
  };
}

export async function loadDatasetNotifications(): Promise<Notification[]> {
  // Return cached data if available
  if (cachedNotifications) {
    return cachedNotifications;
  }

  try {
    const response = await fetch('/api/notifications');
    if (!response.ok) {
      console.error('Failed to fetch notifications:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    cachedNotifications = data.notifications || [];
    return cachedNotifications;
  } catch (error) {
    console.error('Error loading notifications:', error);
    return [];
  }
}

export function toSourceApp(source: string): SourceApp {
  const normalized = source.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  switch (normalized) {
    case 'email':
    case 'gmail':
    case 'outlook':
      return { name: source, icon: '📧', type: 'Email', color: 'bg-blue-500' };
    case 'teams':
    case 'slack':
    case 'discord':
      return { name: source, icon: '💬', type: 'Chat', color: 'bg-purple-500' };
    case 'onedrive':
    case 'dropbox':
    case 'googledrive':
      return { name: source, icon: '📁', type: 'Cloud', color: 'bg-green-500' };
    case 'vpn':
    case 'remote':
      return { name: source, icon: '🌐', type: 'Network', color: 'bg-orange-500' };
    default:
      return { name: source, icon: '📄', type: 'Other', color: 'bg-gray-500' };
  }
}

export function toSeverity(riskScore: number): AlertSeverity {
  if (riskScore >= 0.7) return 'high';
  if (riskScore >= 0.4) return 'medium';
  return 'low';
}

export function toRiskLevel(riskScore: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (riskScore >= 0.8) return 'Critical';
  if (riskScore >= 0.6) return 'High';
  if (riskScore >= 0.3) return 'Medium';
  return 'Low';
}

export async function getDatasetStats(orgId?: string): Promise<Stats> {
  const notifications = await loadDatasetNotifications();

  if (notifications.length === 0) return getFallbackStats();

  const department_stats: Stats['department_stats'] = {};
  let flagged = 0;

  for (const notification of notifications) {
    if (notification.is_flagged) flagged++;

    department_stats[notification.department] ??= { total: 0, flagged: 0, avg_risk: 0 };
    department_stats[notification.department].total++;
    if (notification.is_flagged) department_stats[notification.department].flagged++;
    department_stats[notification.department].avg_risk += notification.risk_score;
  }

  const benign = notifications.length - flagged;
  
  // Calculate real ML metrics based on dataset
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  
  for (const notification of notifications) {
    const isActuallyMalicious = notification.is_malicious === 1;
    const isPredictedMalicious = notification.is_flagged;
    
    if (isActuallyMalicious && isPredictedMalicious) {
      truePositives++;
    } else if (!isActuallyMalicious && !isPredictedMalicious) {
      trueNegatives++;
    } else if (!isActuallyMalicious && isPredictedMalicious) {
      falsePositives++;
    } else if (isActuallyMalicious && !isPredictedMalicious) {
      falseNegatives++;
    }
  }
  
  const accuracy = (truePositives + trueNegatives) / notifications.length;
  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  const f1_score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  return {
    total_notifications: notifications.length,
    flagged_notifications: flagged,
    benign_notifications: benign,
    department_stats,
    model_metrics: {
      accuracy: isNaN(accuracy) ? 0 : accuracy,
      precision: isNaN(precision) ? 0 : precision,
      recall: isNaN(recall) ? 0 : recall,
      f1_score: isNaN(f1_score) ? 0 : f1_score,
      total_samples: notifications.length,
      malicious_samples: flagged,
      benign_samples: benign,
    },
    feature_importance: {
      sender_domain: 0.25,
      risk_score: 0.22,
      attachment_type: 0.16,
      contains_url: 0.15,
      priority: 0.12,
      channel: 0.1,
    },
  };
}

export async function getDatasetHeatmap(orgId?: string): Promise<HeatmapData> {
  const notifications = await loadDatasetNotifications();
  const heatmap: HeatmapData = {};

  for (const notif of notifications) {
    if (orgId && notif.org_id !== orgId) continue;
    
    if (!heatmap[notif.department]) {
      heatmap[notif.department] = {
        total: 0,
        flagged: 0,
        high_risk: 0,
        medium_risk: 0,
        low_risk: 0,
        avg_risk_score: 0,
        flagged_percentage: 0
      };
    }
    
    const dept = heatmap[notif.department];
    dept.total++;
    
    if (notif.is_flagged) {
      dept.flagged++;
    }
    
    if (notif.risk_level === 'High') {
      dept.high_risk++;
    } else if (notif.risk_level === 'Medium') {
      dept.medium_risk++;
    } else {
      dept.low_risk++;
    }
    
    dept.avg_risk_score = ((dept.avg_risk_score * (dept.total - 1)) + notif.risk_score) / dept.total;
    dept.flagged_percentage = (dept.flagged / dept.total) * 100;
  }
  
  return heatmap;
}

export function toDatasetAlert(notification: Notification): any {
  return {
    id: notification.notification_id,
    x: new Date(notification.timestamp).getHours(),
    y: Math.round(notification.risk_score * 100),
    severity: toSeverity(notification.risk_score),
    timestamp: notification.timestamp,
    department: notification.department,
    channel: notification.channel,
    source: notification.source_app,
    message: notification.content.substring(0, 100) + '...',
    risk_score: notification.risk_score,
    is_flagged: notification.is_flagged,
  };
}
