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
