'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ToastNotification {
  id: string;
  type: 'high' | 'medium' | 'low' | 'safe';
  title: string;
  message: string;
  timestamp: Date;
}

/** Format a relative time string from a Date */
function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return date.toLocaleTimeString();
}

export function GlobalNotificationToast() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const handleNewNotification = (event: CustomEvent) => {
      const detail = event.detail;
      if (!detail) return;

      // Support both direct alert objects and wrapped {notification, severity} format
      const alert = detail.notification || detail;
      if (!alert) return;

      // Resolve fields from new schema (message, source, severity, confidence)
      // or fallback to old schema (content, source_app, risk_level)
      const rawMessage = alert.message || alert.content || '';
      const rawSource  = alert.source  || alert.source_app  || alert.channel || '';
      const rawSeverity = (alert.severity || detail.severity || '').toLowerCase();
      const riskLevel   = alert.risk_level || '';

      // Skip completely empty alerts
      if (!rawMessage && !rawSource) return;

      // Derive toast type
      const toastType: ToastNotification['type'] =
        rawSeverity === 'high' || rawSeverity === 'critical' || riskLevel === 'High' ? 'high' :
        rawSeverity === 'medium' || riskLevel === 'Medium' ? 'medium' :
        rawSeverity === 'low' ? 'low' : 'safe';

      // Build clean title: use source as badge title
      const title = rawSource
        ? `${rawSource} Alert`
        : toastType === 'high' ? '🔴 High-Risk Alert'
        : toastType === 'medium' ? '🟡 Medium-Risk Alert'
        : '🟢 Activity Detected';

      // Build description from real message
      const description = rawMessage.length > 0
        ? rawMessage.substring(0, 120)
        : `${rawSeverity} severity activity detected`;

      const newToast: ToastNotification = {
        id: Math.random().toString(36).substr(2, 9),
        type: toastType,
        title,
        message: description,
        timestamp: new Date(),
      };

      setToasts(prev => [newToast, ...prev].slice(0, 3));
    };

    // Listen on both event names used across the codebase
    window.addEventListener('new_alert', handleNewNotification as EventListener);
    window.addEventListener('new-notification', handleNewNotification as EventListener);

    return () => {
      window.removeEventListener('new_alert', handleNewNotification as EventListener);
      window.removeEventListener('new-notification', handleNewNotification as EventListener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Auto-remove oldest toast after 6 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(0, -1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const getToastStyles = (type: ToastNotification['type']) => {
    switch (type) {
      case 'high':   return 'bg-red-950/95 border-red-700 text-red-100';
      case 'medium': return 'bg-orange-950/95 border-orange-700 text-orange-100';
      case 'low':    return 'bg-yellow-950/95 border-yellow-700 text-yellow-100';
      case 'safe':   return 'bg-green-950/95 border-green-700 text-green-100';
      default:       return 'bg-slate-900 border-slate-700 text-slate-100';
    }
  };

  const getToastIcon = (type: ToastNotification['type']) => {
    switch (type) {
      case 'high':
      case 'medium':
      case 'low':    return <AlertTriangle className="w-4 h-4" />;
      case 'safe':   return <CheckCircle className="w-4 h-4" />;
      default:       return <Info className="w-4 h-4" />;
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2" style={{ width: '320px' }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            relative p-4 rounded-lg shadow-xl border backdrop-blur-sm
            transform transition-all duration-300 ease-in-out
            ${getToastStyles(toast.type)}
          `}
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>

          <div className="flex items-start gap-3 pr-4">
            <div className="flex-shrink-0 mt-0.5 opacity-90">
              {getToastIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm mb-1 truncate">{toast.title}</div>
              <div className="text-xs opacity-85 break-words line-clamp-2">{toast.message}</div>
              <div className="text-xs opacity-60 mt-1">{formatRelativeTime(toast.timestamp)}</div>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
