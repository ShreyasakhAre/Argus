import { NextRequest, NextResponse } from 'next/server';
import { getDatasetStats, validateDataset } from '@/lib/dataset';

export async function GET(request: NextRequest) {
  try {
    const stats = getDatasetStats();
    const validation = validateDataset();

    return NextResponse.json({
      stats,
      validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve dataset statistics' },
      { status: 500 }
    );
  }
}
