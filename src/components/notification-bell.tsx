'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from './auth-provider';

/**
 * Notification Bell Component
 * Shows unread notification count and opens notification feed
 */
export function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial unread count
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        const response = await fetch(`/api/notifications?unreadOnly=true&limit=1`);
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.pagination?.total || 0);
        }
      } catch (error) {
        console.error('Failed to load unread count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUnreadCount();
  }, [user]);

  // Listen for notification events
  useEffect(() => {
    const handleNotificationEvent = (event: any) => {
      const { type } = event.detail || {};
      
      // Increment on new notifications
      if (type === 'new') {
        setUnreadCount((prev) => prev + 1);
      }
      // Decrement when user marks as read
      else if (type === 'read') {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('fraud-alert', handleNotificationEvent);
    window.addEventListener('notification-read', handleNotificationEvent);

    return () => {
      window.removeEventListener('fraud-alert', handleNotificationEvent);
      window.removeEventListener('notification-read', handleNotificationEvent);
    };
  }, []);

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <button
        className="relative p-2 text-gray-400 hover:text-gray-300 transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
