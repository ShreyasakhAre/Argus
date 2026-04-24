import { NextRequest, NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = (searchParams.get('format') || 'json') as 'csv' | 'json';
  const org_id = searchParams.get('org_id') || undefined;
  const flagged_only = searchParams.get('flagged_only') === 'true';
  
  const data = await mockData.exportReport(format, { org_id, flagged_only });
  return NextResponse.json(data);
}
