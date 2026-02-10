import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/lib/types';
import { mockData } from '@/lib/mock-data';

/**
 * Helper: Extract user from request
 */
function extractUser(request: NextRequest): User | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');
    const userStr = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * GET /api/notifications
 * Fetch notifications with RBAC filtering
 * Different roles see different notifications
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const org_id = searchParams.get('org_id') || undefined;
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const flagged_only = searchParams.get('flagged_only') === 'true';
    const risk_level = searchParams.get('risk_level') || undefined;
    const department = searchParams.get('department') || undefined;
    const search = searchParams.get('search') || undefined;
    const source_app = searchParams.get('source_app') || undefined;

    // Get mock data with all filter params forwarded
    const { notifications: allNotifications, total: filteredTotal } = mockData.getNotifications({
      org_id,
      department,
      flagged_only: flagged_only || undefined,
      risk_level,
      search,
      source_app,
    });

    const paged = allNotifications.slice(skip, skip + limit);

    // unreadCount = notifications that haven't been marked as read
    const unreadCount = allNotifications.filter((n: any) => !n.read).length;
    const total = filteredTotal;

    return NextResponse.json({
      success: true,
      notifications: paged,
      data: paged,
      unreadCount,
      total,
      pagination: {
        skip,
        limit,
        total,
        hasMore: skip + paged.length < total,
      },
    });
  } catch (error) {
    console.error('❌ GET /api/notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create notification (backend use only, called by alert system)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      orgId,
      departmentId,
      title,
      message,
      severity = 'medium',
      category = 'system',
      roleFilter = null,
      metadata = {},
    } = body;

    // Validate required fields
    if (!userId || !orgId || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

      // MongoDB disabled — return mock created notification
      const notification = {
        _id: `notif_${Date.now()}`,
        userId,
        orgId,
        departmentId,
        title,
        message,
        severity,
        category,
        roleFilter,
        metadata,
        read: false,
      };

      console.log(`Notification created (mock): ${notification._id}`);

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('❌ POST /api/notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
