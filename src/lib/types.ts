/**
 * CORE TYPE DEFINITIONS
 * TypeScript interfaces for entire ARGUS system
 */

// ============================================
// ROLE TYPES
// ============================================
export type Role = 'admin' | 'fraud_analyst' | 'department_head' | 'employee' | 'auditor';

export const ROLES: Role[] = ['admin', 'fraud_analyst', 'department_head', 'employee', 'auditor'];

export const ROLE_NAMES: Record<Role, string> = {
  admin: 'Administrator',
  fraud_analyst: 'Fraud Analyst',
  department_head: 'Department Head',
  employee: 'Employee',
  auditor: 'Auditor',
};

// ============================================
// PERMISSION TYPES
// ============================================
export type PermissionType = 
  | 'view_all_notifications'
  | 'view_department_notifications'
  | 'view_personal_notifications'
  | 'view_fraud_feed'
  | 'acknowledge_alerts'
  | 'access_scanners'
  | 'view_analytics'
  | 'export_reports'
  | 'view_audit_logs'
  | 'retrain_model'
  | 'manage_roles_permissions'
  | 'assign_cases'
  | 'review_cases'
  | 'escalate_cases'
  | 'import_dataset'
  | 'bulk_operations';

export const ALL_PERMISSIONS: PermissionType[] = [
  'view_all_notifications',
  'view_department_notifications',
  'view_personal_notifications',
  'view_fraud_feed',
  'acknowledge_alerts',
  'access_scanners',
  'view_analytics',
  'export_reports',
  'view_audit_logs',
  'retrain_model',
  'manage_roles_permissions',
  'assign_cases',
  'review_cases',
  'escalate_cases',
  'import_dataset',
  'bulk_operations',
];

// ============================================
// NOTIFICATION TYPES (ALIGNED WITH NEW DATASET)
// ============================================
export type NotificationSeverity = 'safe' | 'low_risk_suspicious' | 'suspicious' | 'high_risk_suspicious' | 'bec' | 'ransomware' | 'phishing' | 'critical';
export type NotificationCategory = 'fraud' | 'compliance' | 'system' | 'threat' | 'scan';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Channel = 'Email' | 'Slack' | 'Teams' | 'ERP' | 'HR Portal' | 'Mobile';
export type DeviceType = 'Desktop' | 'Laptop' | 'Mobile' | 'Tablet';
export type ReviewStatus = 'Approved' | 'Pending' | 'Rejected';

// NEW DATASET NOTIFICATION INTERFACE
export interface DatasetNotification {
  notification_id: string;
  org_id: string;
  department: string;
  channel: Channel;
  sender: string;
  receiver: string;
  sender_domain: string;
  content: string;
  contains_url: number; // 0 or 1
  url?: string;
  attachment_type: string;
  priority: Priority;
  threat_category: NotificationSeverity;
  risk_score: number; // 0.0 - 1.0
  timestamp: string; // ISO format
  country: string;
  device_type: DeviceType;
  is_malicious: number; // 0 or 1
  review_status: ReviewStatus;
  analyst_feedback?: string;
}

// LEGACY NOTIFICATION INTERFACE (for backward compatibility during migration)
export interface Notification {
  _id?: string;
  userId: string;
  orgId: string;
  departmentId?: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  read: boolean;
  roleFilter?: Role;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// PERMISSION ROLE MAPPING
// ============================================
export interface RolePermissions {
  _id?: string;
  role: Role;
  permissions: PermissionType[];
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// USER INTERFACE
// ============================================
export interface User {
  email: string;
  role: Role;
  orgId: string;
  name: string;
  departmentId?: string;
  department?: string;
  permissions?: PermissionType[];
}

// ============================================
// SOCKET EVENT PAYLOADS
// ============================================
export interface NotificationEventPayload {
  type: 'new' | 'acknowledged' | 'updated' | 'deleted';
  notification: Notification;
  severity: NotificationSeverity;
  timestamp: Date;
  recipients?: {
    roles?: Role[];
    userIds?: string[];
    departmentIds?: string[];
  };
}

// ============================================
// FRAUD ANALYST REVIEW TYPES
// ============================================
export interface FraudCase {
  case_id: string;
  notification_id: string;
  org_id: string;
  department: string;
  channel: Channel;
  sender: string;
  receiver: string;
  content: string;
  threat_category: NotificationSeverity;
  risk_score: number;
  priority: Priority;
  case_priority: Priority;
  timestamp: string;
  review_status: ReviewStatus;
  analyst_feedback?: string;
  is_malicious: number;
  attachment_type?: string;
  url?: string;
  country?: string;
  device_type?: DeviceType;
}

export interface AnalystAction {
  case_id: string;
  action: 'approve' | 'reject' | 'escalate';
  analyst_id: string;
  feedback?: string;
  timestamp: string;
}

export interface ReviewQueue {
  pending_cases: FraudCase[];
  total_count: number;
  high_priority_count: number;
  critical_count: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// DASHBOARD TYPES
// ============================================
export interface DashboardConfig {
  role: Role;
  title: string;
  tabs: DashboardTab[];
  permissions: PermissionType[];
}

export interface DashboardTab {
  id: string;
  label: string;
  permission: PermissionType;
  component: React.ComponentType<any>;
}

// ============================================
// THREAT INTELLIGENCE TYPES
// ============================================
export interface ThreatPattern {
  id: string;
  type: 'phishing_campaign' | 'bec_attack' | 'malware_distribution' | 'data_exfiltration';
  severity: NotificationSeverity;
  confidence: number;
  indicators: string[];
  affected_entities: string[];
  timeline: {
    start: string;
    end?: string;
  };
  mitigation_strategies: string[];
}

export interface SecurityMetrics {
  total_notifications: number;
  high_risk_count: number;
  critical_threats: number;
  avg_risk_score: number;
  department_scores: Record<string, number>;
  threat_trends: {
    date: string;
    count: number;
    avg_risk: number;
  }[];
}
