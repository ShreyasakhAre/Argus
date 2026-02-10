/**
 * Enterprise-grade notification dataset generator (~5000 records).
 * Simulates real-time organizational behavior with realistic time
 * distributions, attack campaigns, department-specific patterns,
 * and governance metadata.
 *
 * Usage:
 *   import { generateLargeDataset, exportAsCSV } from '@/lib/notification-dataset-generator';
 *   const dataset = generateLargeDataset();
 *   const csv = exportAsCSV(dataset);
 */

import type { SourceApp } from './ml-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DatasetNotification {
  notification_id: string;
  org_id: string;
  department: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  is_flagged: boolean;
  source_app: SourceApp;
  // Governance support metadata (non-breaking)
  review_delay_minutes: number;
  campaign_id?: string;
  attack_type?: 'phishing' | 'BEC' | 'ransomware' | 'invoice_fraud' | 'credential_theft' | 'data_exfiltration';
}

// ---------------------------------------------------------------------------
// Deterministic seeded PRNG (Mulberry32) – keeps datasets reproducible
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickWeighted<T>(items: readonly T[], weights: readonly number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const ORG_IDS = ['ORG001', 'ORG002', 'ORG003'] as const;

const DEPARTMENTS = ['Finance', 'HR', 'IT', 'Sales', 'Marketing', 'Executive', 'Legal', 'Operations'] as const;
type Department = (typeof DEPARTMENTS)[number];

const SOURCE_APPS: SourceApp[] = ['Email', 'Slack', 'Microsoft Teams', 'HR Portal', 'Finance System', 'Internal Mobile App'];

/** Department → typical source apps with relative weights */
const DEPT_SOURCE_WEIGHTS: Record<Department, { apps: SourceApp[]; weights: number[] }> = {
  Finance:    { apps: ['Email', 'Finance System', 'Slack'],                          weights: [4, 4, 2] },
  HR:         { apps: ['HR Portal', 'Email', 'Slack'],                               weights: [5, 3, 2] },
  IT:         { apps: ['Slack', 'Email', 'Internal Mobile App', 'Microsoft Teams'],  weights: [4, 3, 2, 1] },
  Sales:      { apps: ['Email', 'Microsoft Teams', 'Slack'],                         weights: [5, 3, 2] },
  Marketing:  { apps: ['Microsoft Teams', 'Email', 'Slack'],                         weights: [4, 3, 3] },
  Executive:  { apps: ['Email', 'Microsoft Teams'],                                  weights: [6, 4] },
  Legal:      { apps: ['Email', 'Slack'],                                            weights: [7, 3] },
  Operations: { apps: ['Internal Mobile App', 'Slack', 'Email'],                     weights: [4, 3, 3] },
};

const INTERNAL_DOMAINS = ['company.com', 'corp.internal', 'acme-inc.com'];
const EXTERNAL_SAFE_DOMAINS = ['partner.com', 'client.org', 'vendor.io', 'distributor.com', 'supplier.net'];
const SUSPICIOUS_DOMAINS = [
  'tempmail.com', 'darkweb.com', 'malicious.net', 'scam.net', 'external.net',
  'criminal.org', 'phish-secure.xyz', 'urgent-verify.click', 'secure-login.ml',
  'fake-portal.tk', 'account-verify.ga', 'update-now.pw', 'quick-transfer.cc',
];

const FIRST_NAMES = [
  'alice', 'bob', 'carol', 'dave', 'eve', 'frank', 'grace', 'heidi',
  'ivan', 'judy', 'karl', 'lisa', 'mike', 'nina', 'oscar', 'pat',
  'quinn', 'rachel', 'sam', 'tina', 'uma', 'vic', 'walt', 'xena', 'yuri', 'zara',
];

const DEPT_ROLES: Record<Department, string[]> = {
  Finance:    ['accountant', 'controller', 'cfo', 'ap.clerk', 'ar.clerk', 'treasurer'],
  HR:         ['recruiter', 'hr.manager', 'benefits.admin', 'payroll', 'talent'],
  IT:         ['sysadmin', 'devops', 'developer', 'helpdesk', 'security.analyst', 'ciso'],
  Sales:      ['sales.rep', 'account.manager', 'sales.director', 'bdm'],
  Marketing:  ['campaign.mgr', 'content.lead', 'social.media', 'promo'],
  Executive:  ['ceo', 'coo', 'cto', 'board.member', 'assistant'],
  Legal:      ['counsel', 'paralegal', 'compliance.officer'],
  Operations: ['ops.manager', 'logistics', 'warehouse', 'procurement'],
};

// ---------------------------------------------------------------------------
// Safe content templates (per department)
// ---------------------------------------------------------------------------

const SAFE_TEMPLATES: Record<Department, string[]> = {
  Finance: [
    'Please review the quarterly budget report attached.',
    'Invoice #{id} has been processed and approved.',
    'Monthly expense report is ready for submission.',
    'Payment to vendor #{id} has been completed successfully.',
    'Budget allocation for Q{q} has been finalized.',
    'Tax filing documents are available for review at {url}.',
  ],
  HR: [
    'Welcome aboard! Please complete your onboarding documents.',
    'Open enrollment period starts next Monday.',
    'Annual performance review schedule has been published.',
    'Payroll for this period has been processed.',
    'Employee handbook has been updated – please review.',
    'Benefits summary for {year} is now available.',
    'New hire orientation scheduled for Monday at 10 AM.',
  ],
  IT: [
    'System maintenance scheduled for this weekend.',
    'Your ticket #{id} has been resolved.',
    'New deployment pipeline is now active.',
    'Security patches have been applied to all servers.',
    'VPN credentials have been rotated – check your email.',
    'Cloud infrastructure costs report for {month} is ready.',
    'Backup verification completed successfully.',
  ],
  Sales: [
    'Q{q} targets have been updated – check the dashboard.',
    'Partnership renewal contract is ready for signature.',
    'New lead from {domain} has been assigned to you.',
    'Customer feedback summary for last quarter is available.',
    'Proposal #{id} has been sent to the client.',
  ],
  Marketing: [
    'New campaign launching next week – please review materials.',
    'Social media analytics report for {month} is ready.',
    'Brand guidelines have been updated.',
    'Content calendar for Q{q} has been shared.',
    'Event registration page is live.',
  ],
  Executive: [
    'Board meeting rescheduled to Friday 3 PM.',
    'Strategic planning document is ready for review.',
    'Quarterly investor update has been drafted.',
    'Merger due diligence documents have been compiled.',
  ],
  Legal: [
    'NDA for {domain} has been reviewed and approved.',
    'Compliance audit results are available.',
    'Contract amendment #{id} is pending your signature.',
    'Regulatory update: new guidelines effective next month.',
  ],
  Operations: [
    'Warehouse inventory count completed – report attached.',
    'Shipment #{id} has been dispatched.',
    'Supply chain risk assessment for Q{q} is ready.',
    'New vendor onboarding checklist is available.',
  ],
};

// ---------------------------------------------------------------------------
// Malicious content templates (by attack type)
// ---------------------------------------------------------------------------

interface MaliciousTemplate {
  content: string;
  attack_type: DatasetNotification['attack_type'];
}

const MALICIOUS_TEMPLATES: MaliciousTemplate[] = [
  // Phishing
  { content: 'Your password expires in 24 hours – click here to reset NOW {url}', attack_type: 'phishing' },
  { content: 'Your account has been compromised – verify credentials immediately at {url}', attack_type: 'phishing' },
  { content: 'Unusual sign-in activity detected on your account. Verify at {url}', attack_type: 'phishing' },
  { content: 'Your mailbox storage is full. Click {url} to increase quota.', attack_type: 'phishing' },
  { content: 'Action required: confirm your identity to avoid account suspension {url}', attack_type: 'phishing' },
  // BEC
  { content: 'URGENT: Wire transfer needed immediately to account {acct}. Verify at {url}', attack_type: 'BEC' },
  { content: 'Transfer ${amount} to this account urgently – confidential. Use {url}', attack_type: 'BEC' },
  { content: 'Emergency board vote required – transfer authorization needed immediately. Vote at {url}', attack_type: 'BEC' },
  { content: 'Please process this payment before end of day. New bank details at {url}', attack_type: 'BEC' },
  { content: 'I need you to handle a confidential transaction. Details at {url}', attack_type: 'BEC' },
  // Ransomware
  { content: 'Your files are encrypted – pay {btc} BTC or lose everything. Payment portal {url}', attack_type: 'ransomware' },
  { content: 'All company data has been locked. Instructions to recover: {url}', attack_type: 'ransomware' },
  { content: 'We have your data. Pay ransom within 48 hours or it goes public. {url}', attack_type: 'ransomware' },
  // Invoice fraud
  { content: 'Updated payment details for invoice #{id}. New bank info at {url}', attack_type: 'invoice_fraud' },
  { content: 'ACT NOW – transfer funds to avoid late penalty. Instructions at {url}', attack_type: 'invoice_fraud' },
  { content: 'Invoice #{id} is overdue. Immediate payment required via {url}', attack_type: 'invoice_fraud' },
  // Credential theft
  { content: 'IT Security: mandatory password change. Update at {url}', attack_type: 'credential_theft' },
  { content: 'Your VPN certificate has expired. Renew immediately: {url}', attack_type: 'credential_theft' },
  // Data exfiltration
  { content: 'Send me all employee SSN data urgently for audit. Upload at {url}', attack_type: 'data_exfiltration' },
  { content: 'Please share the customer database export. Upload link: {url}', attack_type: 'data_exfiltration' },
  { content: 'Need full employee records for compliance review. Use {url}', attack_type: 'data_exfiltration' },
];

// ---------------------------------------------------------------------------
// Medium-risk content templates
// ---------------------------------------------------------------------------

const MEDIUM_TEMPLATES: string[] = [
  'Special offer just for you – 50% discount! Claim at {url}',
  'Please update your billing information at {url}',
  'You have an unread document shared by {sender}. View at {url}',
  'Reminder: your subscription expires soon. Renew at {url}',
  'External partner requests access to shared workspace. Approve at {url}',
  'New login from unrecognized device. If this was you, ignore. Otherwise {url}',
  'Survey request: please rate your experience at {url}',
  'Calendar invite from external contact – review at {url}',
];

// ---------------------------------------------------------------------------
// URL pools
// ---------------------------------------------------------------------------

const SAFE_URLS = [
  'https://intranet.company.com/docs',
  'https://hr.company.com/portal',
  'https://finance.company.com/reports',
  'https://helpdesk.company.com/tickets',
  'https://wiki.company.com/knowledge-base',
  'https://drive.google.com/company-shared',
  'https://github.com/company/repos',
  'https://sales.company.com/dashboard',
];

const SUSPICIOUS_URLS = [
  'http://192.168.1.{ip}/secure-login/verify',
  'http://security-verify-microsoft.xyz/password-reset?user={user}',
  'http://secure-banking-portal.tk/transfer-auth',
  'http://urgent-finance-verify.click/auth?id={user}',
  'http://microsoft-secure-login.ml/verify?account={user}',
  'http://board-vote-secure.pw/emergency-auth',
  'http://darknet-payment-portal.onion/ransom?id={id}',
  'http://secure-data-upload.ga/confidential',
  'http://account-reset-now.cc/verify?token={id}',
  'http://invoice-payment-update.pw/pay?ref={id}',
  'http://192.168.50.{ip}/emergency-transfer.exe',
];

// ---------------------------------------------------------------------------
// Timestamp generation
// ---------------------------------------------------------------------------

const BASE_DATE = new Date('2024-01-15T00:00:00');
const SPAN_DAYS = 14; // two weeks of data

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Returns hour-of-day weight for notification frequency */
function hourWeight(hour: number, weekend: boolean): number {
  if (weekend) {
    // Low activity on weekends
    if (hour >= 10 && hour <= 15) return 0.3;
    return 0.05;
  }
  // Office hours: high
  if (hour >= 9 && hour <= 12) return 1.0;
  if (hour >= 13 && hour <= 17) return 0.85;
  if (hour === 8 || hour === 18) return 0.4;
  // Night: very low
  if (hour >= 22 || hour <= 5) return 0.02;
  return 0.15;
}

function generateTimestamp(rng: () => number, dayOffset: number, preferredHour?: number): Date {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + dayOffset);

  if (preferredHour !== undefined) {
    d.setHours(preferredHour, Math.floor(rng() * 60), Math.floor(rng() * 60));
    return d;
  }

  const weekend = isWeekend(d);
  // Rejection sampling based on hour weights
  let hour: number;
  for (;;) {
    hour = Math.floor(rng() * 24);
    if (rng() < hourWeight(hour, weekend)) break;
  }
  d.setHours(hour, Math.floor(rng() * 60), Math.floor(rng() * 60));
  return d;
}

