/**
 * PERMISSION UTILITIES
 * Reusable functions for permission checks across backend and frontend
 */

import { Role, PermissionType, User } from "./types";
import { DEFAULT_ROLE_PERMISSIONS } from "./models/RolePermission";

// ============================================
// PERMISSION CHECK FUNCTIONS
// ============================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: Role,
  permission: PermissionType,
  rolePermissions?: Record<Role, PermissionType[]>
): boolean {
  const permissions = rolePermissions || DEFAULT_ROLE_PERMISSIONS;
  return permissions[role]?.includes(permission) ?? false;
}

/**
 * Check if user can perform an action
 */
export function canUserPerform(
  user: User | null,
  permission: PermissionType,
  rolePermissions?: Record<Role, PermissionType[]>
): boolean {
  if (!user) return false;
  return hasPermission(user.role, permission, rolePermissions);
}

/**
 * Check if user can view all notifications
 */
export function canViewAllNotifications(user: User | null): boolean {
  return canUserPerform(user, 'view_all_notifications');
}

/**
 * Check if user can view department notifications
 */
export function canViewDepartmentNotifications(user: User | null): boolean {
  return canUserPerform(user, 'view_department_notifications');
}

/**
 * Check if user can view personal notifications
 */
export function canViewPersonalNotifications(user: User | null): boolean {
  return canUserPerform(user, 'view_personal_notifications');
}

/**
 * Check if user can access fraud feed
 */
export function canViewFraudFeed(user: User | null): boolean {
  return canUserPerform(user, 'view_fraud_feed');
}

/**
 * Check if user can acknowledge alerts
 */
export function canAcknowledgeAlerts(user: User | null): boolean {
  return canUserPerform(user, 'acknowledge_alerts');
}

/**
 * Check if user can access scanners
 */
export function canAccessScanners(user: User | null): boolean {
  return canUserPerform(user, 'access_scanners');
}

/**
 * Check if user can view analytics
 */
export function canViewAnalytics(user: User | null): boolean {
  return canUserPerform(user, 'view_analytics');
}

/**
 * Check if user can export reports
 */
export function canExportReports(user: User | null): boolean {
  return canUserPerform(user, 'export_reports');
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(user: User | null): boolean {
  return canUserPerform(user, 'view_audit_logs');
}

/**
 * Check if user can retrain model
 */
export function canRetrainModel(user: User | null): boolean {
  return canUserPerform(user, 'retrain_model');
}

/**
 * Check if user is admin (can manage roles and permissions)
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

/**
 * Check if user can manage roles and permissions
 */
export function canManageRolesPermissions(user: User | null): boolean {
  return canUserPerform(user, 'manage_roles_permissions');
}

// ============================================
// DATA FILTERING BY PERMISSION
// ============================================

/**
 * Filter notifications based on user permissions
 * Backend should use this before returning data
 */
export function filterNotificationsByPermission(
  notifications: any[],
  user: User | null,
  rolePermissions?: Record<Role, PermissionType[]>
) {
  if (!user) return [];

  return notifications.filter((notification) => {
    // Admin can see all
    if (isAdmin(user)) {
      return true;
    }

    // Check role-specific filters
    if (canViewAllNotifications(user)) {
      return true;
    }

    if (canViewDepartmentNotifications(user) && notification.departmentId === user.departmentId) {
      return true;
    }

    if (canViewPersonalNotifications(user) && notification.userId === user.email) {
      return true;
    }

    if (canViewFraudFeed(user) && notification.category === 'fraud') {
      return true;
    }

    if (notification.roleFilter === user.role) {
      return true;
    }

    return false;
  });
}

/**
 * Get notification visibility scope for user
 */
export function getNotificationScope(
  user: User | null
): 'all' | 'department' | 'personal' | 'fraud' | 'none' {
  if (!user) return 'none';

  if (canViewAllNotifications(user)) {
    return 'all';
  }

  if (canViewDepartmentNotifications(user)) {
    return 'department';
  }

  if (canViewFraudFeed(user)) {
    return 'fraud';
  }

  if (canViewPersonalNotifications(user)) {
    return 'personal';
  }

  return 'none';
}

// ============================================
// PERMISSION MANAGEMENT
// ============================================

/**
 * Get all permissions for a role
 */
export function getRolePermissions(
  role: Role,
  rolePermissions?: Record<Role, PermissionType[]>
): PermissionType[] {
  const permissions = rolePermissions || DEFAULT_ROLE_PERMISSIONS;
  return permissions[role] || [];
}

/**
 * Get all permissions for user
 */
export function getUserPermissions(
  user: User | null,
  rolePermissions?: Record<Role, PermissionType[]>
): PermissionType[] {
  if (!user) return [];
  return getRolePermissions(user.role, rolePermissions);
}

/**
 * Check if role has multiple permissions
 */
export function roleHasAllPermissions(
  role: Role,
  requiredPermissions: PermissionType[],
  rolePermissions?: Record<Role, PermissionType[]>
): boolean {
  return requiredPermissions.every((perm) =>
    hasPermission(role, perm, rolePermissions)
  );
}

/**
 * Check if role has any of the permissions
 */
export function roleHasAnyPermission(
  role: Role,
  permissions: PermissionType[],
  rolePermissions?: Record<Role, PermissionType[]>
): boolean {
  return permissions.some((perm) =>
    hasPermission(role, perm, rolePermissions)
  );
}
