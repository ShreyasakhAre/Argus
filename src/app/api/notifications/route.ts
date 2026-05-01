import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { toDatasetAlert } from '@/lib/dataset-notifications';

// Helper function to parse CSV line
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

// Helper function to load notifications from CSV
function loadNotificationsFromFile() {
  const filePath = path.join(process.cwd(), 'ml-service', 'dataset', 'argus_notifications_10000.csv');
  
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);

  const data = lines.slice(0, 300).map((line, i) => {
    const cols = parseCsvLine(line).map(c => c.trim());

    if (cols.length < 6) return null;

    const [id, org, department, source, sender, receiver] = cols;

    // Normalize source
    const normalizedSource = source?.toLowerCase().trim() || "";

    // 🎯 Generate REALISTIC enterprise message
    let message = "";

    if (normalizedSource.includes("email")) {
      message = `⚠️ Suspicious email detected from ${sender}`;
    } else if (normalizedSource.includes("teams")) {
      message = `⚠️ Unusual Microsoft Teams activity from ${sender}`;
    } else if (normalizedSource.includes("slack")) {
      message = `⚠️ Potential phishing attempt via Slack from ${sender}`;
    } else if (normalizedSource.includes("hr")) {
      message = `⚠️ Unauthorized HR Portal access attempt by ${sender}`;
    } else if (normalizedSource.includes("vpn")) {
      message = `⚠️ Suspicious VPN login detected for ${sender}`;
    } else {
      message = `⚠️ Suspicious activity detected from ${sender}`;
    }

    // 🧠 Smarter severity logic
    let severity = "low";

    if (
      sender.includes("vendor") ||
      sender.includes("verify") ||
      sender.includes("secure") ||
      sender.includes("login")
    ) {
      severity = "high";
    } else if (
      sender.includes("internal") ||
      sender.includes("corp")
    ) {
      severity = "low";
    } else {
      severity = "medium";
    }

    const confidence =
      severity === "high" ? 0.9 :
      severity === "medium" ? 0.6 :
      0.3;

    return {
      id,
      org,
      department,
      source,
      sender,
      receiver,
      message,
      severity,
      confidence,
      risk: Math.round(confidence * 100),
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      
      // Legacy compatibility for other dashboards
      notification_id: id,
      org_id: org,
      channel: source,
      content: message,
      risk_score: confidence,
      risk_level: severity.charAt(0).toUpperCase() + severity.slice(1),
      is_flagged: severity === 'high' || severity === 'medium',
      threat_category: severity
    };
  }).filter(Boolean);

  return data;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orgId = searchParams.get('org_id') || undefined;
  const flaggedOnly = searchParams.get('flagged_only') === 'true';
  const limit = Number.parseInt(searchParams.get('limit') || '200', 10);
  const safeLimit = Number.isFinite(limit) ? limit : 200;

  const notifications = loadNotificationsFromFile()
    .filter((notification: any) => !orgId || orgId === 'ALL' || notification.org === orgId)
    .filter((notification: any) => !flaggedOnly || notification.severity === 'high' || notification.severity === 'medium')
    .slice(0, safeLimit);

  return NextResponse.json({
    notifications,
    // Add alerts directly since notifications already have right structure now
    alerts: notifications,
    total: notifications.length,
  });
}