// ---------------------------------------------------------------------------
// Campaign generator
// ---------------------------------------------------------------------------

interface Campaign {
  campaign_id: string;
  attack_type: NonNullable<DatasetNotification['attack_type']>;
  sender_domain: string;
  sender_prefix: string;
  target_department: Department;
  day_offset: number;
  start_hour: number;
  count: number;
  base_risk: number;
}

function generateCampaigns(rng: () => number): Campaign[] {
  const campaigns: Campaign[] = [];
  const attack_types: NonNullable<DatasetNotification['attack_type']>[] = [
    'phishing', 'BEC', 'ransomware', 'invoice_fraud', 'credential_theft', 'data_exfiltration',
  ];

  // Generate 15-20 campaigns spread across the date range
  const numCampaigns = 15 + Math.floor(rng() * 6);
  for (let i = 0; i < numCampaigns; i++) {
    const attackType = pick(attack_types, rng);
    const dept = pick(DEPARTMENTS, rng);
    const dayOffset = Math.floor(rng() * SPAN_DAYS);
    // Campaigns happen during work hours predominantly
    const startHour = 8 + Math.floor(rng() * 9); // 8-16
    const count = 15 + Math.floor(rng() * 30); // 15-44 notifications per campaign
    campaigns.push({
      campaign_id: `CAMP-${String(i + 1).padStart(3, '0')}`,
      attack_type: attackType,
      sender_domain: pick(SUSPICIOUS_DOMAINS, rng),
      sender_prefix: pick(FIRST_NAMES, rng) + '.' + pick(['support', 'admin', 'security', 'ceo', 'finance', 'help'], rng),
      target_department: dept,
      day_offset: dayOffset,
      start_hour: startHour,
      count,
      base_risk: 0.7 + rng() * 0.15,
    });
  }
  return campaigns;
}

