'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, Shield, Zap, CheckCircle, X } from 'lucide-react';
import type { Alert } from '@/lib/mock-data';

interface AlertPanelProps {
  maxAlerts?: number;
  showAll?: boolean;
}

const severityConfig = {
  critical: { color: 'bg-red-500', textColor: 'text-red-400', icon: AlertTriangle },
  high: { color: 'bg-orange-500', textColor: 'text-orange-400', icon: Zap },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-400', icon: Shield },
  low: { color: 'bg-blue-500', textColor: 'text-blue-400', icon: Bell },
};

export function AlertPanel({ maxAlerts = 5, showAll = false }: AlertPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unacknowledged, setUnacknowledged] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [showAll]);

  const fetchAlerts = async () => {
    const res = await fetch(`/api/alerts${showAll ? '' : '?acknowledged=false'}`);
    const data = await res.json();
    setAlerts(data.alerts.slice(0, showAll ? undefined : maxAlerts));
    setUnacknowledged(data.unacknowledged);
    setLoading(false);
  };

  const acknowledgeAlert = async (alertId: string) => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId })
    });
    fetchAlerts();
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-8 text-center">
          <Bell className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <div className="relative">
              <Bell className="w-5 h-5 text-cyan-500" />
              {unacknowledged > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            Live Alerts
          </CardTitle>
          {unacknowledged > 0 && (
            <Badge className="bg-red-500/20 text-red-400">
              {unacknowledged} New
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
            <p className="text-zinc-400">No active alerts</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            
            return (
              <div
                key={alert.id}
                className={`relative p-3 rounded-lg border ${
                  alert.acknowledged 
                    ? 'bg-zinc-800/50 border-zinc-700' 
                    : 'bg-zinc-800 border-zinc-600'
                } ${!alert.acknowledged ? 'animate-pulse-slow' : ''}`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.color} rounded-l-lg`} />
                <div className="pl-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.textColor}`} />
                      <Badge className={`${config.color}/20 ${config.textColor} text-xs`}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-zinc-500">{alert.notification_id}</span>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-zinc-700"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-white mt-1">{alert.message}</p>
                  <p className="text-xs text-zinc-500 mt-1">{alert.timestamp}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
