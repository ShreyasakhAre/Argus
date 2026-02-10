import { NextRequest, NextResponse } from "next/server";
import { mockData } from "@/lib/mock-data";
import { emitAlert } from "@/socket-server";

export async function GET(req: NextRequest) {
  try {
    const acknowledged = req.nextUrl.searchParams.get("acknowledged");

    const data = mockData.getAlerts(
      acknowledged !== null ? acknowledged === "true" : undefined
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/alerts error:", error);
    return NextResponse.json(
      { alerts: [], total: 0, unacknowledged: 0 },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { alertId } = await req.json();

    const result = mockData.acknowledgeAlert(alertId);

    emitAlert({ type: "acknowledged", alertId });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/alerts error:", error);
    return NextResponse.json(
      { success: false, alert: null },
      { status: 500 }
    );
  }
}
