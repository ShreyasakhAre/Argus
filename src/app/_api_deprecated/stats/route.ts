import { NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';
import { safeFetch, backendCircuitBreaker } from '@/lib/backend-health';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Track fallback state to prevent spam logs
let fallbackLogged = false;
let fallbackLogTime = 0;

export async function GET() {
  const start = performance.now();
  try {
    const mlResponse = await safeFetch(`${ML_SERVICE_URL}/stats`);
    const data = await mlResponse.json();
    const duration = performance.now() - start;
    console.log(`[Success] /api/stats (live) took ${duration.toFixed(2)}ms`);
    
    // Reset fallback log on success
    fallbackLogged = false;
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const now = Date.now();
    const circuitState = backendCircuitBreaker.getState();
    
    // Only log fallback once per minute to prevent spam
    if (!fallbackLogged || (now - fallbackLogTime) > 60000) {
      console.warn(`[Stats] Backend unavailable - using fallback mode. Circuit: ${circuitState.isOpen ? 'OPEN' : 'CLOSED'}`);
      fallbackLogged = true;
      fallbackLogTime = now;
    }
    
    // ── FALLBACK: serve mock data so dashboards never crash ──
    const mock = mockData.getStats();
    // Annotate with risk-level counts expected by admin-dashboard
    const allNotifs = mock.total_notifications;
    const flagged = mock.flagged_notifications;
    const fallback = {
      ...mock,
      high_risk: mock.model_metrics.malicious_samples ?? Math.round(flagged * 0.6),
      medium_risk: Math.round(flagged * 0.3),
      low_risk: allNotifs - flagged,
      flagged_percentage: allNotifs > 0
        ? parseFloat(((flagged / allNotifs) * 100).toFixed(2))
        : 0,
      _fallback: true,
      _timestamp: now
    };
    return NextResponse.json(fallback, { status: 200 });
  }
}
