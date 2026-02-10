'use client';

import { AlertCircle, AlertTriangle, Info, Zap } from 'lucide-react';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
  showIcon?: boolean;
  animated?: boolean;
}

const severityConfig = {
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
};

export function SeverityBadge({
  severity,
  className = '',
  showIcon = true,
  animated = true,
}: SeverityBadgeProps) {
  const config = severityConfig[severity];
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
  const severityColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-cyan-500',
  };

  return (
    <div
      className={`
        relative w-2 h-2 rounded-full ${severityColors[severity]}
        ${severity === 'critical' ? 'animate-pulse' : ''}
        ${className}
      `}
    />
  );
}
