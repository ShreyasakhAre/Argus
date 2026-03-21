export interface Alert {
  id: string;
  _id?: string;
  notification_id?: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  status?: string;
  acknowledged: boolean;
  timestamp: string | Date;
  details?: Record<string, unknown>;
}

export interface AlertsResponse {
  success?: boolean;
  alerts: Alert[];
  total: number;
  unacknowledged: number;
}
