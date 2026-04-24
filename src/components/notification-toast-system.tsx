'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/components/role-provider';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  X,
  Eye,
  Mail,
  MessageSquare,
  Users,
  Building,
  DollarSign,
  Smartphone
} from 'lucide-react';
import type { NotificationEventPayload, NotificationSeverity } from '@/lib/types';
import type { Notification, SourceApp } from '@/lib/ml-service';

interface ToastNotification {
  id: string;
  notification: Notification;
  severity: NotificationSeverity;
  timestamp: Date;
  isPaused: boolean;
}

interface NotificationToastSystemProps {
  className?: string;
}

const sourceAppIcons: Record<string, React.ReactNode> = {
  'Email': <Mail className="w-3 h-3" />,
  'Slack': <MessageSquare className="w-3 h-3" />,
  'Microsoft Teams': <Users className="w-3 h-3" />,
  'HR Portal': <Building className="w-3 h-3" />,
  'Finance System': <DollarSign className="w-3 h-3" />,
  'Internal Mobile App': <Smartphone className="w-3 h-3" />,
};

export function NotificationToastSystem({ className }: NotificationToastSystemProps) {
  const { role } = useRole();
  const { user } = useAuth();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Get severity color
  const getSeverityColor = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'safe': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Shield className="w-4 h-4" />;
      case 'safe':
        return <Shield className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Check if notification is relevant for user role
  const isNotificationRelevant = useCallback((payload: NotificationEventPayload) => {
    if (!user || !payload.recipients) return true;

    // Check if notification is for specific roles
    if (payload.recipients.roles && payload.recipients.roles.length > 0) {
      return payload.recipients.roles.includes(role);
    }

    // Check if notification is for specific users
    if (payload.recipients.userIds && payload.recipients.userIds.length > 0) {
      return payload.recipients.userIds.includes(user.email);
    }

    // Check if notification is for specific departments
    if (payload.recipients.departmentIds && payload.recipients.departmentIds.length > 0) {
      return user.departmentId && payload.recipients.departmentIds.includes(user.departmentId);
    }

    return true;
  }, [user, role]);

  // Listen to centralized notification events from NotificationProvider.
  useEffect(() => {
    const onNewAlert = (event: Event) => {
      const customEvent = event as CustomEvent;
      const payload = customEvent.detail as NotificationEventPayload;

      if (!payload || !isNotificationRelevant(payload)) return;

      const notificationSource = payload.notification as any;
      const notification = ((notificationSource?.notification || notificationSource || {}) as Notification);
      const newToast: ToastNotification = {
        id: Math.random().toString(36).slice(2, 11),
        notification,
        severity: payload.severity || 'medium',
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        isPaused: false,
      };

      // Keep one active toast to avoid blocking layouts.
      setToasts([newToast]);
    };

    window.addEventListener('new_alert', onNewAlert as EventListener);

    return () => {
      window.removeEventListener('new_alert', onNewAlert as EventListener);
    };
  }, [isNotificationRelevant]);

  // Auto-dismiss toasts after 6 seconds (if not paused)
  useEffect(() => {
    const interval = setInterval(() => {
      setToasts(prev => 
        prev.filter(toast => {
          if (toast.isPaused) return true;
          
          const age = Date.now() - toast.timestamp.getTime();
          return age < 6000; // 6 seconds
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Remove toast manually
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Navigate to notification detail
  const navigateToNotification = useCallback((notification: Notification) => {
    // This would typically use router navigation
    console.log('Navigate to notification:', notification.notification_id);
    removeToast(notification.notification_id);
  }, [removeToast]);

  // Pause/resume toast on hover
  const togglePause = useCallback((id: string, isPaused: boolean) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id ? { ...toast, isPaused } : toast
      )
    );
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm max-h-96 overflow-hidden pointer-events-none ${className || ''}`}>
      <div className="space-y-2 pointer-events-auto">
        {toasts.slice(0, 1).map((toast) => (
          <div
            key={toast.id}
            className={`
              bg-slate-900/95 backdrop-blur-sm border rounded-lg shadow-lg p-3
              transition-all duration-300 transform hover:scale-[1.02]
              max-w-xs pointer-events-auto
              ${toast.isPaused ? 'opacity-70 scale-95' : 'opacity-100'}
              ${getSeverityColor(toast.severity)}
            `}
            onMouseEnter={() => togglePause(toast.id, true)}
            onMouseLeave={() => togglePause(toast.id, false)}
          >
            <div className="flex items-start gap-2">
              {/* Icon */}
              <div className={`p-1.5 rounded border flex-shrink-0 ${getSeverityColor(toast.severity)}`}>
                {getSeverityIcon(toast.severity)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <Badge className={`text-xs px-1.5 py-0.5 ${getSeverityColor(toast.severity)}`}>
                    {toast.severity.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-zinc-400" />
                    <span className="text-xs text-zinc-400">
                      {new Date(toast.timestamp).toLocaleTimeString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeToast(toast.id)}
                      className="h-5 w-5 p-0 text-zinc-400 hover:text-white"
                    >
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  {/* Sender and Source */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-zinc-300 font-medium truncate">
                      {toast.notification.sender || 'Unknown'}
                    </span>
                    {toast.notification.source_app && (
                      <div className="flex items-center gap-0.5">
                        {sourceAppIcons[toast.notification.source_app]}
                        <span className="text-xs text-zinc-400">
                          {toast.notification.source_app}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Preview */}
                  <p className="text-xs text-zinc-300 line-clamp-2">
                    {toast.notification.content || 'New notification'}
                  </p>
                </div>

                {/* Action Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToNotification(toast.notification)}
                  className="w-full mt-1.5 border-zinc-600 hover:bg-zinc-800 text-xs h-6"
                >
                  <Eye className="w-2.5 h-2.5 mr-1" />
                  View
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
