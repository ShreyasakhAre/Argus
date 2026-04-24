import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/feedback`);
    const data = await mlResponse.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ feedback: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mlResponse = await fetch(`${ML_SERVICE_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const data = await mlResponse.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
