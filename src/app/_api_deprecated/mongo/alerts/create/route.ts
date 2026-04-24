import { NextResponse } from "next/server";
import { createAlert } from "../../../../../../backend/services/alertService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createAlert(body);

    return NextResponse.json({
      ...result,
      notification: result.alert,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/mongo/alerts/create error:", error);

    const status =
      error instanceof Error && error.message.includes("required") ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        alert: null,
        notification: null,
        message:
          error instanceof Error ? error.message : "Unable to create alert.",
      },
      { status }
    );
  }
}
