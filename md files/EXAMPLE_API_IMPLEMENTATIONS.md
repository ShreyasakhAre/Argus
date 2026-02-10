/**
 * EXAMPLE API ENDPOINTS WITH PERMISSION CHECKS
 * Shows how to protect endpoints and log access
 */

// ============================================
// EXAMPLE 1: Simple permission check
// ============================================
// File: src/app/api/fraud-feed/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, logApiAccess, logApiError } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  try {
    // Check permission
    const { success, response, user } = await requirePermission(
      request,
      'view_fraud_feed'
    );

    if (!success) {
      return response!;
    }

    // Log successful access
    await logApiAccess(request, user, 'view_fraud_feed');

    // Fetch fraud feed data
    const fraudAlerts = [
      // Your data here
    ];

    return NextResponse.json({
      success: true,
      data: fraudAlerts,
      count: fraudAlerts.length,
    });
  } catch (error) {
    const user = await requirePermission(request, 'view_fraud_feed').then(
      r => r.user
    );
    await logApiError(request, user, error as Error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// EXAMPLE 2: Multiple permissions (OR logic)
// ============================================
// File: src/app/api/analytics/route.ts

import { requirePermission } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  // Require EITHER analytics view OR audit logs view
  const { success, response, user } = await requirePermission(
    request,
    ['view_analytics', 'view_audit_logs'],
    { requireAll: false } // OR logic
  );

  if (!success) {
    return response!;
  }

  // Return analytics based on what user can see
  const analytics = {
    fraud_trends: [...],
    alert_distribution: [...],
  };

  return NextResponse.json(analytics);
}

// ============================================
// EXAMPLE 3: Multiple permissions (AND logic)
// ============================================
// File: src/app/api/scanners/route.ts

export async function POST(request: NextRequest) {
  // Require BOTH scanner access AND ability to acknowledge
  const { success, response, user } = await requirePermission(
    request,
    ['access_scanners', 'acknowledge_alerts'],
    { requireAll: true } // AND logic
  );

  if (!success) {
    return response!;
  }

  // Process scan request
  return NextResponse.json({ success: true });
}

// ============================================
// EXAMPLE 4: Using higher-order function
// ============================================
// File: src/app/api/reports/export/route.ts

import { protectedRoute } from '@/lib/api-middleware';
import { User } from '@/lib/types';

export const POST = protectedRoute('export_reports')(
  async (user: User, request: NextRequest) => {
    // Only reaches here if user has export_reports permission
    const { data } = await request.json();

    return NextResponse.json({
      success: true,
      message: `Report exported by ${user.email}`,
    });
  }
);

// ============================================
// EXAMPLE 5: Admin-only endpoint
// ============================================
// File: src/app/api/roles/route.ts

import { adminRoute } from '@/lib/api-middleware';

export const POST = adminRoute(
  async (user: User, request: NextRequest) => {
    // Only admin can reach here
    const { roleName, permissions } = await request.json();

    return NextResponse.json({
      success: true,
      role: roleName,
      permissions,
      createdBy: user.email,
    });
  }
);

// ============================================
// EXAMPLE 6: Filtered data based on role
// ============================================
// File: src/app/api/notifications/route.ts

import { filterNotificationsByPermission } from '@/lib/permissions';
import { getUserFromRequest } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all notifications
  const allNotifications = [
    // Your notifications from database
  ];

  // Filter based on user's permissions and role
  const filtered = filterNotificationsByPermission(allNotifications, user);

  return NextResponse.json({
    success: true,
    data: filtered,
    count: filtered.length,
  });
}

// ============================================
// EXAMPLE 7: Department-scoped data access
// ============================================
// File: src/app/api/departments/[deptId]/alerts/route.ts

import { requireAuth, logApiAccess } from '@/lib/api-middleware';
import { canViewDepartmentNotifications } from '@/lib/permissions';

export async function GET(request: NextRequest, { params }: any) {
  // Just require authentication
  const { success, response, user } = await requireAuth(request);

  if (!success) {
    return response!;
  }

  const { deptId } = params;

  // Build query based on user's role
  let query: any = {};

  if (user.role === 'admin') {
    // Admins see all
    query = { departmentId: deptId };
  } else if (user.role === 'fraud_analyst') {
    // Analysts see all departments
    query = { departmentId: deptId };
  } else if (user.role === 'department_head') {
    // Managers see only their department
    if (user.departmentId !== deptId) {
      return NextResponse.json(
        { error: 'You can only view your own department' },
        { status: 403 }
      );
    }
    query = { departmentId: deptId };
  } else if (user.role === 'employee') {
    // Employees cannot access this endpoint
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  const alerts = [
    // Fetch with query filter
  ];

  await logApiAccess(request, user, 'view_department_notifications');

  return NextResponse.json(alerts);
}

// ============================================
// EXAMPLE 8: Audit log endpoint (Auditor only)
// ============================================
// File: src/app/api/audit-logs/route.ts

import { requirePermission } from '@/lib/api-middleware';
import { getAuditLogs } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  // Only auditors and admins can view
  const { success, response, user } = await requirePermission(
    request,
    'view_audit_logs'
  );

  if (!success) {
    return response!;
  }

  const logs = await getAuditLogs({
    limit: 100,
  });

  return NextResponse.json({
    success: true,
    data: logs,
    count: logs.length,
  });
}

// ============================================
// EXAMPLE 9: Role management endpoint
// ============================================
// File: src/app/api/admin/roles/route.ts

import { requireAdmin } from '@/lib/api-middleware';
import { logRoleCreated } from '@/lib/audit-logger';

export const POST = async (request: NextRequest) => {
  const { success, response, user } = await requireAdmin(request);

  if (!success) {
    return response!;
  }

  const { roleName, permissions } = await request.json();

  // Create the role...
  const newRole = roleName; // Your role creation logic

  // Log the action
  await logRoleCreated(user.email, user.role, newRole as any, permissions);

  return NextResponse.json({
    success: true,
    role: newRole,
  });
};

// ============================================
// EXAMPLE 10: Model retraining (Admin only)
// ============================================
// File: src/app/api/retrain/route.ts

import { adminRoute } from '@/lib/api-middleware';

export const POST = adminRoute(async (user, request) => {
  // Only admin can retrain model

  // Start retraining job
  const jobId = `retrain-${Date.now()}`;

  return NextResponse.json({
    success: true,
    jobId,
    status: 'started',
    message: `Model retraining started by ${user.email}`,
  });
});
