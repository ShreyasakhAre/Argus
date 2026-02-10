/**
 * ARGUS ML Training Dataset Pipeline
 * 
 * Stores URL features and risk assessments for machine learning model training.
 * Supports weak supervision using rule-based labels.
 * 
 * Features are extracted for:
 * - Logistic Regression
 * - Random Forest
 * - XGBoost
 * - Deep Learning
 */

import { URLFeatures } from './link-scanner';

export interface DatasetRecord {
  id: string;
  url: string;
  timestamp: string;
  features: URLFeatures;
  risk_score: number;
  risk_level: 'Safe' | 'Suspicious' | 'Critical';
  label: 'benign' | 'suspicious' | 'malicious';
  label_confidence: number; // 0-1, confidence in the label
  detection_reasons: string[];
  manual_review_required: boolean;
}

export interface DatasetExport {
  total_records: number;
  safe_count: number;
  suspicious_count: number;
  malicious_count: number;
  records: DatasetRecord[];
  export_timestamp: string;
}

// ============= RULE-BASED WEAK SUPERVISION =============
// Assign labels using security heuristics (can be improved with human labeling)
function assignWeakLabel(
  riskScore: number,
  threatReasons: string[],
  features: URLFeatures
): { label: 'benign' | 'suspicious' | 'malicious'; confidence: number } {
  // CRITICAL INDICATORS FOR MALICIOUS LABEL
  if (riskScore >= 70) {
    let confidence = 0.95;

    // High confidence if multiple strong signals present
    const strongSignals = [
      features.is_hex_pattern,
      features.is_risky_infrastructure,
      features.entropy_score > 4.2,
      features.uses_ip_address,
      features.has_at_symbol
    ].filter(Boolean).length;

    confidence = Math.min(0.99, 0.85 + (strongSignals * 0.03));

    return { label: 'malicious', confidence };
  }

  // MEDIUM INDICATORS FOR SUSPICIOUS LABEL
  if (riskScore >= 40) {
    let confidence = 0.75;

    // Moderate confidence if 2+ suspicious signals
    const suspiciousSignals = [
      features.entropy_score > 3.5,
      features.suspicious_tld,
      features.suspicious_keywords_found.length > 0,
      features.has_double_extension
    ].filter(Boolean).length;

    confidence = Math.min(0.90, 0.60 + (suspiciousSignals * 0.075));

    return { label: 'suspicious', confidence };
  }

  // LOW RISK = BENIGN
  let confidence = 0.85;

  // Higher confidence for known legitimate domains
  if (features.known_legitimate) {
    confidence = 0.98;
  }

  // Lower confidence for unknown domains
  if (!features.known_legitimate && riskScore >= 20 && riskScore < 40) {
    confidence = 0.65;
  }

  return { label: 'benign', confidence };
}

// ============= IN-MEMORY DATASET STORE =============
// In production, this would be MongoDB
let datasetStore: DatasetRecord[] = [];

export interface CreateRecordInput {
  url: string;
  features: URLFeatures;
  risk_score: number;
  risk_level: 'Safe' | 'Suspicious' | 'Critical';
  threat_reasons: string[];
}

export function createDatasetRecord(input: CreateRecordInput): DatasetRecord {
  const { label, confidence } = assignWeakLabel(
    input.risk_score,
    input.threat_reasons,
    input.features
  );

  const record: DatasetRecord = {
    id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    url: input.url,
    timestamp: new Date().toISOString(),
    features: input.features,
    risk_score: input.risk_score,
    risk_level: input.risk_level,
    label,
    label_confidence: parseFloat(confidence.toFixed(2)),
    detection_reasons: input.threat_reasons,
    manual_review_required: confidence < 0.75 // Flag uncertain labels for review
  };

  // Store in memory (replace with MongoDB in production)
  datasetStore.push(record);

  return record;
}

// ============= DATASET RETRIEVAL =============
export function getAllRecords(): DatasetRecord[] {
  return [...datasetStore];
}

export function getRecordById(id: string): DatasetRecord | undefined {
  return datasetStore.find(r => r.id === id);
}

export function getRecordsByLabel(label: 'benign' | 'suspicious' | 'malicious'): DatasetRecord[] {
  return datasetStore.filter(r => r.label === label);
}

export function getRecordsRequiringReview(): DatasetRecord[] {
  return datasetStore.filter(r => r.manual_review_required);
}

export function getRecordsByDateRange(startDate: Date, endDate: Date): DatasetRecord[] {
  return datasetStore.filter(r => {
    const ts = new Date(r.timestamp);
    return ts >= startDate && ts <= endDate;
  });
}

