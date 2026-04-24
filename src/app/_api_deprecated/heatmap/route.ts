import { NextRequest, NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const org_id = request.nextUrl.searchParams.get('org_id') || undefined;
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/heatmap`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!mlResponse.ok) throw new Error('FastAPI Error');
    // FastAPI returns { heatmap: { dept: {...}, ... } }
    // Pass the full object through so callers can read .heatmap
    const data = await mlResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    // Fallback — MockData returns { heatmap: { ... } } already
    console.warn('[Heatmap] FastAPI unavailable — serving mock data');
    return NextResponse.json(mockData.getHeatmap(org_id), { status: 200 });
  }
}
