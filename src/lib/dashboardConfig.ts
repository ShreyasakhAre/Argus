/**
 * DASHBOARD CONFIGURATION BY ROLE
 * Defines what dashboards and features each role can access
 */

import { Role, PermissionType } from "./types";

export interface DashboardFeature {
  id: string;
  label: string;
  permission: PermissionType;
  description: string;
  category: string;
}

export interface RoleDashboard {
  role: Role;
  title: string;
  description: string;
  features: DashboardFeature[];
  color: string; // Tailwind color for role identification
}

// ============================================
// ALL AVAILABLE DASHBOARD FEATURES
// ============================================
export const ALL_DASHBOARD_FEATURES: Record<string, DashboardFeature> = {
  // NOTIFICATION FEATURES
  view_all_notifications: {
    id: 'view_all_notifications',
    label: 'View All Notifications',
    permission: 'view_all_notifications',
    description: 'Access all organization-wide notifications and alerts',
    category: 'Notifications',
  },
  view_department_notifications: {
    id: 'view_department_notifications',
    label: 'View Department Notifications',
    permission: 'view_department_notifications',
    description: 'Access notifications specific to your department',
    category: 'Notifications',
  },
  view_personal_notifications: {
    id: 'view_personal_notifications',
    label: 'View Personal Notifications',
    permission: 'view_personal_notifications',
    description: 'Access your personal security notifications',
    category: 'Notifications',
  },

  // INVESTIGATION FEATURES
  view_fraud_feed: {
    id: 'view_fraud_feed',
    label: 'View Fraud Feed',
    permission: 'view_fraud_feed',
    description: 'Access the fraud investigation feed with detected threats',
    category: 'Investigation',
  },
  acknowledge_alerts: {
    id: 'acknowledge_alerts',
    label: 'Acknowledge Alerts',
    permission: 'acknowledge_alerts',
    description: 'Mark alerts as reviewed and acknowledged',
    category: 'Investigation',
  },
  access_scanners: {
    id: 'access_scanners',
    label: 'Access Scanners',
    permission: 'access_scanners',
    description: 'Scan links and QR codes for malicious content',
    category: 'Investigation',
  },

  // ANALYTICS & REPORTING
  view_analytics: {
    id: 'view_analytics',
    label: 'View Analytics',
    permission: 'view_analytics',
    description: 'View fraud trends, statistics, and threat patterns',
    category: 'Analytics',
  },
  export_reports: {
    id: 'export_reports',
    label: 'Export Reports',
    permission: 'export_reports',
    description: 'Generate and export investigation reports',
    category: 'Analytics',
  },

  // COMPLIANCE & AUDIT
  view_audit_logs: {
    id: 'view_audit_logs',
    label: 'View Audit Logs',
    permission: 'view_audit_logs',
    description: 'Access system audit logs for compliance purposes',
    category: 'Compliance',
  },

  // SYSTEM ADMINISTRATION
  retrain_model: {
    id: 'retrain_model',
    label: 'Retrain Model',
    permission: 'retrain_model',
    description: 'Retrain the ML fraud detection model',
    category: 'System',
  },
  manage_roles_permissions: {
    id: 'manage_roles_permissions',
    label: 'Manage Roles & Permissions',
    permission: 'manage_roles_permissions',
    description: 'Create, edit, and delete user roles and permissions',
    category: 'System',
  },
};

// ============================================
// ROLE-SPECIFIC DASHBOARD CONFIGURATIONS
// ============================================

