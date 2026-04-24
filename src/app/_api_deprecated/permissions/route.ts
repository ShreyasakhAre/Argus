import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/types';

// In-memory mock permissions store — matches ROLES from @/lib/types
const mockPermissions: Record<string, string[]> = {
  admin: [
    'view_all_notifications', 'view_department_notifications', 'view_personal_notifications',
    'view_fraud_feed', 'acknowledge_alerts', 'access_scanners',
    'view_analytics', 'export_reports', 'view_audit_logs',
    'retrain_model', 'manage_roles_permissions',
  ],
  fraud_analyst: [
    'view_all_notifications', 'view_department_notifications', 'view_personal_notifications',
    'view_fraud_feed', 'acknowledge_alerts', 'access_scanners',
    'view_analytics', 'export_reports',
  ],
  department_head: [
    'view_department_notifications', 'view_personal_notifications',
    'view_fraud_feed', 'acknowledge_alerts',
    'view_analytics', 'export_reports',
  ],
  employee: [
    'view_personal_notifications',
    'access_scanners',
  ],
  auditor: [
    'view_all_notifications', 'view_department_notifications', 'view_personal_notifications',
    'view_fraud_feed', 'view_analytics', 'export_reports', 'view_audit_logs',
  ],
};

/**
 * Verify user is admin - backend enforcement
 */
function verifyAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

/**
 * GET /api/permissions
 * Returns all role permissions
 * Only admin can access
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const userStr = Buffer.from(token, 'base64').toString('utf-8');
    let user: User;
    try {
      user = JSON.parse(userStr);
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (!verifyAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can view permissions' },
        { status: 403 }
      );
    }

    // MongoDB disabled — return mock permissions
    const permissions = Object.entries(mockPermissions).map(([role, perms]) => ({
      role,
      permissions: perms,
    }));

    return NextResponse.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('GET /api/permissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/permissions
 * Update role permissions
 * Only admin can access
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const userStr = Buffer.from(token, 'base64').toString('utf-8');
    let user: User;
    try {
      user = JSON.parse(userStr);
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (!verifyAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can modify permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role, permissions } = body;

    if (!role || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Invalid request: role and permissions array required' },
        { status: 400 }
      );
    }

    // MongoDB disabled — update in-memory store
    mockPermissions[role] = permissions;

    const updated = { role, permissions };

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Permissions updated for ${role}`,
    });
  } catch (error) {
    console.error('POST /api/permissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
