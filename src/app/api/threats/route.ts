import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Lightweight CSV parser (same pattern used across the codebase)
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
    else { current += char; }
  }
  values.push(current.trim());
  return values;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'ml-service', 'dataset', 'argus_notifications_10000.csv');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ patterns: [], campaigns: [] });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const [headerLine, ...rawLines] = content.split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(headerLine);

    // Parse rows into objects
    const rows = rawLines.slice(0, 2000).map(line => {
      const vals = parseCsvLine(line).map(v => v.trim());
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
    });

    // ── 1. Threat category patterns (from dataset) ──────────────────────
    const threatCounts: Record<string, number> = {};
    for (const row of rows) {
      const cat = row.threat_category || 'Safe';
      threatCounts[cat] = (threatCounts[cat] || 0) + 1;
    }

    const categoryPatterns = Object.entries(threatCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], idx) => ({
        id: `TP${String(idx + 1).padStart(3, '0')}`,
        name: name === 'Safe' ? 'Safe Communications' : name,
        description: getThreatDescription(name),
        severity: getThreatSeverity(name) as 'Low' | 'Medium' | 'High' | 'Critical',
        status: count > 100 ? 'Active' : count > 30 ? 'Monitoring' : 'Resolved',
        indicators: getThreatIndicators(name),
        detectedCount: count,
        trend: 'stable',
        lastDetected: new Date().toISOString(),
      }));

    // ── 2. Campaign detection (group by sender domain, threshold ≥ 3) ───
    const domainMap: Record<string, { count: number; senders: Set<string>; depts: Set<string>; highRisk: number }> = {};

    for (const row of rows) {
      const sender = row.sender_email || row.sender || '';
      const domain = sender.includes('@') ? sender.split('@')[1].toLowerCase() : '';
      if (!domain || domain.length < 4) continue;

      const riskScore = parseFloat(row.risk_score || '0');
      const isMalicious = row.is_malicious === '1' || row.threat_category !== 'Safe';

      if (!domainMap[domain]) {
        domainMap[domain] = { count: 0, senders: new Set(), depts: new Set(), highRisk: 0 };
      }
      domainMap[domain].count++;
      domainMap[domain].senders.add(sender);
      if (row.department) domainMap[domain].depts.add(row.department);
      if (riskScore > 0.6 || isMalicious) domainMap[domain].highRisk++;
    }

    const CAMPAIGN_THRESHOLD = 3;
    const campaigns = Object.entries(domainMap)
      .filter(([, d]) => d.count >= CAMPAIGN_THRESHOLD && !d.senders.has('') )
      .sort((a, b) => b[1].highRisk - a[1].highRisk || b[1].count - a[1].count)
      .slice(0, 15)
      .map(([domain, data], idx) => ({
        id: `CAMP${String(idx + 1).padStart(3, '0')}`,
        type: 'campaign',
        domain,
        senderCount: data.senders.size,
        totalAlerts: data.count,
        highRiskAlerts: data.highRisk,
        departments: Array.from(data.depts),
        severity:
          data.highRisk > 10 ? 'Critical' :
          data.highRisk > 3  ? 'High' :
          data.count > 10    ? 'Medium' : 'Low',
        status: data.highRisk > 5 ? 'Active' : 'Monitoring',
        description: `${data.count} alerts from ${data.senders.size} sender(s) at ${domain} — ${data.highRisk} flagged as high risk`,
        detectedAt: new Date().toISOString(),
      }));

    return NextResponse.json({
      patterns: categoryPatterns,
      campaigns,
    });
  } catch (err) {
    console.error('/api/threats error:', err);
    return NextResponse.json({ patterns: [], campaigns: [] });
  }
}

function getThreatDescription(cat: string): string {
  const map: Record<string, string> = {
    'Phishing': 'Credential theft via fake password reset or account verification emails',
    'BEC': 'Business Email Compromise — executive impersonation for financial fraud',
    'Ransomware': 'Malware delivery through malicious attachments or links',
    'Credential Theft': 'Harvesting credentials via fake authentication portals',
    'Low Risk Suspicious': 'Suspicious elements present but may be legitimate',
    'Safe': 'Legitimate communications with no threat indicators',
  };
  return map[cat] || 'Detected anomalous communication pattern';
}

function getThreatSeverity(cat: string): string {
  const map: Record<string, string> = {
    'Ransomware': 'Critical', 'BEC': 'High', 'Phishing': 'High',
    'Credential Theft': 'High', 'Low Risk Suspicious': 'Medium', 'Safe': 'Low',
  };
  return map[cat] || 'Medium';
}

function getThreatIndicators(cat: string): string[] {
  const map: Record<string, string[]> = {
    'Phishing': ['Urgent action required', 'Suspicious links', 'Credential requests', 'Account verification'],
    'BEC': ['Executive impersonation', 'Financial transfer requests', 'Confidentiality demands', 'Urgent payment'],
    'Ransomware': ['Malicious attachments', 'Suspicious URLs', 'Encryption threats', 'Payment demands'],
    'Credential Theft': ['Fake login pages', 'Password reset requests', 'Account verification', 'Security alerts'],
    'Low Risk Suspicious': ['Unusual senders', 'Generic greetings', 'External links', 'Vague requests'],
    'Safe': ['Internal domains', 'Verified senders', 'Normal business content', 'No suspicious patterns'],
  };
  return map[cat] || ['Anomalous sender behaviour', 'Unusual communication patterns'];
}
