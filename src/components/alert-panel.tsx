'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, AlertTriangle, Shield, Zap, CheckCircle, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeverityBadge, SeverityIndicator } from '@/components/ui/severity-badge';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import type { Alert } from '@/lib/mock-data';

interface AlertPanelProps {
  maxAlerts?: number;
  showAll?: boolean;
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  high: { icon: Zap, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  medium: { icon: Shield, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  low: { icon: Bell, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
};

export function AlertPanel({ maxAlerts = 5, showAll = false }: AlertPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unacknowledged, setUnacknowledged] = useState(0);
  const [loading, setLoading] = useState(true);
  const handlerRef = useRef<((e: Event) => void) | null>(null);
  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`/api/alerts${showAll ? '' : '?acknowledged=false'}`);
      const data = await res.json();
      // Filter to show only CRITICAL alerts
      const criticalAlerts = data.alerts.filter((alert: Alert) => alert.severity === 'critical');
      setAlerts(criticalAlerts.slice(0, showAll ? undefined : maxAlerts));
      setUnacknowledged(data.unacknowledged);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setLoading(false);
    }
  }, [showAll, maxAlerts]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  }, [fetchAlerts]);

  const formatTime = useCallback((timestamp?: string) => {
    if (!timestamp) return 'just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  }, []);

  // Initial load
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Periodic refresh (every 30 seconds)
  useEffect(() => {
    fetchIntervalRef.current = setInterval(fetchAlerts, 30000);
    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
    };
  }, [fetchAlerts]);

  // Browser event listener for real-time updates
  useEffect(() => {
    handlerRef.current = (e: Event) => {
      const event = e as CustomEvent;
      const { type, severity, notification } = event.detail;

      console.log("🚨 AlertPanel received event:", { type, severity, notification });

      // Immediately refresh alerts when new fraud-alert arrives
      if (type === "new") {
        fetchAlerts();
      }
    };

    window.addEventListener("fraud-alert", handlerRef.current);

    return () => {
      if (handlerRef.current) {
        window.removeEventListener("fraud-alert", handlerRef.current);
      }
    };
  }, [fetchAlerts]);

  if (loading) {
    return (
      <PremiumCard>
        <PremiumCardContent className="py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <p className="text-sm text-slate-400">Loading alerts...</p>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard className="flex flex-col h-full overflow-hidden">
      <PremiumCardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-5 h-5 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Bell className="w-3 h-3 text-cyan-400" />
              </div>
              {unacknowledged > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse text-xs flex items-center justify-center text-white font-bold">
                  {unacknowledged > 9 ? '9+' : unacknowledged}
                </span>
              )}
            </div>
            <div>
              <PremiumCardTitle className="text-base">Live Alerts</PremiumCardTitle>
              <p className="text-xs text-slate-400">Security event stream</p>
            </div>
          </div>
        </div>
      </PremiumCardHeader>

      <PremiumCardContent className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-lg bg-slate-800/50 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-slate-300 text-sm font-medium">No active alerts</p>
            <p className="text-slate-500 text-xs">System is operating normally</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const config = severityConfig[alert.severity as keyof typeof severityConfig];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={`
                    alert-card group relative p-4 rounded-lg border transition-all duration-300
                    ${
                      alert.acknowledged
                        ? 'bg-slate-900/40 border-slate-700/30 opacity-60'
                        : 'bg-slate-800/60 border-slate-600/50 hover:border-slate-500/70'
                    }
                    hover-lift
                  `}
                >
                  {/* Left border accent */}
                  {!alert.acknowledged && (
                    <div className={`
                      absolute left-0 top-0 bottom-0 w-1 rounded-l-lg
                      ${alert.severity === 'critical' ? 'bg-red-500' : ''}
                      ${alert.severity === 'high' ? 'bg-orange-500' : ''}
                      ${alert.severity === 'medium' ? 'bg-yellow-500' : ''}
                      ${alert.severity === 'low' ? 'bg-cyan-500' : ''}
                      animate-pulse
                    `} />
                  )}

                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`mt-1 p-1.5 rounded-md ${config.bgColor}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SeverityBadge
                            severity={alert.severity as any}
                            showIcon={false}
                            animated={!alert.acknowledged}
                          />
                          <span className="text-xs text-slate-500">{alert.notification_id}</span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-200 mb-2 font-medium">
                        {alert.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(alert.timestamp)}</span>
                        </div>

                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Right indicator */}
                    <SeverityIndicator severity={alert.severity as any} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}
