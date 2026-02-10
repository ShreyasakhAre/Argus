import { NextRequest, NextResponse } from 'next/server';

const SOURCE_APPS = ['Email', 'Slack', 'Microsoft Teams', 'HR Portal', 'Finance System', 'Internal Mobile App'];
const DEPARTMENTS = ['Finance', 'IT', 'HR', 'Executive', 'Sales', 'Marketing'];

const THREAT_TEMPLATES = [
  { title: 'Suspicious login attempt detected', message: 'Multiple failed login attempts from unknown IP address', severity: 'high' as const },
  { title: 'Phishing email intercepted', message: 'Fraudulent email attempting credential theft blocked', severity: 'critical' as const },
  { title: 'Unusual wire transfer request', message: 'Large fund transfer requested from unverified source', severity: 'critical' as const },
  { title: 'Data exfiltration attempt', message: 'Abnormal data download pattern detected from internal user', severity: 'high' as const },
  { title: 'Malware signature detected', message: 'Known malware pattern found in email attachment', severity: 'critical' as const },
  { title: 'Account compromise warning', message: 'Credentials for internal account found on dark web', severity: 'high' as const },
  { title: 'Policy violation detected', message: 'Sensitive document shared to external recipient', severity: 'medium' as const },
  { title: 'Anomalous network traffic', message: 'Unexpected outbound connections to known C2 server', severity: 'critical' as const },
  { title: 'Privilege escalation attempt', message: 'User attempted to access admin resources without authorization', severity: 'high' as const },
  { title: 'Social engineering alert', message: 'Impersonation of executive detected in Slack channel', severity: 'high' as const },
];

let streamCounter = 0;

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * GET /api/notifications/stream
 * Returns a fresh synthetic notification for real-time streaming
 */
export async function GET(_request: NextRequest) {
  streamCounter++;
  const template = randomFrom(THREAT_TEMPLATES);

  const notification = {
    _id: `stream_${Date.now()}_${streamCounter}`,
    title: template.title,
    message: `${template.message} — ${randomFrom(DEPARTMENTS)} dept via ${randomFrom(SOURCE_APPS)}`,
    severity: template.severity,
    read: false,
    timestamp: new Date().toISOString(),
    category: randomFrom(SOURCE_APPS),
  };

  return NextResponse.json({
    notifications: [notification],
  });
}
