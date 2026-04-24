import { NextRequest, NextResponse } from 'next/server';
import { getDatasetStats, exportAsJSON, exportAsCSV } from '@/lib/dataset';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    if (format === 'csv') {
      const csv = exportAsCSV();
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="argus-dataset.csv"'
        }
      });
    }

    if (format === 'json') {
      const data = exportAsJSON();
      return NextResponse.json(data);
    }

    if (format === 'stats') {
      const stats = getDatasetStats();
      return NextResponse.json(stats);
    }

    return NextResponse.json(
      { error: 'Invalid format. Use: json, csv, or stats' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export dataset' },
      { status: 500 }
    );
  }
}
