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
  | 'manage_roles_permissions';

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
];

// ============================================
// NOTIFICATION TYPES
// ============================================
export type NotificationSeverity = 'safe' | 'medium' | 'high' | 'critical';
export type NotificationCategory = 'fraud' | 'compliance' | 'system' | 'threat' | 'scan';

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
