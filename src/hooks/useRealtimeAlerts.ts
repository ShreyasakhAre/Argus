'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface LiveAlert {
  id: string;
  title: string;
  sender: string;
  department: string;
  threatType: string;
  severity: 'critical' | 'high' | 'medium' | 'safe';
  riskScore: number;
  explanation: string;
  timestamp: string;
  notification?: any;
}

export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  useEffect(() => {
    // Initialize Socket.IO connection - use relative URL to go through Next.js proxy
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[realtime] Connected to server');
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[realtime] Disconnected from server:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[realtime] Connection error:', error);
      setIsConnected(false);
      
      // If direct connection fails, try fallback
      if (socketUrl === '') {
        console.warn('[realtime] Trying direct connection to localhost:5000');
        socket.disconnect();
        const fallbackSocket = io('http://localhost:5000', {
          transports: ['websocket', 'polling'],
          withCredentials: true,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 3,
        });
        
        fallbackSocket.on('connect', () => {
          console.log('[realtime] Fallback connection successful');
          setIsConnected(true);
          socketRef.current = fallbackSocket;
        });
        
        fallbackSocket.on('connect_error', (err) => {
          console.error('[realtime] Fallback connection failed:', err);
        });
        
        return fallbackSocket;
      }
    });

    // Join the live_alerts room
    socket.emit('join_live_alerts');

    // Listen for new alerts
    socket.on('new_alert', (alertData: LiveAlert) => {
      console.log('[realtime] Received new alert:', alertData);
      
      // Add the new alert to the list
      setAlerts(prev => {
        // Keep only the most recent 10 alerts to prevent memory issues
        const updated = [...prev, alertData];
        return updated.slice(-10);
      });
    });

    // Listen for recent alerts on first connect
    socket.on('recent_alerts', (data: { alerts: any[], timestamp: string }) => {
      console.log('[realtime] Received recent alerts:', data.alerts.length);
      
      // Transform recent alerts to our format
      const transformedAlerts: LiveAlert[] = data.alerts.map(alert => ({
        id: alert.notification_id,
        title: generateAlertTitle(alert),
        sender: alert.sender,
        department: alert.department,
        threatType: alert.threat_category,
        severity: mapSeverity(alert.priority, alert.risk_score),
        riskScore: Math.round(alert.risk_score * 100),
        explanation: alert.ai_explanation || generateBasicExplanation(alert),
        timestamp: alert.timestamp,
        notification: alert
      }));

      setAlerts(transformedAlerts.slice(-5)); // Show only 5 most recent on load
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    alerts,
    isConnected,
    removeAlert,
    clearAllAlerts,
  };
}

// Helper functions
function generateAlertTitle(item: any): string {
  const threatType = item.threat_category?.toLowerCase() || 'suspicious';
  
  if (threatType.includes('phishing')) {
    return '🚨 Phishing attempt detected in ' + (item.department || 'organization');
  } else if (threatType.includes('malware') || threatType.includes('ransomware')) {
    return '⚠️ Malware threat detected in ' + (item.department || 'organization');
  } else if (threatType.includes('bec')) {
    return '🔒 Business Email Compromise attempt detected';
  } else if (threatType.includes('suspicious') || item.risk_score >= 0.4) {
    return '⚠ Suspicious activity detected in ' + (item.department || 'organization');
  } else {
    return '✅ Safe internal notification from ' + (item.department || 'organization');
  }
}

function mapSeverity(priority: string, riskScore: number): 'critical' | 'high' | 'medium' | 'safe' {
  if (riskScore >= 0.8 || priority === 'critical') return 'critical';
  if (riskScore >= 0.65 || priority === 'high') return 'high';
  if (riskScore >= 0.4 || priority === 'medium') return 'medium';
  return 'safe';
}

function generateBasicExplanation(item: any): string {
  const riskScore = item.risk_score || 0;
  const threatType = item.threat_category?.toLowerCase() || 'unknown';
  
  if (riskScore >= 0.7) {
    return `High risk ${threatType} detected due to suspicious sender patterns and unusual content characteristics.`;
  } else if (riskScore >= 0.4) {
    return `Suspicious activity flagged for review. Sender verification and content analysis recommended.`;
  } else {
    return `Safe notification passing all security checks. Verified internal source.`;
  }
}
