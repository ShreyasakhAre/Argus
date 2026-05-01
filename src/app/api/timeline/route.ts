import { NextRequest, NextResponse } from 'next/server';
import { loadDatasetNotifications } from '@/lib/dataset-notifications';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const notification_id = searchParams.get('notification_id') || undefined;
  
  const notifications = loadDatasetNotifications();
  
  // Generate timeline events from real dataset
  const timelineEvents = notifications.slice(0, 50).map((notif, index) => ({
    id: `E${String(index + 1).padStart(3, '0')}`,
    notification_id: notif.notification_id,
    event_type: notif.is_flagged ? 'detected' : 'processed',
    timestamp: notif.timestamp,
    details: notif.is_flagged 
      ? `${notif.threat_category} threat detected from ${notif.sender}`
      : `Safe communication processed from ${notif.sender}`
  }));

  return NextResponse.json(timelineEvents);
}
