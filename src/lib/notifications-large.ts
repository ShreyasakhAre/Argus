import type { Notification, SourceApp } from './ml-service';
import { randomUUID } from 'crypto';

/**
 * SAFE DATASET SCALER
 * - Does NOT remove original notifications
 * - Does NOT touch UI or APIs
 * - Generates realistic large-scale data for dashboards
 */

const DEPARTMENTS = ['Finance', 'IT', 'HR', 'Executive', 'Sales', 'Marketing'];
const SOURCE_APPS: SourceApp[] = ['Email', 'Slack', 'Microsoft Teams', 'HR Portal', 'Finance System', 'Internal Mobile App'];
const SENDER_DOMAINS = ['company.com', 'external.com', 'tempmail.com', 'trusted.com', 'scam.net'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateWithinDays(days: number): string {
  const now = Date.now();
  const past = now - days * 24 * 60 * 60 * 1000;
  const date = new Date(past + Math.random() * (now - past));
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function riskDistribution(): { score: number; level: 'Low' | 'Medium' | 'High'; flagged: boolean } {
  const r = Math.random();

  if (r < 0.75) {
    return {
      score: +(Math.random() * 0.25).toFixed(2),
      level: 'Low',
      flagged: false
    };
  }

  if (r < 0.95) {
    return {
      score: +(0.4 + Math.random() * 0.3).toFixed(2),
      level: 'Medium',
      flagged: false
    };
  }

  return {
    score: +(0.85 + Math.random() * 0.15).toFixed(2),
    level: 'High',
    flagged: true
  };
}

/**
 * MAIN GENERATOR
 */
export function generateLargeNotificationDataset(
  baseNotifications: Notification[],
  targetSize = 5000
): Notification[] {
  const output: Notification[] = [...baseNotifications];

  while (output.length < targetSize) {
    const seed = randomFrom(baseNotifications);
    const risk = riskDistribution();
    const senderDomain = randomFrom(SENDER_DOMAINS);

    output.push({
      ...seed,
      notification_id: `N_${randomUUID()}`,
      department: randomFrom(DEPARTMENTS),
      sender: `user${Math.floor(Math.random() * 500)}@${senderDomain}`,
      receiver: seed.receiver,
      timestamp: randomDateWithinDays(30),
      risk_score: risk.score,
      risk_level: risk.level,
      is_flagged: risk.flagged,
      source_app: randomFrom(SOURCE_APPS)
    });
  }

  return output;
}