// ---------------------------------------------------------------------------
// Content builders
// ---------------------------------------------------------------------------

function buildSafeContent(dept: Department, rng: () => number): string {
  const tpl = pick(SAFE_TEMPLATES[dept], rng);
  return tpl
    .replace('{id}', String(1000 + Math.floor(rng() * 9000)))
    .replace('{q}', String(1 + Math.floor(rng() * 4)))
    .replace('{year}', '2024')
    .replace('{month}', pick(['January', 'February', 'March', 'April'], rng))
    .replace('{domain}', pick(EXTERNAL_SAFE_DOMAINS, rng))
    .replace('{url}', pick(SAFE_URLS, rng));
}

function buildMaliciousContent(template: MaliciousTemplate, rng: () => number, receiver: string): string {
  return template.content
    .replace('{url}', pick(SUSPICIOUS_URLS, rng)
      .replace('{ip}', String(Math.floor(rng() * 255)))
      .replace('{user}', receiver)
      .replace('{id}', String(1000 + Math.floor(rng() * 9000))))
    .replace('{acct}', String(10000000 + Math.floor(rng() * 90000000)))
    .replace('{amount}', String(10000 + Math.floor(rng() * 90000)))
    .replace('{btc}', String(1 + Math.floor(rng() * 10)))
    .replace('{id}', String(1000 + Math.floor(rng() * 9000)))
    .replace('{sender}', pick(FIRST_NAMES, rng));
}

