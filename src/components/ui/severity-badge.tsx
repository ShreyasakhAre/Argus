'use client';

import { AlertCircle, AlertTriangle, Info, Zap, Shield, ShieldAlert } from 'lucide-react';

/**
 * Severity levels from the new dataset schema.
 * Handles both legacy (critical/high/medium/low/safe) and
 * dataset threat_category values (BEC, Ransomware, Phishing, etc.)
 */
export type SeverityLevel =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'safe'
  // Dataset threat_category values
  | 'bec'
  | 'ransomware'
  | 'phishing'
  | 'high_risk_suspicious'
  | 'low_risk_suspicious'
  | 'suspicious'
  | string; // allow any unknown value — never crash

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
  showIcon?: boolean;
  animated?: boolean;
}

type ConfigEntry = {
  bg: string;
  border: string;
  text: string;
  icon: React.ElementType;
  label: string;
  pulse: string;
};

const severityConfig: Record<string, ConfigEntry> = {
  critical: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
    text: 'text-red-300',
    icon: AlertCircle,
    label: 'Critical',
    pulse: 'animate-pulse',
  },
  high: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/40',
    text: 'text-orange-300',
    icon: AlertTriangle,
    label: 'High',
    pulse: 'animate-pulse',
  },
  medium: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/40',
    text: 'text-yellow-300',
    icon: AlertTriangle,
    label: 'Medium',
    pulse: '',
  },
  low: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/40',
    text: 'text-cyan-300',
    icon: Info,
    label: 'Low',
    pulse: '',
  },
  safe: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/40',
    text: 'text-green-300',
    icon: Shield,
    label: 'Safe',
    pulse: '',
  },
  // Dataset-specific threat categories
  bec: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
    text: 'text-red-300',
    icon: ShieldAlert,
    label: 'BEC',
    pulse: 'animate-pulse',
  },
  ransomware: {
    bg: 'bg-red-600/20',
    border: 'border-red-600/40',
    text: 'text-red-200',
    icon: ShieldAlert,
    label: 'Ransomware',
    pulse: 'animate-pulse',
  },
  phishing: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/40',
    text: 'text-orange-300',
    icon: AlertCircle,
    label: 'Phishing',
    pulse: 'animate-pulse',
  },
  high_risk_suspicious: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/40',
    text: 'text-orange-300',
    icon: AlertTriangle,
    label: 'High Risk',
    pulse: '',
  },
  suspicious: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/40',
    text: 'text-yellow-300',
    icon: AlertTriangle,
    label: 'Suspicious',
    pulse: '',
  },
  low_risk_suspicious: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    text: 'text-blue-300',
    icon: Info,
    label: 'Low Risk',
    pulse: '',
  },
};

/** Normalize any severity string to a known config key */
function resolveConfig(severity: SeverityLevel): ConfigEntry {
  const normalized = (severity || 'safe').toString().toLowerCase().replace(/\s+/g, '_');
  return (
    severityConfig[normalized] ||
    // Try partial match for e.g. "Safe", "BEC Attack", etc.
    Object.entries(severityConfig).find(([k]) => normalized.includes(k))?.[1] ||
    severityConfig.safe
  );
}

export function SeverityBadge({
  severity,
  className = '',
  showIcon = true,
  animated = true,
}: SeverityBadgeProps) {
  const config = resolveConfig(severity);
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
        border transition-all duration-300
        ${config.bg} ${config.border} ${config.text}
        ${animated && config.pulse}
        ${className}
      `}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
}

export function SeverityIndicator({
  severity,
  className = '',
}: {
  severity: SeverityLevel;
  className?: string;
}) {
  const config = resolveConfig(severity);
  const colorMap: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-cyan-500',
    safe: 'bg-green-500',
    bec: 'bg-red-500',
    ransomware: 'bg-red-600',
    phishing: 'bg-orange-500',
    high_risk_suspicious: 'bg-orange-400',
    suspicious: 'bg-yellow-400',
    low_risk_suspicious: 'bg-blue-400',
  };

  const normalized = (severity || 'safe').toString().toLowerCase().replace(/\s+/g, '_');
  const dotColor =
    colorMap[normalized] ||
    Object.entries(colorMap).find(([k]) => normalized.includes(k))?.[1] ||
    'bg-green-500';

  return (
    <div
      className={`
        relative w-2 h-2 rounded-full ${dotColor}
        ${normalized === 'critical' || normalized === 'bec' || normalized === 'ransomware'
          ? 'animate-pulse'
          : ''
        }
        ${className}
      `}
    />
  );
}
