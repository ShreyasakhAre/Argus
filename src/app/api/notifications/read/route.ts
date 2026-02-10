import { NextResponse } from "next/server";
import { mockData } from "@/lib/mock-data";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    // Persist read state in mock-data store
    mockData.markAsRead(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/notifications/read error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
