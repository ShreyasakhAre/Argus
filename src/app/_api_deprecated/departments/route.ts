import { NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/departments`);
    if (!mlResponse.ok) throw new Error("FastAPI Error");
    const data = await mlResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ departments: [] }, { status: 500 });
  }
}
