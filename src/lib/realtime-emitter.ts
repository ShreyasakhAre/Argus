import { initSocketConnection } from './socket';

interface RealtimeNotification {
  id: string;
  message: string;
  source: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  sender?: string;
  department?: string;
}

let emitInterval: NodeJS.Timeout | null = null;
let notificationIndex = 0;
let cachedNotifications: RealtimeNotification[] = [];

/** Load real alerts from the API (called once, then cached) */
async function loadRealNotifications(): Promise<RealtimeNotification[]> {
  if (cachedNotifications.length > 0) return cachedNotifications;

  try {
    const res = await fetch('/api/notifications?limit=300&flagged_only=true');
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { /* ignore parse errors */ }

    const raw: any[] = data.notifications || [];

    const mapped: RealtimeNotification[] = raw
      .filter((n: any) => n.message && n.message.length > 0)
      .map((n: any) => ({
        id: n.id || n.notification_id || `rt-${Math.random()}`,
        message: n.message || n.content || '',
        source: n.source || n.source_app || n.channel || 'System',
        severity: (n.severity as 'low' | 'medium' | 'high') || 'medium',
        timestamp: n.timestamp || new Date().toISOString(),
        sender: n.sender || '',
        department: n.department || '',
      }));

    cachedNotifications = mapped;
    return cachedNotifications;
  } catch (err) {
    console.error('[realtime-emitter] Failed to load from API:', err);
    return [];
  }
}

/** Fallback alerts removed - only real alerts allowed */

export async function startRealtimeEmissions(intervalMs: number = 7000) {
  // Pre-load real notifications
  const notifications = await loadRealNotifications();

  const socket = initSocketConnection();

  // Clear any existing interval
  if (emitInterval) {
    clearInterval(emitInterval);
  }

  emitInterval = setInterval(() => {
    if (notifications.length === 0) return;

    const notification = notifications[notificationIndex % notifications.length];
    notificationIndex++;

    if (!notification || !notification.message) return;

    console.log('[realtime-emitter] Emitting:', notification.id, '-', notification.source);

    const eventPayload = {
      type: 'new',
      notification: {
        _id: notification.id,
        title: `${notification.source} Alert`,
        message: notification.message,
        source: notification.source,
        severity: notification.severity,
        timestamp: new Date().toISOString(), // Fresh timestamp for "just now"
        read: false,
      },
      severity: notification.severity,
    };

    // Emit via Socket.IO (server-side subscribers)
    socket.emit('new_alert', eventPayload);

    // Emit browser custom event (picked up by toast + notifications feed)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('new_alert', { detail: eventPayload }));
    }
  }, intervalMs);

  console.log('[realtime-emitter] Started with', notifications.length, 'real alerts, interval:', intervalMs, 'ms');
}

export function stopRealtimeEmissions() {
  if (emitInterval) {
    clearInterval(emitInterval);
    emitInterval = null;
    console.log('[realtime-emitter] Stopped');
  }
}
