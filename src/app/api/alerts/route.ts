import { NextRequest, NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const acknowledged = searchParams.get('acknowledged');
  
  const data = mockData.getAlerts(
    acknowledged !== null ? acknowledged === 'true' : undefined
  );
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { alertId } = body;
  
  const result = mockData.acknowledgeAlert(alertId);
  return NextResponse.json(result);
}
