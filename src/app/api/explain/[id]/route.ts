import { NextRequest, NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = mockData.getExplanation(id);
  
  if (!data) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }
  
  return NextResponse.json(data);
}
