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
  const [socket, setSocket] = useState<any>(null);

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

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_URL || "https://argus-backend.onrender.com", {
          transports: ['websocket', 'polling']
        });

        socketInstance.on('connect', () => {
          console.log('🟢 Connected to notification server');
        });

        socketInstance.on('disconnect', () => {
          console.log('🔴 Disconnected from notification server');
        });

        socketInstance.on('new_alert', (payload: NotificationEventPayload) => {
          if (isNotificationRelevant(payload)) {
            const newToast: ToastNotification = {
              id: Math.random().toString(36).substr(2, 9),
              notification: payload.notification as Notification,
              severity: payload.severity,
              timestamp: new Date(payload.timestamp),
              isPaused: false
            };

            setToasts(prev => {
              const updated = [newToast, ...prev];
              return updated.slice(0, 4); // Limit to 4 toasts
            });
          }
        });

        setSocket(socketInstance);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
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
    <div className={`fixed bottom-4 right-4 z-50 space-y-3 ${className}`}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg
            w-96 max-w-sm p-4 transform transition-all duration-300
            hover:scale-105 hover:shadow-xl
            ${toast.isPaused ? 'scale-105' : ''}
          `}
          onMouseEnter={() => togglePause(toast.id, true)}
          onMouseLeave={() => togglePause(toast.id, false)}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`p-2 rounded-lg border ${getSeverityColor(toast.severity)}`}>
              {getSeverityIcon(toast.severity)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <Badge className={getSeverityColor(toast.severity)}>
                  {toast.severity.toUpperCase()}
                </Badge>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span className="text-xs text-zinc-400">
                    {new Date(toast.timestamp).toLocaleTimeString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeToast(toast.id)}
                    className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {/* Sender and Source */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-300 font-medium">
                    {toast.notification.sender || 'Unknown'}
                  </span>
                  {toast.notification.source_app && (
                    <div className="flex items-center gap-1">
                      {sourceAppIcons[toast.notification.source_app]}
                      <span className="text-xs text-zinc-400">
                        {toast.notification.source_app}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Preview */}
                <p className="text-sm text-zinc-300 line-clamp-2">
                  {toast.notification.content || 'New notification'}
                </p>

                {/* Action Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToNotification(toast.notification)}
                  className="w-full mt-2 border-zinc-600 hover:bg-zinc-800 text-xs"
                >
                  <Eye className="w-3 h-3 mr-2" />
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
