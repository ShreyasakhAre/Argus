'use client';

import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { initSocketConnection } from '@/lib/socket';

interface RealtimeAlert {
  id: string;
  type: 'threat_detected' | 'department_threat';
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  department?: string;
  data: {
    notification_id: string;
    sender: string;
    receiver?: string;
    department: string;
    channel: string;
    threat_type: string;
    risk_score: number;
    content: string;
    explanation: string;
    requires_action: boolean;
    priority?: string;
  };
  ai?: {
    risk: number;
    label: string;
    explanation: string;
    action: string;
    confidence: number;
    campaign_id?: string;
    entity_risk?: number;
    context_risk?: number;
  };
}

interface StatsUpdate {
  total_notifications: number;
  flagged_notifications: number;
  safe_notifications: number;
  malicious_notifications: number;
  timestamp: string;
}

export const useRealtimeAlerts = (department?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const [stats, setStats] = useState<StatsUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [lastAlert, setLastAlert] = useState<RealtimeAlert | null>(null);

  // Initialize socket connection
  useEffect(() => {
    let socketInstance: Socket | null = null;
    try {
      socketInstance = initSocketConnection();
    } catch (err) {
      console.error('[RealtimeAlerts] Failed to initialize socket:', err);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      return;
    }
    const socketUrl = socketInstance?.io?.uri || 'unknown';
    const onConnect = () => {
      console.log('[RealtimeAlerts] Connected to server');
      setIsConnected(true);
      setConnectionStatus('connected');

      if (department) {
        socketInstance.emit('subscribe_department', department);
        console.log(`[RealtimeAlerts] Subscribed to department: ${department}`);
      }
    };

    const onDisconnect = () => {
      console.log('[RealtimeAlerts] Disconnected from server');
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    const onConnectError = (error: any) => {
      console.error('[RealtimeAlerts] Connection error:', error.message, error);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    const onReconnectAttempt = (attempt: number) => {
      console.warn(`[RealtimeAlerts] Reconnect attempt ${attempt}`);
      setConnectionStatus('reconnecting');
    };

    const onReconnect = (attempt: number) => {
      console.log(`[RealtimeAlerts] Reconnected after ${attempt} attempt(s)`);
      setIsConnected(true);
      setConnectionStatus('connected');
    };

    const onReconnectError = (error: any) => {
      console.error('[RealtimeAlerts] Reconnect error:', error);
      setConnectionStatus('disconnected');
    };

    const onNewEvent = (event: any) => {
      console.log('[RealtimeAlerts] New incoming event:', event);
      const placeholder: any = {
        id: event.id || `evt_${Date.now()}`,
        timestamp: event.timestamp || new Date().toISOString(),
        data: {
          threat_type: 'Analyzing',
          content: event.message || '',
          sender: event.sender || 'unknown',
          department: event.department || 'Unknown',
          risk_score: 0
        },
        ai: {
          action: 'Analyzing...',
          label: 'unknown',
          explanation: 'Analysis pending'
        },
        severity: 'medium'
      };
      setAlerts(prev => [placeholder, ...prev].slice(0, 50));
      setLastAlert(placeholder);
    };

    const onAnalysisComplete = (payload: any) => {
      try {
        console.log('[RealtimeAlerts] Analysis complete:', payload);
        const event = payload.event || {};
        const analysis = payload.analysis || {};

        const probability = analysis.probability ?? analysis.risk_score ?? 0;
        const uiAlert: any = {
          id: event.id || `evt_${Date.now()}`,
          timestamp: event.timestamp || new Date().toISOString(),
          data: {
            threat_type: analysis.label || analysis.classification || 'unknown',
            content: event.message || '',
            sender: event.sender || 'unknown',
            department: event.department || 'Unknown',
            risk_score: probability,
            risk: Math.round(probability * 100)
          },
          ai: {
            action: analysis.recommended_action ? analysis.recommended_action.text : 'No Action',
            label: analysis.label || analysis.classification || 'unknown',
            explanation: Array.isArray(analysis.explanations) ? analysis.explanations.join('; ') : (analysis.explanations || ''),
            probability: probability,
            confidence: analysis.confidence ?? 0
          },
          severity: probability >= 0.7 ? 'high' : probability >= 0.4 ? 'medium' : 'low'
        };

        setAlerts(prev => {
          const existingIdx = prev.findIndex(a => a.id === uiAlert.id);
          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = uiAlert;
            return copy;
          }
          return [uiAlert, ...prev].slice(0, 50);
        });

        setLastAlert(uiAlert);
        if (typeof window !== 'undefined') {
          const evt = new CustomEvent('analysis-complete', { detail: { uiAlert, payload } });
          window.dispatchEvent(evt);
        }
      } catch (e) {
        console.error('Error handling analysis_complete', e);
      }
    };

    const onRealtimeAlert = (alert: RealtimeAlert) => {
      console.log('[RealtimeAlerts] Received alert:', alert);
      setAlerts(prev => [alert, ...prev].slice(0, 50));
      setLastAlert(alert);
    };

    const onDepartmentAlert = (alert: RealtimeAlert) => {
      console.log('[RealtimeAlerts] Received department alert:', alert);
      setAlerts(prev => [alert, ...prev].slice(0, 50));
      setLastAlert(alert);
    };

    const onStatsUpdate = (statsUpdate: StatsUpdate) => {
      console.log('[RealtimeAlerts] Stats updated:', statsUpdate);
      setStats(statsUpdate);
    };

    setConnectionStatus('connecting');
    console.log('[RealtimeAlerts] Connecting to Socket.IO server:', socketUrl);

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onConnectError);
    socketInstance.io.on('reconnect_attempt', onReconnectAttempt);
    socketInstance.io.on('reconnect', onReconnect);
    socketInstance.io.on('reconnect_error', onReconnectError);
    socketInstance.on('new_event', onNewEvent);
    socketInstance.on('new_alert', onRealtimeAlert);
    socketInstance.on('analysis_complete', onAnalysisComplete);
    socketInstance.on('realtime_alert', onRealtimeAlert);
    socketInstance.on('department_alert', onDepartmentAlert);
    socketInstance.on('stats_update', onStatsUpdate);

    if (!socketInstance.connected) {
      socketInstance.connect();
    }

    setSocket(socketInstance);

    // Request notification permissions
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('connect_error', onConnectError);
      socketInstance.io.off('reconnect_attempt', onReconnectAttempt);
      socketInstance.io.off('reconnect', onReconnect);
      socketInstance.io.off('reconnect_error', onReconnectError);
      socketInstance.off('new_event', onNewEvent);
      socketInstance.off('new_alert', onRealtimeAlert);
      socketInstance.off('analysis_complete', onAnalysisComplete);
      socketInstance.off('realtime_alert', onRealtimeAlert);
      socketInstance.off('department_alert', onDepartmentAlert);
      socketInstance.off('stats_update', onStatsUpdate);
    };
  }, [department]);

  // Request immediate alert
  const requestAlert = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('request_alert');
    }
  }, [socket, isConnected]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setLastAlert(null);
  }, []);

  // Mark alert as read
  const markAlertAsRead = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    if (lastAlert?.id === alertId) {
      setLastAlert(null);
    }
  }, [lastAlert]);

  // Get alert severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Get alert icon
  const getAlertIcon = (threatType: string) => {
    switch (threatType.toLowerCase()) {
      case 'phishing': return '🎣';
      case 'bec': return '💼';
      case 'ransomware': return '🔒';
      case 'malware': return '🦠';
      case 'credential theft': return '🔑';
      case 'safe': return '✅';
      default: return '⚠️';
    }
  };

  return {
    socket,
    alerts,
    stats,
    isConnected,
    connectionStatus,
    lastAlert,
    requestAlert,
    clearAlerts,
    markAlertAsRead,
    getSeverityColor,
    getAlertIcon,
  };
};