export const ROLE_DASHBOARDS: Record<Role, RoleDashboard> = {
  // 🔴 ADMIN - Full system access
  admin: {
    role: 'admin',
    title: 'Administrator Dashboard',
    description: 'Full system access with all management capabilities',
    color: 'red',
    features: [
      // Notifications Section
      ALL_DASHBOARD_FEATURES.view_all_notifications,
      ALL_DASHBOARD_FEATURES.view_department_notifications,
      ALL_DASHBOARD_FEATURES.view_personal_notifications,

      // Investigation Section
      ALL_DASHBOARD_FEATURES.view_fraud_feed,
      ALL_DASHBOARD_FEATURES.acknowledge_alerts,
      ALL_DASHBOARD_FEATURES.access_scanners,

      // Analytics Section
      ALL_DASHBOARD_FEATURES.view_analytics,
      ALL_DASHBOARD_FEATURES.export_reports,

      // Compliance Section
      ALL_DASHBOARD_FEATURES.view_audit_logs,

      // System Administration
      ALL_DASHBOARD_FEATURES.retrain_model,
      ALL_DASHBOARD_FEATURES.manage_roles_permissions,
    ],
  },

  // 🟦 FRAUD ANALYST - Core investigation role
  fraud_analyst: {
    role: 'fraud_analyst',
    title: 'Fraud Analyst Dashboard',
    description: 'Investigation and fraud detection tools with analytics',
    color: 'blue',
    features: [
      // Notifications Section
      ALL_DASHBOARD_FEATURES.view_all_notifications,

      // Investigation Section (Primary capabilities)
      ALL_DASHBOARD_FEATURES.view_fraud_feed,
      ALL_DASHBOARD_FEATURES.acknowledge_alerts,
      ALL_DASHBOARD_FEATURES.access_scanners,

      // Analytics Section
      ALL_DASHBOARD_FEATURES.view_analytics,
      ALL_DASHBOARD_FEATURES.export_reports,

      // ❌ RESTRICTED - Cannot access:
      // - view_department_notifications (see all instead)
      // - view_personal_notifications (not needed for analyst role)
      // - view_audit_logs (compliance separation)
      // - retrain_model (model training separation)
      // - manage_roles_permissions (admin separation)
    ],
  },

  // 🟩 DEPARTMENT HEAD - Managerial visibility
  department_head: {
    role: 'department_head',
    title: 'Department Head Dashboard',
    description: 'Department-level visibility and reporting',
    color: 'green',
    features: [
      // Notifications Section (Department-specific only)
      ALL_DASHBOARD_FEATURES.view_department_notifications,

      // Investigation Section (Limited - acknowledge only)
      ALL_DASHBOARD_FEATURES.view_fraud_feed,
      ALL_DASHBOARD_FEATURES.acknowledge_alerts,

      // Analytics Section
      ALL_DASHBOARD_FEATURES.view_analytics,
      ALL_DASHBOARD_FEATURES.export_reports,

      // ❌ RESTRICTED - Cannot access:
      // - view_all_notifications (dept-specific only)
      // - view_personal_notifications (not needed)
      // - access_scanners (no direct investigation)
      // - view_audit_logs (no audit access)
      // - retrain_model (admin only)
      // - manage_roles_permissions (admin only)
    ],
  },

  // 🟨 EMPLOYEE - Least-privilege end user
  employee: {
    role: 'employee',
    title: 'Employee Dashboard',
    description: 'Personal security notifications and alert acknowledgment',
    color: 'yellow',
    features: [
      // Notifications Section (Personal only)
      ALL_DASHBOARD_FEATURES.view_personal_notifications,

      // Investigation Section (Limited - acknowledge only)
      ALL_DASHBOARD_FEATURES.acknowledge_alerts,

      // ❌ RESTRICTED - Cannot access:
      // - view_all_notifications (not authorized)
      // - view_department_notifications (not authorized)
      // - view_fraud_feed (investigator only)
      // - access_scanners (investigator only)
      // - view_analytics (sensitive data)
      // - export_reports (sensitive data)
      // - view_audit_logs (compliance only)
      // - retrain_model (admin only)
      // - manage_roles_permissions (admin only)
    ],
  },

  // 🟪 AUDITOR - Compliance and read-only access
  auditor: {
    role: 'auditor',
    title: 'Auditor Dashboard',
    description: 'Compliance monitoring and audit trail access (Read-only)',
    color: 'purple',
    features: [
      // Notifications Section (All for audit trail)
      ALL_DASHBOARD_FEATURES.view_all_notifications,
      ALL_DASHBOARD_FEATURES.view_department_notifications,

      // Analytics Section (Metrics only)
      ALL_DASHBOARD_FEATURES.view_analytics,

      // Compliance Section (Primary capability)
      ALL_DASHBOARD_FEATURES.view_audit_logs,

      // ❌ RESTRICTED - Cannot access:
      // - view_personal_notifications (audit trail only)
      // - view_fraud_feed (investigation only)
      // - acknowledge_alerts (action-based)
      // - access_scanners (investigation only)
      // - export_reports (data export restricted)
      // - retrain_model (admin only)
      // - manage_roles_permissions (admin only)
    ],
  },
};

// ============================================
// DASHBOARD CATEGORIES
// ============================================

export const DASHBOARD_CATEGORIES = {
  Notifications: {
    label: 'Notifications & Alerts',
    icon: 'bell',
    description: 'View notifications based on role permissions',
  },
  Investigation: {
    label: 'Investigation & Scanning',
    icon: 'search',
    description: 'Tools for fraud investigation and threat scanning',
  },
  Analytics: {
    label: 'Analytics & Reporting',
    icon: 'chart-bar',
    description: 'View trends, patterns, and generate reports',
  },
  Compliance: {
    label: 'Compliance & Audit',
    icon: 'shield-check',
    description: 'Audit logs and compliance monitoring',
  },
  System: {
    label: 'System Administration',
    icon: 'cog',
    description: 'System configuration and model management',
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all features available to a specific role
 */
export function getRoleFeaturesById(role: Role): DashboardFeature[] {
  return ROLE_DASHBOARDS[role]?.features || [];
}

/**
 * Get all permission IDs available to a role
 */
export function getRolePermissionIds(role: Role): PermissionType[] {
  return getRoleFeaturesById(role).map(f => f.permission);
}

/**
 * Get features grouped by category for a role
 */
export function getRoleFeaturesGrouped(role: Role): Record<string, DashboardFeature[]> {
  const features = getRoleFeaturesById(role);
  const grouped: Record<string, DashboardFeature[]> = {};

  features.forEach(feature => {
    if (!grouped[feature.category]) {
      grouped[feature.category] = [];
    }
    grouped[feature.category].push(feature);
  });

  return grouped;
}

/**
 * Check if a role can access a specific dashboard feature
 */
export function canRoleAccessFeature(role: Role, featureId: string): boolean {
  const features = getRoleFeaturesById(role);
  return features.some(f => f.id === featureId);
}

/**
 * Get role summary for documentation
 */
export function getRoleSummary(role: Role): string {
  const dashboard = ROLE_DASHBOARDS[role];
  return `${dashboard.title}: ${dashboard.description}`;
}
