import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/lib/types';
import { handleGlobalError } from '@/lib/demo-mode';
import { safeFetch, backendCircuitBreaker } from '@/lib/backend-health';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Track fallback state to prevent spam logs
let fallbackLogged = false;
let fallbackLogTime = 0;

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
 * Fetch notifications from Python ML service
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
    const source_app = searchParams.get('source_app') || undefined;

    const query = new URLSearchParams();
    if (org_id) query.append('org_id', org_id);
    if (department) query.append('department', department);
    if (flagged_only) query.append('flagged_only', 'true');
    // Only fetch exactly what is required
    query.append('skip', skip.toString()); 
    query.append('limit', limit.toString());

    const start = performance.now();
    
    try {
      const mlResponse = await safeFetch(`${ML_SERVICE_URL}/notifications?${query.toString()}`);
      const mlData = await mlResponse.json();
      const duration = performance.now() - start;
      console.log(`[Success] /api/notifications took ${duration.toFixed(2)}ms`);
      
      // Reset fallback log on success
      fallbackLogged = false;
    
      let paged = mlData.notifications || [];

    // Additional Next.js side filtering if FastAPI doesn't natively filter it yet
    if (risk_level) {
        paged = paged.filter((n: any) => n.risk_level === risk_level);
    }
    if (source_app) {
        paged = paged.filter((n: any) => n.source_app === source_app);
    }

    const { total } = mlData;
      // FastAPI notifications don't carry a 'read' field;
      // only count a notification as unread when 'read' is explicitly false.
      const unreadCount = paged.filter((n: any) => n.read === false).length;

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
    const now = Date.now();
    const circuitState = backendCircuitBreaker.getState();
    
    // Only log fallback once per minute to prevent spam
    if (!fallbackLogged || (now - fallbackLogTime) > 60000) {
      console.warn(`[Notifications] Backend unavailable - using fallback mode. Circuit: ${circuitState.isOpen ? 'OPEN' : 'CLOSED'}`);
      fallbackLogged = true;
      fallbackLogTime = now;
    }
    
    // Serve minimal fallback data
    const fallbackData = {
      success: true,
      notifications: [],
      data: [],
      unreadCount: 0,
      total: 0,
      pagination: {
        skip,
        limit,
        total: 0,
        hasMore: false,
      },
      _fallback: true,
      _timestamp: now
    };
    
    return NextResponse.json(fallbackData, { status: 200 });
    }
  } catch (error) {
    console.error('❌ GET /api/notifications error:', handleGlobalError(error, 'notifications/get'));
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create notification
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

    if (!userId || !orgId || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('❌ POST /api/notifications error:', handleGlobalError(error, 'notifications/post'));
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
