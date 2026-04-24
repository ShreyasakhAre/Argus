import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/explain/${id}`);
    if (!mlResponse.ok) {
      if (mlResponse.status === 404) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      throw new Error("FastAPI Error");
    }
    const data = await mlResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to explain' }, { status: 500 });
  }
}
