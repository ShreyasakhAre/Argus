import { NextRequest, NextResponse } from 'next/server';
import { emitAlert } from '@/socket-server';

/**
 * Test endpoint to emit fraud alerts via Socket.IO
 * POST /api/notifications/test
 * 
 * Body:
 * {
 *   "message": "Test alert message",
 *   "severity": "critical" | "high" | "medium" | "low",
 *   "title": "Test Alert"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message = 'Test notification', severity = 'medium', title = 'Test Alert' } = body;

    // Emit through Socket.IO to all connected clients
    const payload = {
      type: 'new',
      notification: {
        _id: `test-${Date.now()}`,
        title,
        message,
        severity,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('📤 Emitting test alert:', payload);
    emitAlert(payload);

    return NextResponse.json(
      { success: true, message: 'Alert emitted', payload },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to emit test alert:', error);
    return NextResponse.json(
      { error: 'Failed to emit alert', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to test connectivity
 */
export async function GET() {
  return NextResponse.json(
    {
      message: 'Notification test endpoint ready',
      usage: 'POST with { message, severity, title }',
      severities: ['critical', 'high', 'medium', 'low'],
    },
    { status: 200 }
  );
}
