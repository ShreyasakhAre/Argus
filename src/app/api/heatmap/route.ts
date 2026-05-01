import { NextRequest, NextResponse } from 'next/server';
import { getDatasetHeatmap } from '@/lib/dataset-notifications';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const org_id = searchParams.get('org_id') || undefined;
  
  const data = await getDatasetHeatmap(org_id);
  return NextResponse.json(data);
}
