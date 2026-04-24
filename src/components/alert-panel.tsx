'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Bell, AlertTriangle, Shield, Zap, CheckCircle, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeverityBadge, SeverityIndicator } from '@/components/ui/severity-badge';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import api from '@/lib/api';

interface AlertPanelProps {
  maxAlerts?: number;
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  high: { icon: Zap, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  medium: { icon: Shield, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  low: { icon: Bell, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  safe: { icon: Shield, color: 'text-green-400', bgColor: 'bg-green-500/20' },
};

function getSeverityConfig(severity: string) {
  const key = (severity || 'low').toLowerCase();
  return (severityConfig as any)[key] || severityConfig.low;
}

export function AlertPanel({ maxAlerts = 20 }: AlertPanelProps) {
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [unacknowledged, setUnacknowledged] = useState(0);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState('Disconnected');
  const socketRef = useRef<Socket | null>(null);

  // ── Load initial alerts from backend dataset ──────────────────────────────
  const loadInitialAlerts = useCallback(async () => {
    try {
      const data = await api.get<{ success: boolean; data: any[] }>(
        `/api/alerts?limit=${maxAlerts}&page=1&sortBy=risk_score&sortOrder=desc`
      );
      if (data.success) {
        setLiveAlerts(data.data || []);
        setUnacknowledged(
          (data.data || []).filter((a: any) => a.review_status === 'Pending').length
        );
      }
    } catch (err) {
      console.error('[AlertPanel] Failed to load initial alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [maxAlerts]);

  // ── Socket.IO — listen only, backend is the only emitter ─────────────────
  useEffect(() => {
    const socketUrl =
      process.env.NODE_ENV === 'development'
        ? `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT || 5000}`
        : process.env.NEXT_PUBLIC_BACKEND_URL || window.location.origin;

    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ [AlertPanel] Socket connected:', socket.id);
      setSocketStatus('Connected');
      // Join the live_alerts room
      socket.emit('subscribe_alerts');
    });

    socket.on('connect_error', (err) => {
      console.error('❌ [AlertPanel] Socket error:', err.message);
      setSocketStatus('Error');
    });

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
    });

    // Backend emits full dataset notification items under new_alert
    socket.on('new_alert', (payload: any) => {
      console.log('🔔 [AlertPanel] new_alert received:', payload?.notification?.notification_id);

      const notif = payload?.notification || payload;
      if (!notif) return;

      setLiveAlerts((prev) => {
        // Dedup by notification_id
        const exists = prev.some((a) => a.notification_id === notif.notification_id);
        if (exists) return prev;
        const updated = [notif, ...prev].slice(0, maxAlerts);
        return updated;
      });

      if (payload.type === 'new' || notif.review_status === 'Pending') {
        setUnacknowledged((n) => n + 1);
      }
    });

    // Backend sends recent_alerts on first connect
    socket.on('recent_alerts', (payload: any) => {
      const alerts = payload?.alerts || [];
      if (alerts.length > 0) {
        setLiveAlerts(alerts.slice(0, maxAlerts));
        setUnacknowledged(alerts.filter((a: any) => a.review_status === 'Pending').length);
        setLoading(false);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [maxAlerts]);

  useEffect(() => {
    loadInitialAlerts();
  }, [loadInitialAlerts]);

  const acknowledgeAlert = useCallback(async (notificationId: string) => {
    try {
      await api.patch(`/api/alerts/${notificationId}/acknowledge`, {});
      setLiveAlerts((prev) =>
        (prev ?? []).map((a) =>
          a?.notification_id === notificationId
            ? { ...a, review_status: 'Approved' }
            : a
        )
      );
      setUnacknowledged((n) => Math.max(0, n - 1));
    } catch (err) {
      console.error('[AlertPanel] Failed to acknowledge:', err);
    }
  }, []);

  const formatTime = useCallback((timestamp?: string | Date | number) => {
    if (!timestamp) return 'just now';
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  }, []);

  if (loading) {
    return (
      <PremiumCard>
        <PremiumCardContent className="py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Bell className="w-5 h-5 text-cyan-400 animate-pulse" />
            <p className="text-sm text-slate-400">Loading alerts...</p>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard className="flex flex-col h-full overflow-hidden relative">
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
              <PremiumCardTitle className="text-base flex items-center gap-2">
                Live Alerts
                <span
                  className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider hidden sm:inline-block ${
                    socketStatus === 'Connected'
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}
                >
                  {socketStatus}
                </span>
              </PremiumCardTitle>
              <p className="text-xs text-slate-400">Security event stream · {liveAlerts.length} alerts</p>
            </div>
          </div>
        </div>
      </PremiumCardHeader>

      <PremiumCardContent className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
        {liveAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
            <p className="text-slate-300 text-sm font-medium">No active alerts</p>
            <p className="text-slate-500 text-xs">Waiting for real-time stream…</p>
          </div>
        ) : (
          <div className="space-y-2">
            {liveAlerts.map((alert, index) => {
              const config = getSeverityConfig(alert.severity || alert.priority || 'low');
              const Icon = config.icon || Bell;
              const isAcknowledged = alert.review_status === 'Approved';

              return (
                <div
                  key={alert.notification_id || index}
                  className={`group relative p-3 rounded-lg border transition-all duration-300 ${
                    isAcknowledged
                      ? 'bg-slate-900/40 border-slate-700/30 opacity-60'
                      : 'bg-slate-800/60 border-slate-600/50 hover:border-slate-500/70'
                  }`}
                >
                  {/* Left severity accent */}
                  {!isAcknowledged && (
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${config.bgColor.replace('/20', '')} animate-pulse`}
                    />
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`mt-1 p-1.5 rounded-md ${config.bgColor}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <SeverityBadge
                          severity={alert.threat_category || alert.severity || alert.priority || 'safe'}
                          showIcon={false}
                          animated={!isAcknowledged}
                        />
                        <span className="text-xs text-slate-500 font-mono">
                          {alert.notification_id}
                        </span>
                        {alert.risk_score !== undefined && (
                          <span className="text-xs text-slate-400">
                            {Math.round(alert.risk_score * 100)}% risk
                          </span>
                        )}
                        
                        {/* AI Explanation Popover */}
                        {alert.ai_explanation && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" className="h-4 w-4 p-0 ml-1 text-cyan-400 hover:text-cyan-300">
                                <Info className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 bg-slate-900 border-slate-700 shadow-2xl p-4 z-50">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                  <Zap className="h-4 w-4 text-cyan-400" />
                                  <h4 className="font-semibold text-sm text-cyan-100">AI Analysis</h4>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed italic">
                                  "{alert.ai_explanation}"
                                </p>
                                {alert.signals && alert.signals.length > 0 && (
                                  <div className="space-y-2 pt-1">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Detected Signals</p>
                                    <div className="flex flex-wrap gap-1">
                                      {alert.signals.map((signal: string, i: number) => (
                                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-sm bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                                          {signal}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2">
                        {alert.content || alert.message || 'No content'}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(alert.timestamp)}</span>
                          {alert.sender && (
                            <span className="ml-2 text-slate-600 truncate max-w-[120px]">
                              {alert.sender}
                            </span>
                          )}
                        </div>

                        {!isAcknowledged && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => acknowledgeAlert(alert.notification_id)}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>

                    <SeverityIndicator
                      severity={alert.threat_category || alert.severity || alert.priority || 'safe'}
                    />
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
