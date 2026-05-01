import { NextRequest, NextResponse } from 'next/server';
import { loadDatasetNotifications, toDatasetAlert } from '@/lib/dataset-notifications';

let streamCounter = 0;

/**
 * GET /api/notifications/stream
 * Returns the next dataset-backed notification for real-time streaming.
 */
export async function GET(_request: NextRequest) {
  const notifications = loadDatasetNotifications().filter((notification) => notification.is_flagged);

  if (notifications.length === 0) {
    return NextResponse.json({ notifications: [] });
  }

  const source = notifications[streamCounter % notifications.length];
  streamCounter++;

  const alert = {
    ...toDatasetAlert(source),
    _id: source.notification_id,
    title: source.threat_category,
    notification: source,
    read: false,
    category: source.source_app,
  };

  return NextResponse.json({
    notifications: [alert],
  });
}
