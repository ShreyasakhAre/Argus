import { NextRequest, NextResponse } from 'next/server';
import { createScanNotification, Notification } from '@/lib/notifications';

// In-memory store (replace with MongoDB in production)
let notificationsStore: Notification[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, notification_id } = body;

    if (action === 'create') {
      const { url, risk_level, risk_score, explanation } = body;
      const notification = createScanNotification(url, risk_level, risk_score, explanation);
      notificationsStore.unshift(notification); // Newest first

      // Keep only last 500 notifications
      if (notificationsStore.length > 500) {
        notificationsStore = notificationsStore.slice(0, 500);
      }

      return NextResponse.json(notification);
    }

    if (action === 'mark_read') {
      const notification = notificationsStore.find(n => n.id === notification_id);
      if (notification) {
        notification.read = true;
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'get_all') {
      const { unread_only } = body;
      const filtered = unread_only 
        ? notificationsStore.filter(n => !n.read)
        : notificationsStore;
      
      return NextResponse.json({
        notifications: filtered,
        total: notificationsStore.length,
        unread_count: notificationsStore.filter(n => !n.read).length
      });
    }

    if (action === 'get_critical') {
      const critical = notificationsStore.filter(
        n => n.severity === 'critical' && !n.read
      );
      return NextResponse.json({
        critical_alerts: critical,
        count: critical.length
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process notification' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'all';

    if (format === 'critical') {
      const critical = notificationsStore.filter(n => n.severity === 'critical');
      return NextResponse.json({
        critical_alerts: critical,
        count: critical.length
      });
    }

    if (format === 'unread') {
      const unread = notificationsStore.filter(n => !n.read);
      return NextResponse.json({
        unread_notifications: unread,
        count: unread.length
      });
    }

    if (format === 'stats') {
      return NextResponse.json({
        total: notificationsStore.length,
        unread: notificationsStore.filter(n => !n.read).length,
        critical: notificationsStore.filter(n => n.severity === 'critical').length,
        high: notificationsStore.filter(n => n.severity === 'high').length,
        medium: notificationsStore.filter(n => n.severity === 'medium').length,
        safe: notificationsStore.filter(n => n.severity === 'safe').length
      });
    }

    // Default: return all
    return NextResponse.json({
      notifications: notificationsStore,
      total: notificationsStore.length,
      unread_count: notificationsStore.filter(n => !n.read).length
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve notifications' },
      { status: 500 }
    );
  }
}
