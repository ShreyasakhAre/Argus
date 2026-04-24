/**
 * PERMISSION GUARD COMPONENT
 * React component for conditional rendering based on user permissions
 */

'use client';

import { ReactNode } from 'react';
import { PermissionType } from '@/lib/types';
import { canUserPerform } from '@/lib/permissions';
import { useAuth } from '@/components/auth-provider';

interface PermissionGuardProps {
  // Permission(s) required
  permission: PermissionType | PermissionType[];

  // Content to show if user has permission
  children: ReactNode;

  // Fallback content if user doesn't have permission
  fallback?: ReactNode;

  // Require ALL permissions (AND) or ANY (OR)?
  requireAll?: boolean;

  // Log denied access attempts
  logDenied?: boolean;

  // CSS class for wrapper
  className?: string;

  // When to evaluate (default: 'render')
  evalMode?: 'render' | 'mount';
}

/**
 * PermissionGuard - Conditionally render content based on permissions
 * 
 * @example
 * <PermissionGuard permission="access_scanners">
 *   <ScannerTools />
 * </PermissionGuard>
 * 
 * @example
 * <PermissionGuard 
 *   permission={['access_scanners', 'view_analytics']} 
 *   requireAll={false}
 * >
 *   <AdminPanel />
 *   <Fallback>
 *     <p>Access denied</p>
 *   </Fallback>
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  requireAll = false,
  logDenied = true,
  className,
  evalMode = 'render',
}: PermissionGuardProps) {
  const { user, isLoading: loading } = useAuth();

  // Show loading state while fetching user data
  if (loading && evalMode === 'mount') {
    return null;
  }

  // No user (not logged in)
  if (!user) {
    return <>{fallback}</>;
  }

  // Check permission(s)
  const permissions = Array.isArray(permission) ? permission : [permission];

  const hasAccess = requireAll
    ? permissions.every(p => canUserPerform(user, p))
    : permissions.some(p => canUserPerform(user, p));

  // Log denied access
  if (!hasAccess && logDenied) {
    console.warn(`[Permission Denied] User ${user.email} (${user.role}) cannot access:`, 
      permissions.join(', ')
    );
  }

  // Render content or fallback
  const content = hasAccess ? children : fallback;

  if (className) {
    return <div className={className}>{content}</div>;
  }

  return <>{content}</>;
}

/**
 * Alternative: Render as null by default
 */
export function PermissionGuardNull({
  permission,
  children,
  requireAll = false,
}: Omit<PermissionGuardProps, 'fallback'>) {
  return (
    <PermissionGuard
      permission={permission}
      requireAll={requireAll}
      fallback={null}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * Render with warning message
 */
export function PermissionGuardWarning({
  permission,
  children,
  requireAll = false,
  className,
}: Omit<PermissionGuardProps, 'fallback'> & { className?: string }) {
  const perms = Array.isArray(permission)
    ? permission.join(', ')
    : permission;

  return (
    <PermissionGuard
      permission={permission}
      requireAll={requireAll}
      fallback={
        <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ You do not have permission to access this feature.
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Required: {perms}
          </p>
        </div>
      }
      className={className}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * Render with error message
 */
export function PermissionGuardError({
  permission,
  children,
  requireAll = false,
  className,
}: Omit<PermissionGuardProps, 'fallback'> & { className?: string }) {
  const perms = Array.isArray(permission)
    ? permission.join(', ')
    : permission;

  return (
    <PermissionGuard
      permission={permission}
      requireAll={requireAll}
      fallback={
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">
            ❌ Access Denied
          </p>
          <p className="text-xs text-red-700 mt-1">
            This feature requires the following permission(s): {perms}
          </p>
          <p className="text-xs text-red-600 mt-2">
            Contact your administrator if you believe this is a mistake.
          </p>
        </div>
      }
      className={className}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * HOC: Wrap a component with permission guard
 */
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  permission: PermissionType | PermissionType[],
  options?: Omit<PermissionGuardProps, 'permission' | 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <PermissionGuard permission={permission} {...options}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
