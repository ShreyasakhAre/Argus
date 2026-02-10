import { useAuth } from '@/components/auth-provider';
import { PermissionType } from '@/lib/types';
import {
  hasPermission,
  canViewAllNotifications,
  canViewDepartmentNotifications,
  canViewPersonalNotifications,
  canViewFraudFeed,
  canAcknowledgeAlerts,
  canAccessScanners,
  canViewAnalytics,
  canExportReports,
  canViewAuditLogs,
  canRetrainModel,
  canManageRolesPermissions,
  isAdmin,
  getNotificationScope,
} from '@/lib/permissions';

/**
 * usePermissions Hook
 * Provides permission checking utilities for components
 */
export function usePermissions() {
  const { user } = useAuth();

  return {
    // Auth state
    user,
    isAuthenticated: !!user,

    // Role check
    isAdmin: isAdmin(user),

    // General permission checks
    hasPermission: (permission: PermissionType) => hasPermission(user?.role || 'employee', permission),

    // Specific permission checks
    canViewAllNotifications: canViewAllNotifications(user),
    canViewDepartmentNotifications: canViewDepartmentNotifications(user),
    canViewPersonalNotifications: canViewPersonalNotifications(user),
    canViewFraudFeed: canViewFraudFeed(user),
    canAcknowledgeAlerts: canAcknowledgeAlerts(user),
    canAccessScanners: canAccessScanners(user),
    canViewAnalytics: canViewAnalytics(user),
    canExportReports: canExportReports(user),
    canViewAuditLogs: canViewAuditLogs(user),
    canRetrainModel: canRetrainModel(user),
    canManageRolesPermissions: canManageRolesPermissions(user),

    // Helper functions
    getNotificationScope: getNotificationScope(user),
  };
}

/**
 * Hook to restrict component rendering to specific roles
 */
export function useCanAccess(permission: PermissionType): boolean {
  const { hasPermission: check } = usePermissions();
  return check(permission);
}
