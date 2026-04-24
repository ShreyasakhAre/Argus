import type { LinkScanResult } from './link-scanner';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function fetchFromML(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`ML Service error: ${response.status}`);
  }
  
  return response.json();
}

export type SourceApp = 'Email' | 'Slack' | 'Microsoft Teams' | 'HR Portal' | 'Finance System' | 'Internal Mobile App';

export interface Notification {
  notification_id: string;
  org_id: string;
  department: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  is_flagged: boolean;
  source_app: SourceApp;
  /** Analyst-normalised field: 'Threat' | 'Safe' | 'open' etc. */
  status?: string;
  /** Bell-read tracking field appended by toBellNotification() */
  read?: boolean;
}

export interface Stats {
  total_notifications: number;
  flagged_notifications: number;
  benign_notifications: number;
  /** Global risk-level breakdown (returned by FastAPI /stats) */
  high_risk?: number;
  medium_risk?: number;
  low_risk?: number;
  flagged_percentage?: number;
  model_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    total_samples: number;
    /** Only present in mock-data path */
    malicious_samples?: number;
    /** Only present in mock-data path */
    benign_samples?: number;
  };
  department_stats: Record<string, {
    total: number;
    flagged: number;
    avg_risk: number;
  }>;
  /** Only present in mock-data path */
  feature_importance?: Record<string, number>;
}

export interface Explanation {
  notification_id: string;
  prediction: {
    notification_id: string;
    risk_score: number;
    risk_level: string;
    is_flagged: boolean;
  };
    explanation: {
      top_features: Array<{
        feature: string;
        impact: number;
        direction: string;
      }>;
      explanation_text: string;
      all_impacts: Array<{
        feature: string;
        impact: number;
        direction: string;
      }>;
      link_scans?: LinkScanResult[];
    };

}

export interface HeatmapData {
  [department: string]: {
    total: number;
    flagged: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
    avg_risk_score: number;
    flagged_percentage: number;
  };
}

export interface Feedback {
  notification_id: string;
  decision: string;
  corrected_label?: number;
  analyst_notes?: string;
  timestamp?: string;
}
