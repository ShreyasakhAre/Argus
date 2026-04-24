/**
 * API MIDDLEWARE - PERMISSION CHECKS
 * Reusable middleware for protecting API endpoints with permission checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { canUserPerform, isAdmin } from '@/lib/permissions';
import { User, PermissionType } from '@/lib/types';
import { logAuditEvent } from '@/lib/audit-logger';

/**
 * Verify user session from request
 */
export async function getUserFromRequest(_request: NextRequest): Promise<User | null> {
  // Demo mode: no real auth session
  return null;
}

/**
 * Create unauthorized response
 */
function unauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json(
    { error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
function forbiddenResponse(
  permission: PermissionType | PermissionType[],
  message?: string
) {
  const perms = Array.isArray(permission)
    ? permission.join(', ')
    : permission;

  return NextResponse.json(
    {
      error: message || `Access denied. Required permission(s): ${perms}`,
      code: 'FORBIDDEN',
      requiredPermissions: Array.isArray(permission) ? permission : [permission],
    },
    { status: 403 }
  );
}

/**
 * Middleware: Require user to be authenticated
 */
export async function requireAuth(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return {
      success: false,
      response: unauthorizedResponse('You must be logged in'),
    };
  }

  return { success: true, user };
}

/**
 * Middleware: Require specific permission
 */
export async function requirePermission(
  request: NextRequest,
  permission: PermissionType | PermissionType[],
  options?: {
    requireAll?: boolean; // true = AND, false = OR (default)
    logFailure?: boolean; // true = log denied access (default: true)
  }
) {
  const { success, response, user } = await requireAuth(request);

  if (!success || !user) {
    return { success: false, response };
  }

  // Check permission(s)
  const permissions = Array.isArray(permission) ? permission : [permission];
  const requireAll = options?.requireAll ?? false;

  const hasAccess = requireAll
    ? permissions.every(p => canUserPerform(user, p))
    : permissions.some(p => canUserPerform(user, p));

  if (!hasAccess) {
    // Log the denied access
    if (options?.logFailure !== false) {
      await logAuditEvent({
        action: 'PERMISSION_DENIED',
        userId: user.email,
        userRole: user.role,
        requiredPermissions: permissions,
        endpoint: request.nextUrl.pathname,
        method: request.method,
        timestamp: new Date(),
      });
    }

    return {
      success: false,
      response: forbiddenResponse(
        permission,
        `You do not have permission to access this resource`
      ),
    };
  }

  return { success: true, user, response: null };
}

/**
 * Middleware: Require admin role
 */
export async function requireAdmin(request: NextRequest) {
  const { success, response, user } = await requireAuth(request);

  if (!success || !user) {
    return { success: false, response };
  }

  if (!isAdmin(user)) {
    await logAuditEvent({
      action: 'ADMIN_ACCESS_DENIED',
      userId: user.email,
      userRole: user.role,
      endpoint: request.nextUrl.pathname,
      method: request.method,
      timestamp: new Date(),
    });

    return {
      success: false,
      response: forbiddenResponse(
        'manage_roles_permissions',
        'Admin access required'
      ),
    };
  }

  return { success: true, user, response: null };
}

/**
 * Middleware: Log successful API access
 */
export async function logApiAccess(
  request: NextRequest,
  user: User | null,
  permission?: PermissionType
) {
  if (!user) return;

  await logAuditEvent({
    action: 'API_ACCESS',
    userId: user.email,
    userRole: user.role,
    permission,
    endpoint: request.nextUrl.pathname,
    method: request.method,
    timestamp: new Date(),
  } as import('@/lib/audit-logger').ApiAuditEvent);
}

/**
 * Middleware: Log API errors
 */
export async function logApiError(
  request: NextRequest,
  user: User | null,
  error: Error,
  statusCode: number = 500
) {
  if (!user) return;

  await logAuditEvent({
    action: 'API_ERROR',
    userId: user.email,
    userRole: user.role,
    endpoint: request.nextUrl.pathname,
    method: request.method,
    error: error.message,
    statusCode,
    timestamp: new Date(),
  });
}

/**
 * Build permission check utility for handler
 */
export async function withPermissionCheck(
  request: NextRequest,
  permission: PermissionType | PermissionType[],
  handler: (user: User, request: NextRequest) => Promise<NextResponse>,
  options?: {
    requireAll?: boolean;
    logFailure?: boolean;
  }
): Promise<NextResponse> {
  try {
    const { success, response, user } = await requirePermission(
      request,
      permission,
      options
    );

    if (!success) {
      return response!;
    }

    // Log successful access
    await logApiAccess(
      request,
      user ?? null,
      Array.isArray(permission) ? permission[0] : permission
    );

    // Call the handler
    return await handler(user!, request);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Permission check error:', errorMessage);

    const user = await getUserFromRequest(request);
    await logApiError(request, user, error as Error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Higher-order function to wrap API routes with permission checks
 */
export function protectedRoute(
  permission: PermissionType | PermissionType[],
  options?: {
    requireAll?: boolean;
    logFailure?: boolean;
  }
) {
  return (
    handler: (user: User, request: NextRequest) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest) => {
      return withPermissionCheck(request, permission, handler, options);
    };
  };
}

/**
 * Higher-order function for admin-only routes
 */
export function adminRoute(
  handler: (user: User, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const { success, response, user } = await requireAdmin(request);

      if (!success) {
        return response!;
      }

      await logApiAccess(request, user ?? null, 'manage_roles_permissions');
      return await handler(user!, request);
    } catch (error) {
      const user = await getUserFromRequest(request);
      await logApiError(request, user, error as Error);

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
