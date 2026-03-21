'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { Bell, AlertTriangle, Shield, Zap, CheckCircle, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeverityBadge, SeverityIndicator } from '@/components/ui/severity-badge';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import type { Alert } from '@/lib/alert-types';

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
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]); // Using any[] to safely handle direct socket payload
  const [unacknowledged, setUnacknowledged] = useState(0);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [apiStatus, setApiStatus] = useState("Connected");
  const handlerRef = useRef<((e: Event) => void) | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/alerts` || "https://argus-backend.onrender.com/api/alerts";
  
  const fetchAlerts = useCallback(async () => {
    if (!showAll) {
      // LIVE ALERTS MODE: Do not fetch historical data. Rely purely on Socket.io stream.
      setLoading(false);
      return;
    }
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const res = await fetch(`${API_URL}${showAll ? '' : '?acknowledged=false'}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Backend API fetch failed');
      
      const data = await res.json();
      console.log("Frontend API Data:", data);
      console.log("🟢 Data Source: API (Fetch Success)");
      setApiStatus("Connected");
      
      // Ensure data compatibility matching previous JSON shape cleanly
      const alertsArray = data.alerts || data.data?.alerts || [];
      const criticalAlerts = alertsArray.filter((alert: any) => alert.severity === 'critical');
      
      setLiveAlerts(criticalAlerts.slice(0, showAll ? undefined : maxAlerts));
      setUnacknowledged(data.unacknowledged || 0);
      setLoading(false);
    } catch (err) {
      console.error('🔴 Failed to fetch from Backend API. No local fallback used.', err);
      setLoading(false);
    }
  }, [showAll, maxAlerts]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      // Utilizing the new Product Engineer 'status' endpoint implemented earlier
      const res = await fetch(`${API_URL}/${alertId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'acknowledged' })
      });
      
      if (!res.ok) throw new Error('Backend API acknowledge failed');
      
      console.log("🟢 Data Source: API (Ack Success)");
      setLiveAlerts(prev => prev.map(a => (a.id === alertId || a._id === alertId) ? { ...a, acknowledged: true } : a));
      setUnacknowledged(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('🔴 Failed to acknowledge alert via Backend API:', err);
    }
  }, [API_URL]);

  const formatTime = useCallback((timestamp?: string | Date | number) => {
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

  // Periodic refresh REMOVED - strictly socket-driven

  // Socket.io real-time listener for Express events
  useEffect(() => {
    // Enforcing strict WebSocket transport as requested via Prod ENV
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "https://argus-backend.onrender.com", {
      transports: ["websocket"],
    });
    
    socket.on("connect", () => {
      console.log("✅ SOCKET CONNECTED:", socket.id);
      setSocketStatus("Connected");
    });
    
    socket.on("connect_error", (err) => {
      console.log("❌ SOCKET ERROR:", err.message);
      setSocketStatus("Disconnected");
    });
    
    socket.on("disconnect", () => {
      console.log("⚠️ Socket disconnected");
      setSocketStatus("Disconnected");
    });
    
    socket.on("new_alert", (eventData) => {
      console.log("🚨 LIVE ALERT RECEIVED:", eventData);
      
      if (eventData) {
        setLiveAlerts(prev => {
          // Idempotency check to avoid duplicate injections
          if (prev.some(a => (a.id && a.id === eventData.id) || (a._id && a._id === eventData._id))) return prev;
          return [eventData, ...prev].slice(0, 20);
        });
        
        if (
          eventData.type === "new" ||
          eventData.status === "pending"
        ) {
          setUnacknowledged(prev => prev + 1);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [showAll, fetchAlerts]);

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
    <PremiumCard className="flex flex-col h-full overflow-hidden relative">
      {/* Temporary Full System Debug Panel */}
      <div className="absolute top-2 right-2 bg-slate-950/90 border border-slate-700 p-3 rounded shadow-2xl z-50 text-[10px] font-mono flex flex-col gap-1 backdrop-blur-sm">
        <div className="font-bold text-slate-300 border-b border-slate-700 pb-1 mb-1">SYSTEM DIAGNOSTIC</div>
        <div className="flex justify-between gap-4"><span className="text-slate-500">Data Source:</span><span className="text-cyan-400">SOCKET.IO</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-500">API Status:</span><span className={apiStatus === 'Connected' ? 'text-green-400' : 'text-red-400'}>{apiStatus}</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-500">Socket.io:</span><span className={socketStatus === 'Connected' ? 'text-green-400' : 'text-orange-400'}>{socketStatus}</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-500">Total Alerts:</span><span className="text-yellow-400">{liveAlerts.length}</span></div>
      </div>
  
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
              <PremiumCardTitle className="text-base flex items-center gap-2">Live Alerts <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-bold uppercase tracking-wider hidden sm:inline-block">Data Source: SOCKET</span></PremiumCardTitle>
              <p className="text-xs text-slate-400">Security event stream</p>
            </div>
          </div>
        </div>
      </PremiumCardHeader>

      <PremiumCardContent className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
        {liveAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-lg bg-slate-800/50 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-slate-300 text-sm font-medium">No active alerts</p>
            <p className="text-slate-500 text-xs">System is operating normally</p>
          </div>
        ) : (
          <div className="space-y-2">
            {liveAlerts.map((alert, index) => {
              const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
              const Icon = config.icon || Bell;

              return (
                <div
                  key={alert.id || alert._id || index}
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
