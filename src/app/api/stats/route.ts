import { NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function GET() {
  try {
    const stats = mockData.getStats();

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error('❌ /api/stats failed:', error);

    return NextResponse.json(
      {
        error: 'Failed to load stats',
        fallback: {
          total_notifications: 0,
          flagged_notifications: 0,
          benign_notifications: 0,
          model_metrics: {},
          department_stats: {},
          feature_importance: {}
        }
      },
      { status: 500 }
    );
  }
}
