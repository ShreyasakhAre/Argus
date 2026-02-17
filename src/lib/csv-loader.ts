import fs from 'fs';
import path from 'path';
import type { Notification, SourceApp } from './ml-service';

const DATASET_PATH = path.join(
  process.cwd(),
  'ml-service',
  'dataset',
  'notification.csv'
);

const SOURCE_APPS: SourceApp[] = ['Email', 'Slack', 'Microsoft Teams', 'HR Portal', 'Finance System', 'Internal Mobile App'];

let cachedNotifications: Notification[] | null = null;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export async function loadNotificationsFromCSV(): Promise<Notification[]> {
  if (cachedNotifications) return cachedNotifications;

  const raw = fs.readFileSync(DATASET_PATH, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const headers = parseCsvLine(lines[0]);

  const results: Notification[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });

    const isMalicious = row.is_malicious === '1' || row.is_malicious === 'true';
    // Derive risk fields from is_malicious
    const riskScore = isMalicious ? 0.75 + Math.random() * 0.24 : Math.random() * 0.3;
    const riskLevel: 'Low' | 'Medium' | 'High' = riskScore >= 0.7 ? 'High' : riskScore >= 0.4 ? 'Medium' : 'Low';
    
    // Validate and cast risk_level from CSV
    const csvRiskLevel = row.risk_level;
    const validRiskLevel: 'Low' | 'Medium' | 'High' = (csvRiskLevel === 'High' || csvRiskLevel === 'Medium' || csvRiskLevel === 'Low') 
      ? (csvRiskLevel as 'Low' | 'Medium' | 'High')
      : riskLevel;

    results.push({
      notification_id: row.notification_id || `N${String(i).padStart(3, '0')}`,
      org_id: row.org_id || 'ORG001',
      department: row.department || 'General',
      sender: row.sender || '',
      receiver: row.receiver || '',
      content: row.content || '',
      timestamp: row.timestamp || '',
      risk_score: row.risk_score ? Number(row.risk_score) : riskScore,
      risk_level: validRiskLevel,
      is_flagged: row.is_flagged !== undefined ? (row.is_flagged === 'true') : isMalicious,
      source_app: (row.source_app as SourceApp) || SOURCE_APPS[i % SOURCE_APPS.length],
    });
  }

  cachedNotifications = results;
  return results;
}
