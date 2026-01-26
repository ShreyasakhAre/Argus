import { NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function GET() {
  const data = mockData.getStats();
  return NextResponse.json(data);
}
