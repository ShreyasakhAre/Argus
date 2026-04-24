'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info, Bell } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'high' | 'medium' | 'low' | 'safe';
  title: string;
  message: string;
  timestamp: Date;
  notification_id?: string;
  threat_category?: string;
}

interface SidebarNotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarNotifications({ isOpen, onClose }: SidebarNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    // Listen to socket events or custom events
    const handleNewNotification = (event: CustomEvent) => {
      const notification = event.detail;
      
      if (!notification) return;

      const newNotification: NotificationItem = {
        id: Math.random().toString(36).substr(2, 9),
        type: notification.risk_level === 'High' ? 'high' : 
              notification.risk_level === 'Medium' ? 'medium' : 
              notification.is_flagged ? 'low' : 'safe',
        title: notification.source_app || 'New Alert',
        message: notification.content?.substring(0, 120) || 'New notification received',
        timestamp: new Date(),
        notification_id: notification.notification_id,
        threat_category: notification.threat_category
      };

      setNotifications(prev => {
        const updated = [newNotification, ...prev];
        // Keep only latest 20 notifications in sidebar
        return updated.slice(0, 20);
      });
    };

    // Listen to custom notification events
    window.addEventListener('new-notification', handleNewNotification as EventListener);
    
    // Also listen to socket events if available
    if (typeof window !== 'undefined' && (window as any).socket) {
      (window as any).socket.on('notification', handleNewNotification);
      (window as any).socket.on('new_alert', (data: any) => {
        if (data.notification) {
          handleNewNotification({ detail: { 
            ...data.notification,
            risk_level: data.severity,
            source_app: 'ARGUS System'
          }} as CustomEvent);
        }
      });
    }

    return () => {
      window.removeEventListener('new-notification', handleNewNotification as EventListener);
      if (typeof window !== 'undefined' && (window as any).socket) {
        (window as any).socket.off('notification', handleNewNotification);
        (window as any).socket.off('new_alert', handleNewNotification);
      }
    };
  }, []);

  const clearAll = () => {
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationStyles = (type: NotificationItem['type']) => {
    switch (type) {
      case 'high':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'low':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'safe':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
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

  const getTypeColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-orange-600 dark:text-orange-400';
      case 'low': return 'text-yellow-600 dark:text-yellow-400';
      case 'safe': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-cyan-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Live Notifications
          </h2>
          <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full">
            {notifications.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAll}
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No new notifications</p>
            <p className="text-sm mt-1">New alerts will appear here</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${getNotificationStyles(notification.type)} transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={getTypeColor(notification.type)}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                      {notification.title}
                    </h4>
                    {notification.threat_category && (
                      <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                        {notification.threat_category}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                {notification.message}
              </p>
              
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{notification.timestamp.toLocaleTimeString()}</span>
                {notification.notification_id && (
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {notification.notification_id.substring(0, 8)}...
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Updates every 30 seconds • Powered by ARGUS AI
        </p>
      </div>
    </div>
  );
}
