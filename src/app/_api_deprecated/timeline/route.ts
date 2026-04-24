import { NextRequest, NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const notification_id = searchParams.get('notification_id') || undefined;
  
  const data = mockData.getTimeline(notification_id);
  return NextResponse.json(data);
}
