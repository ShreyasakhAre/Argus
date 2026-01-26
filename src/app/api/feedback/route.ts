import { NextRequest, NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function GET() {
  const data = mockData.getFeedback();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const data = mockData.submitFeedback(body);
  return NextResponse.json(data);
}
