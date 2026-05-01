import { NextRequest, NextResponse } from 'next/server';
import { scanLink, scanTextForLinks } from '@/lib/link-scanner';
import { createDatasetRecord } from '@/lib/dataset';
import { createScanNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, text } = body;

    if (text) {
      const results = scanTextForLinks(text);
      
      // Store each result in dataset for ML training
      results.forEach(result => {
        createDatasetRecord({
          url: result.url,
          features: result.features,
          risk_score: result.risk_score,
          risk_level: result.risk_level,
          threat_reasons: result.threat_reasons
        });
      });

      return NextResponse.json({
        urls_found: results.length,
        results,
        has_malicious: results.some(r => r.risk_score >= 70),
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

    // Store result in dataset for ML training pipeline
    createDatasetRecord({
      url: result.url,
      features: result.features,
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      threat_reasons: result.threat_reasons
    });

    // Create notification for all severity levels
    const notification = createScanNotification(
      result.url,
      result.risk_level,
      result.risk_score,
      result.explanation
    );

    // Add notification to store
    const baseUrl = new URL(request.url).origin;
    const notificationResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/notifications/manage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...notification
        })
      }
    ).catch(() => null);

    return NextResponse.json({
      ...result,
      notification: notification
    });
  } catch (error) {
    console.error('Scan link error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request body' },
      { status: 400 }
    );
  }
}