// ============= DATASET STATISTICS =============
export function getDatasetStats() {
  const benign = datasetStore.filter(r => r.label === 'benign').length;
  const suspicious = datasetStore.filter(r => r.label === 'suspicious').length;
  const malicious = datasetStore.filter(r => r.label === 'malicious').length;
  const avgConfidence = datasetStore.length > 0 
    ? datasetStore.reduce((sum, r) => sum + r.label_confidence, 0) / datasetStore.length 
    : 0;

  return {
    total_records: datasetStore.length,
    benign_count: benign,
    suspicious_count: suspicious,
    malicious_count: malicious,
    avg_label_confidence: parseFloat(avgConfidence.toFixed(2)),
    requires_review: datasetStore.filter(r => r.manual_review_required).length
  };
}

// ============= EXPORT FUNCTIONS =============
export function exportAsJSON(): DatasetExport {
  const stats = getDatasetStats();
  
  return {
    total_records: stats.total_records,
    safe_count: stats.benign_count,
    suspicious_count: stats.suspicious_count,
    malicious_count: stats.malicious_count,
    records: datasetStore,
    export_timestamp: new Date().toISOString()
  };
}

export function exportAsCSV(): string {
  if (datasetStore.length === 0) {
    return 'url,risk_score,risk_level,label,label_confidence,entropy_score,is_hex_pattern,is_risky_infra,threat_reasons,timestamp\n';
  }

  const headers = [
    'url',
    'risk_score',
    'risk_level',
    'label',
    'label_confidence',
    'entropy_score',
    'is_hex_pattern',
    'is_risky_infrastructure',
    'subdomain_length',
    'threat_reasons',
    'timestamp'
  ].join(',');

  const rows = datasetStore.map(record => {
    const threatReasonsStr = `"${record.detection_reasons.join('; ')}"`;
    return [
      `"${record.url}"`,
      record.risk_score,
      record.risk_level,
      record.label,
      record.label_confidence,
      record.features.entropy_score,
      record.features.is_hex_pattern ? 'yes' : 'no',
      record.features.is_risky_infrastructure ? 'yes' : 'no',
      record.features.subdomain_length,
      threatReasonsStr,
      record.timestamp
    ].join(',');
  });

  return `${headers}\n${rows.join('\n')}`;
}

// ============= FEATURE EXTRACTION FOR ML =============
// Normalize features to [0, 1] for ML models
export function extractMLFeatures(record: DatasetRecord): number[] {
  const f = record.features;

  return [
    // Protocol: 0 = http, 1 = https
    f.uses_https ? 1 : 0,

    // Subdomain entropy (normalized 0-5 -> 0-1)
    Math.min(1, f.entropy_score / 5),

    // Is hex pattern
    f.is_hex_pattern ? 1 : 0,

    // Is risky infrastructure
    f.is_risky_infrastructure ? 1 : 0,

    // Number of suspicious keywords
    Math.min(1, f.suspicious_keywords_found.length / 5),

    // Suspicious TLD
    f.suspicious_tld ? 1 : 0,

    // URL length (normalized 0-200 -> 0-1)
    Math.min(1, f.url_length / 200),

    // Special character ratio
    f.special_char_ratio,

    // Digit ratio
    f.digit_ratio,

    // Has @ symbol
    f.has_at_symbol ? 1 : 0,

    // Uses IP address
    f.uses_ip_address ? 1 : 0,

    // Has double extension
    f.has_double_extension ? 1 : 0,

    // Dash count (normalized)
    Math.min(1, f.dash_count / 5),

    // URL shortener
    f.url_shortener ? 1 : 0,

    // Known legitimate
    f.known_legitimate ? 1 : 0,

    // Subdomain length (normalized)
    Math.min(1, f.subdomain_length / 50),

    // Subdomain levels
    Math.min(1, f.subdomain_levels / 5)
  ];
}

// ============= LABEL ENCODING =============
export function encodeLabelAsNumber(label: 'benign' | 'suspicious' | 'malicious'): number {
  switch (label) {
    case 'benign': return 0;
    case 'suspicious': return 1;
    case 'malicious': return 2;
  }
}

// ============= DATASET VALIDATION =============
// Check for data quality issues
export function validateDataset() {
  const issues: string[] = [];

  if (datasetStore.length === 0) {
    issues.push('Dataset is empty');
  }

  // Check for low-confidence labels
  const lowConfidence = datasetStore.filter(r => r.label_confidence < 0.6);
  if (lowConfidence.length > datasetStore.length * 0.2) {
    issues.push(`Warning: ${lowConfidence.length} records have low label confidence (<0.6)`);
  }

  // Check class imbalance
  const stats = getDatasetStats();
  const total = stats.total_records;
  if (total > 0) {
    const benignRatio = stats.benign_count / total;
    const maliciousRatio = stats.malicious_count / total;
    
    if (benignRatio < 0.1 || benignRatio > 0.9) {
      issues.push('Dataset has severe class imbalance (benign)');
    }
    if (maliciousRatio < 0.05) {
      issues.push('Dataset has very few malicious examples');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    stats
  };
}

// ============= CLEAR DATASET (For Testing) =============
export function clearDataset() {
  datasetStore = [];
}
