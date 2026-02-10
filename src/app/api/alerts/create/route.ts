import { NextResponse } from "next/server";
import { mockData } from "@/lib/mock-data";

export async function POST(request: Request) {
  try {
    const { severity, message, code } = await request.json();

    // Create an in-memory alert via mockData
    const alertId = `A${Date.now()}`;
    const notification = {
      _id: `notif_${Date.now()}`,
      userId: "admin",
      alertId,
      title: severity === "critical" ? "Security Alert" : "Notification",
      message,
      severity,
      read: false,
    };

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("POST /api/alerts/create error:", error);
    return NextResponse.json(
      { success: false, notification: null },
      { status: 500 }
    );
  }
}
