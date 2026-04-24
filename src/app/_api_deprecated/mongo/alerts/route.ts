import { NextRequest, NextResponse } from "next/server";
import {
  acknowledgeAlert,
  createAlert,
  getAlerts,
} from "../../../../../backend/services/alertService";

export async function GET(req: NextRequest) {
  try {
    const acknowledged = req.nextUrl.searchParams.get("acknowledged");
    const data = await getAlerts({
      acknowledged: acknowledged !== null ? acknowledged === "true" : undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/mongo/alerts error:", error);
    return NextResponse.json(
      { alerts: [], total: 0, unacknowledged: 0 },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};

  try {
    body = await req.json();

    if (typeof body.alertId === "string") {
      const result = await acknowledgeAlert(body.alertId);

      if (!result.success) {
        return NextResponse.json(
          { success: false, alert: null, message: "Alert not found." },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    }

    const result = await createAlert(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/mongo/alerts error:", error);

    const status =
      error instanceof Error && error.message.includes("required") ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        alert: null,
        message:
          error instanceof Error ? error.message : "Unable to process alert.",
      },
      { status }
    );
  }
}
