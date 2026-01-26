import { NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function POST() {
  const data = mockData.retrain();
  return NextResponse.json(data);
}
