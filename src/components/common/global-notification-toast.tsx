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

export function GlobalNotificationToast() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    // Listen to existing socket events or custom events
    const handleNewNotification = (event: CustomEvent) => {
      const notification = event.detail;
      
      if (!notification) return;

      const newToast: ToastNotification = {
        id: Math.random().toString(36).substr(2, 9),
        type: notification.risk_level === 'High' ? 'high' : 
              notification.risk_level === 'Medium' ? 'medium' : 
              notification.is_flagged ? 'low' : 'safe',
        title: notification.source_app || 'New Notification',
        message: notification.content?.substring(0, 100) || 'New notification received',
        timestamp: new Date()
      };

      setToasts(prev => {
        const updated = [newToast, ...prev];
        // Keep only latest 3 toasts
        return updated.slice(0, 3);
      });
    };

    // Listen to custom notification events
    window.addEventListener('new-notification', handleNewNotification as EventListener);
    
    // Also listen to socket events if available
    if (typeof window !== 'undefined' && (window as any).socket) {
      (window as any).socket.on('notification', handleNewNotification);
    }

    return () => {
      window.removeEventListener('new-notification', handleNewNotification as EventListener);
      if (typeof window !== 'undefined' && (window as any).socket) {
        (window as any).socket.off('notification', handleNewNotification);
      }
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Auto-remove toasts after 5 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(0, -1)); // Remove oldest toast
    }, 5000);

    return () => clearTimeout(timer);
  }, [toasts]);

  const getToastStyles = (type: ToastNotification['type']) => {
    switch (type) {
      case 'high':
        return 'bg-red-600 text-white border-red-700';
      case 'medium':
        return 'bg-orange-600 text-white border-orange-700';
      case 'low':
        return 'bg-yellow-600 text-white border-yellow-700';
      case 'safe':
        return 'bg-green-600 text-white border-green-700';
      default:
        return 'bg-slate-600 text-white border-slate-700';
    }
  };

  const getToastIcon = (type: ToastNotification['type']) => {
    switch (type) {
      case 'high':
      case 'medium':
      case 'low':
        return <AlertTriangle className="w-4 h-4" />;
      case 'safe':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2" style={{ width: '300px' }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            relative p-4 rounded-lg shadow-lg border
            transform transition-all duration-300 ease-in-out
            ${getToastStyles(toast.type)}
          `}
          style={{
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getToastIcon(toast.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-1">
                {toast.title}
              </div>
              <div className="text-xs opacity-90 break-words">
                {toast.message}
              </div>
              <div className="text-xs opacity-75 mt-1">
                {toast.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
