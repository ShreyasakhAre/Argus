import { NextResponse } from 'next/server';
import { safeFetch, backendCircuitBreaker } from '@/lib/backend-health';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Track fallback state to prevent spam logs
let fallbackLogged = false;
let fallbackLogTime = 0;

export async function GET() {
  const start = performance.now();
  try {
    // Try to get live stats from FastAPI backend
    const mlResponse = await safeFetch(`${ML_SERVICE_URL}/stats`);
    const data = await mlResponse.json();
    const duration = performance.now() - start;
    console.log(`[Success] /api/alerts/live/stats took ${duration.toFixed(2)}ms`);
    
    // Reset fallback log on success
    fallbackLogged = false;
    
    // Transform data to match expected format
    const liveStats = {
      total: data.total_notifications || 0,
      flagged: data.flagged_notifications || 0,
      high_risk: data.high_risk || 0,
      medium_risk: data.medium_risk || 0,
      low_risk: data.low_risk || 0,
      flagged_percentage: data.flagged_percentage || 0,
      model_metrics: data.model_metrics || {
        accuracy: 0.94,
        precision: 0.91,
        recall: 0.96,
        f1_score: 0.93
      }
    };

    return NextResponse.json({
      success: true,
      data: liveStats
    });
  } catch (error) {
    const now = Date.now();
    const circuitState = backendCircuitBreaker.getState();
    
    // Only log fallback once per minute to prevent spam
    if (!fallbackLogged || (now - fallbackLogTime) > 60000) {
      console.warn(`[Live Stats] Backend unavailable - using fallback mode. Circuit: ${circuitState.isOpen ? 'OPEN' : 'CLOSED'}`);
      fallbackLogged = true;
      fallbackLogTime = now;
    }
    
    // Fallback mock data
    const fallbackStats = {
      total: 10000,
      flagged: 1247,
      high_risk: 318,
      medium_risk: 492,
      low_risk: 437,
      flagged_percentage: 12.47,
      model_metrics: {
        accuracy: 0.94,
        precision: 0.91,
        recall: 0.96,
        f1_score: 0.93
      },
      _fallback: true,
      _timestamp: now
    };

    return NextResponse.json({
      success: true,
      data: fallbackStats
    });
  }
}
