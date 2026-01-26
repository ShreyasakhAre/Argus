import { NextRequest, NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const org_id = searchParams.get('org_id') || undefined;
  
  const data = mockData.getHeatmap(org_id);
  return NextResponse.json(data);
}
