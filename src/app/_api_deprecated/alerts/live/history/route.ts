import { NextRequest, NextResponse } from 'next/server';
import { safeFetch, backendCircuitBreaker } from '@/lib/backend-health';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Track fallback state to prevent spam logs
let fallbackLogged = false;
let fallbackLogTime = 0;

export async function GET(req: NextRequest) {
  const start = performance.now();
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Try to get recent notifications from FastAPI backend
    const mlResponse = await safeFetch(`${ML_SERVICE_URL}/notifications?limit=${limit}&skip=${skip}&flagged_only=true`);
    const data = await mlResponse.json();
    const duration = performance.now() - start;
    console.log(`[Success] /api/alerts/live/history took ${duration.toFixed(2)}ms`);
    
    // Reset fallback log on success
    fallbackLogged = false;
    
    // Transform notifications to alert format
    const alerts = (data.notifications || []).map((notif: any) => ({
      id: notif.notification_id,
      title: `Suspicious Activity Detected`,
      description: notif.content?.substring(0, 100) + '...' || 'Suspicious notification content',
      severity: notif.risk_level?.toLowerCase() || 'medium',
      status: notif.is_flagged ? 'active' : 'resolved',
      timestamp: notif.timestamp || new Date().toISOString(),
      source: notif.source_app || 'Unknown',
      department: notif.department || 'Unknown',
      riskScore: notif.risk_score || 0.5,
      acknowledged: false
    }));

    return NextResponse.json({
      success: true,
      data: alerts,
      total: data.total || alerts.length,
      pagination: {
        skip,
        limit,
        total: data.total || alerts.length,
        hasMore: skip + alerts.length < (data.total || alerts.length)
      }
    });
  } catch (error) {
    const now = Date.now();
    const circuitState = backendCircuitBreaker.getState();
    
    // Only log fallback once per minute to prevent spam
    if (!fallbackLogged || (now - fallbackLogTime) > 60000) {
      console.warn(`[Live History] Backend unavailable - using fallback mode. Circuit: ${circuitState.isOpen ? 'OPEN' : 'CLOSED'}`);
      fallbackLogged = true;
      fallbackLogTime = now;
    }
    
    // Fallback mock data
    const mockAlerts = [
      {
        id: 'alert_001',
        title: 'Suspicious Login Attempt',
        description: 'Multiple failed login attempts detected from unusual location',
        severity: 'high',
        status: 'active',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        source: 'Authentication System',
        department: 'IT Security',
        riskScore: 0.89,
        acknowledged: false
      },
      {
        id: 'alert_002',
        title: 'Unusual Data Access Pattern',
        description: 'User accessing unusually large amounts of sensitive data',
        severity: 'medium',
        status: 'active',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        source: 'Database Monitor',
        department: 'Finance',
        riskScore: 0.67,
        acknowledged: false
      },
      {
        id: 'alert_003',
        title: 'Phishing Email Detected',
        description: 'Email with suspicious links and attachments blocked',
        severity: 'high',
        status: 'resolved',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        source: 'Email Security',
        department: 'HR',
        riskScore: 0.92,
        acknowledged: true
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockAlerts,
      total: mockAlerts.length,
      pagination: {
        skip: 0,
        limit: 20,
        total: mockAlerts.length,
        hasMore: false
      },
      _fallback: true,
      _timestamp: now
    });
  }
}
