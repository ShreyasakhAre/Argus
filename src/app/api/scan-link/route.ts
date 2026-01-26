import { NextRequest, NextResponse } from 'next/server';
import { scanLink, scanTextForLinks } from '@/lib/link-scanner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, text } = body;

    if (text) {
      const results = scanTextForLinks(text);
      return NextResponse.json({
        urls_found: results.length,
        results,
        has_malicious: results.some(r => r.is_malicious),
        highest_risk: results.length > 0 ? Math.max(...results.map(r => r.risk_score)) : 0
      });
    }

    if (!url) {
      return NextResponse.json(
        { error: 'URL or text is required' },
        { status: 400 }
      );
    }

    const result = scanLink(url);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