function buildMediumContent(rng: () => number, sender: string): string {
  return pick(MEDIUM_TEMPLATES, rng)
    .replace('{url}', pick(SAFE_URLS.concat(SUSPICIOUS_URLS.slice(0, 3)), rng)
      .replace('{ip}', String(Math.floor(rng() * 255)))
      .replace('{user}', sender)
      .replace('{id}', String(1000 + Math.floor(rng() * 9000))))
    .replace('{sender}', sender);
}

// ---------------------------------------------------------------------------
// Person generators
// ---------------------------------------------------------------------------

function makeInternalEmail(dept: Department, rng: () => number): string {
  const role = pick(DEPT_ROLES[dept], rng);
  return `${role}@${pick(INTERNAL_DOMAINS, rng)}`;
}

function makeExternalEmail(rng: () => number, malicious: boolean): string {
  const name = pick(FIRST_NAMES, rng);
  const domain = malicious ? pick(SUSPICIOUS_DOMAINS, rng) : pick(EXTERNAL_SAFE_DOMAINS, rng);
  return `${name}@${domain}`;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateLargeDataset(options?: { count?: number; seed?: number }): DatasetNotification[] {
  const targetCount = options?.count ?? 5000;
  const rng = mulberry32(options?.seed ?? 42);
  const dataset: DatasetNotification[] = [];
  let idCounter = 1;

  function nextId(): string {
    return `N${String(idCounter++).padStart(5, '0')}`;
  }

  // --- Phase 1: Campaign-based high-risk notifications (~10% of total) ---
  const campaigns = generateCampaigns(rng);
  const campaignTarget = Math.floor(targetCount * 0.10);
  let campaignCount = 0;

  for (const campaign of campaigns) {
    if (campaignCount >= campaignTarget) break;

    const remaining = Math.min(campaign.count, campaignTarget - campaignCount);
    const templates = MALICIOUS_TEMPLATES.filter(t => t.attack_type === campaign.attack_type);
    const fallbackTemplates = MALICIOUS_TEMPLATES;

    for (let j = 0; j < remaining; j++) {
      const tpl = templates.length > 0 ? pick(templates, rng) : pick(fallbackTemplates, rng);
      const receiver = makeInternalEmail(campaign.target_department, rng);
      const sender = `${campaign.sender_prefix}@${campaign.sender_domain}`;
      // Risk increases slightly over the campaign
      const riskProgression = j / Math.max(remaining - 1, 1);
      const riskScore = clamp(campaign.base_risk + riskProgression * 0.15 + (rng() * 0.05 - 0.025), 0.65, 0.99);

      const ts = generateTimestamp(rng, campaign.day_offset, campaign.start_hour + Math.floor(j * 2 / remaining));

      dataset.push({
        notification_id: nextId(),
        org_id: pick(ORG_IDS, rng),
        department: campaign.target_department,
        sender,
        receiver,
        content: buildMaliciousContent(tpl, rng, receiver),
        timestamp: formatDate(ts),
        risk_score: Math.round(riskScore * 100) / 100,
        risk_level: 'High',
        is_flagged: true,
        source_app: pickWeighted(['Email', 'Slack', 'Microsoft Teams'] as SourceApp[], [7, 2, 1], rng),
        review_delay_minutes: Math.floor(rng() * 30) + 1,
        campaign_id: campaign.campaign_id,
        attack_type: tpl.attack_type,
      });
      campaignCount++;
    }
  }

  // --- Phase 2: Medium-risk notifications (~15% of total) ---
  const mediumTarget = Math.floor(targetCount * 0.15);
  for (let i = 0; i < mediumTarget; i++) {
    const dept = pick(DEPARTMENTS, rng);
    const sender = rng() > 0.5 ? makeExternalEmail(rng, false) : makeInternalEmail(dept, rng);
    const receiver = makeInternalEmail(dept, rng);
    const dayOffset = Math.floor(rng() * SPAN_DAYS);
    const ts = generateTimestamp(rng, dayOffset);
    const riskScore = clamp(0.35 + rng() * 0.30, 0.30, 0.64);
    const sw = DEPT_SOURCE_WEIGHTS[dept];

    dataset.push({
      notification_id: nextId(),
      org_id: pick(ORG_IDS, rng),
      department: dept,
      sender,
      receiver,
      content: buildMediumContent(rng, sender),
      timestamp: formatDate(ts),
      risk_score: Math.round(riskScore * 100) / 100,
      risk_level: 'Medium',
      is_flagged: rng() < 0.3,
      source_app: pickWeighted(sw.apps, sw.weights, rng),
      review_delay_minutes: Math.floor(rng() * 120) + 5,
    });
  }

  // --- Phase 3: Low-risk / safe notifications (fill to target) ---
  const lowTarget = targetCount - dataset.length;

  // Department weights: Finance=fewer, HR=periodic bursts, IT=frequent, Sales=many
  const deptWeights: Record<Department, number> = {
    Finance: 0.08,
    HR: 0.15,
    IT: 0.22,
    Sales: 0.20,
    Marketing: 0.12,
    Executive: 0.05,
    Legal: 0.06,
    Operations: 0.12,
  };
  const deptEntries = Object.entries(deptWeights) as [Department, number][];
  const deptNames = deptEntries.map(e => e[0]);
  const deptW = deptEntries.map(e => e[1]);

  // HR burst days (onboarding / payroll)
  const hrBurstDays = new Set<number>();
  for (let i = 0; i < 3; i++) hrBurstDays.add(Math.floor(rng() * SPAN_DAYS));

  for (let i = 0; i < lowTarget; i++) {
    let dept = pickWeighted(deptNames, deptW, rng);
    const dayOffset = Math.floor(rng() * SPAN_DAYS);

    // HR burst: on burst days, greatly increase HR selection
    if (hrBurstDays.has(dayOffset) && rng() < 0.4) {
      dept = 'HR';
    }

    const isExternal = dept === 'Sales' ? rng() < 0.6 : rng() < 0.15;
    const sender = isExternal ? makeExternalEmail(rng, false) : makeInternalEmail(dept, rng);
    const receiver = makeInternalEmail(dept, rng);
    const ts = generateTimestamp(rng, dayOffset);

    // Finance: slightly higher average risk even for "low"
    let riskScore: number;
    if (dept === 'Finance') {
      riskScore = clamp(0.08 + rng() * 0.20, 0.01, 0.29);
    } else {
      riskScore = clamp(rng() * 0.25, 0.01, 0.29);
    }

    const sw = DEPT_SOURCE_WEIGHTS[dept];
    // Weekend: force low risk
    const d = new Date(BASE_DATE);
    d.setDate(d.getDate() + dayOffset);

    dataset.push({
      notification_id: nextId(),
      org_id: pick(ORG_IDS, rng),
      department: dept,
      sender,
      receiver,
      content: buildSafeContent(dept, rng),
      timestamp: formatDate(ts),
      risk_score: Math.round(riskScore * 100) / 100,
      risk_level: 'Low',
      is_flagged: false,
      source_app: pickWeighted(sw.apps, sw.weights, rng),
      review_delay_minutes: Math.floor(rng() * 480) + 10,
    });
  }

  // Sort by timestamp
  dataset.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return dataset;
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

const CSV_HEADERS: (keyof DatasetNotification)[] = [
  'notification_id', 'org_id', 'department', 'sender', 'receiver',
  'content', 'timestamp', 'risk_score', 'risk_level', 'is_flagged',
  'source_app', 'review_delay_minutes', 'campaign_id', 'attack_type',
];

function escapeCsvField(value: unknown): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportAsCSV(dataset: DatasetNotification[]): string {
  const header = CSV_HEADERS.join(',');
  const rows = dataset.map(row =>
    CSV_HEADERS.map(h => escapeCsvField(row[h])).join(',')
  );
  return [header, ...rows].join('\n');
}
