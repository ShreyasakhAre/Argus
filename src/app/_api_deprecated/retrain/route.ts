import { NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST() {
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/retrain`, { method: "POST" });
    const data = await mlResponse.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
