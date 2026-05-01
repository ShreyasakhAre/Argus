import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message_text = body?.message_text || '';

    // Proxy to existing analyze endpoint which integrates the ML backend
    const res = await fetch(new URL('/api/notifications/analyze', request.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_text })
    });

    if (!res.ok) {
      return NextResponse.json({ risk_score: 0, label: 'unknown', confidence: 0, explanations: [] }, { status: 200 });
    }

    const data = await res.json();

    // Normalize response to required format
    const risk_score = typeof data.risk_score === 'number' ? data.risk_score : (typeof data.risk_score === 'string' ? Number(data.risk_score) : 0);
    const label = data.label || 'unknown';
    const confidence = typeof data.confidence === 'number' ? data.confidence : (typeof data.confidence === 'string' ? Number(data.confidence) : 0);
    const explanations = Array.isArray(data.explanations) ? data.explanations : (data.explanations ? [String(data.explanations)] : []);

    return NextResponse.json({ risk_score: Number.isFinite(risk_score) ? Math.max(0, Math.min(1, risk_score)) : 0, label, confidence: Number.isFinite(confidence) ? confidence : 0, explanations });
  } catch (e) {
    console.error('[api/analyze] error', e);
    return NextResponse.json({ risk_score: 0, label: 'unknown', confidence: 0, explanations: [] }, { status: 200 });
  }
}
