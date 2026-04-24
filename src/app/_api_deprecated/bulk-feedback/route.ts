import { NextRequest, NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { feedbackList } = body;
  
  const data = mockData.submitBulkFeedback(feedbackList);
  return NextResponse.json(data);
}
