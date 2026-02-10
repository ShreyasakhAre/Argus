"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  AlertCircle,
  Info,
  X,
  Trash2,
  CheckCircle2,
  ShieldBan,
  VolumeX,
  ArrowUpRight,
} from "lucide-react";
import { SeverityBadge, SeverityIndicator } from "@/components/ui/severity-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationSeverity } from "@/lib/types";
import { useAuth } from "./auth-provider";

/** Roles that can acknowledge alerts (matches DEFAULT_ROLE_PERMISSIONS) */
const ACKNOWLEDGE_ROLES = new Set(['admin', 'fraud_analyst', 'department_head', 'employee']);

interface Notification {
  _id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp?: string;
  createdAt?: string;
  read?: boolean;
  category?: string;
  risk_level?: string;
  is_flagged?: boolean;
}

/** "Not Safe" = Medium/High risk OR flagged */
function isNotSafe(n: Notification): boolean {
  if (n.is_flagged) return true;
  if (n.risk_level === 'Medium' || n.risk_level === 'High') return true;
  // Also consider severity mapping: critical/high severity = not safe
  if (n.severity === 'critical' || n.severity === 'high') return true;
  return false;
}

const severityIcons = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: AlertTriangle,
  safe: Check,
};

const severityColors = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  safe: "text-green-400",
};

const getSeverityStyles = (severity: NotificationSeverity) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-900/20 border-l-4 border-red-500 text-red-100';
    case 'high':
      return 'bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-100';
    case 'medium':
      return 'bg-blue-900/20 border-l-4 border-blue-500 text-blue-100';
    case 'safe':
      return 'bg-green-900/20 border-l-4 border-green-500 text-green-100';
    default:
      return 'bg-gray-900/20 border-l-4 border-gray-500 text-gray-100';
  }
};

const getSeverityIcon = (severity: NotificationSeverity) => {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'safe':
      return '✅';
    default:
      return '⚪';
  }
};

export default function NotificationsFeed() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const handlerRef = useRef<((e: Event) => void) | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null);

  const userCanAcknowledge = !!(user && ACKNOWLEDGE_ROLES.has(user.role));

  // Toggle individual selection (only not-safe items)
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Select all not-safe currently rendered notifications
  const selectAllNotSafe = useCallback(() => {
    const notSafeIds = notifications.filter(isNotSafe).map((n) => n._id);
    setSelectedIds(new Set(notSafeIds));
  }, [notifications]);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const notSafeCount = notifications.filter(isNotSafe).length;
  const allNotSafeSelected = notSafeCount > 0 && selectedIds.size === notSafeCount;
  const someSelected = selectedIds.size > 0;

  // Bulk action handler (UI-only, no API calls)
  const handleBulkAction = useCallback((action: string) => {
    const count = selectedIds.size;
    setBulkActionFeedback(`${action}: ${count} notification${count !== 1 ? 's' : ''} processed`);
    setSelectedIds(new Set());
    setTimeout(() => setBulkActionFeedback(null), 3000);
  }, [selectedIds]);

  const updateUnreadCount = useCallback((notifs: Notification[]) => {
    const count = notifs.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      let url = "/api/notifications?limit=100&flagged_only=true";
      if (filter === 'unread') {
        url += '&unreadOnly=true';
      } else if (filter === 'critical') {
        url += '&risk_level=High';
      }
      
      const res = await fetch(url);
      const data = await res.json();
      const rawNotifs = data.notifications || [];
      
      // Transform ml-service notifications to system notification format
        const notifs = rawNotifs.map((n: any) => ({
          _id: n.notification_id,
          title: `${n.risk_level} Risk: ${n.source_app} from ${n.sender.split('@')[0]}`,
          message: n.content,
          severity: n.risk_level === 'High' ? 'critical' : n.risk_level === 'Medium' ? 'high' : 'medium',
          timestamp: n.timestamp,
          createdAt: n.timestamp,
          read: false,
          category: n.source_app,
          risk_level: n.risk_level,
          is_flagged: n.is_flagged,
        }));
      
      setNotifications(notifs);
      updateUnreadCount(notifs);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, filter]);

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => {
        const updated = prev.map((n) => (n._id === id ? { ...n, read: true } : n));
        updateUnreadCount(updated);
        return updated;
      });
      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("notification-read", {
          detail: { type: "read", notification: { _id: id } },
        })
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => {
        const updated = prev.filter((n) => n._id !== id);
        updateUnreadCount(updated);
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }, []);

  const formatTime = useCallback((timestamp?: string) => {
    if (!timestamp) return "just now";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  }, []);

  // Browser event listener (single source of truth)
  useEffect(() => {
    handlerRef.current = (e: Event) => {
      const event = e as CustomEvent;
      const { type, notification, severity } = event.detail;

      console.log("📢 NotificationsFeed received event:", { type, notification, severity });

      if (type === "new" && notification) {
        const newNotif: Notification = {
          _id: notification._id || `temp-${Date.now()}`,
          title: notification.title || "Alert",
          message: notification.message || "",
          severity: severity || notification.severity || "medium",
          timestamp: notification.timestamp || new Date().toISOString(),
          read: false,
        };

        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }
    };

    window.addEventListener("fraud-alert", handlerRef.current);

    return () => {
      if (handlerRef.current) {
        window.removeEventListener("fraud-alert", handlerRef.current);
      }
    };
  }, []);

  // Load notifications on mount and filter change
  useEffect(() => {
    load();
  }, [load, user, filter]);

    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-xs rounded-full font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <CardTitle className="text-base">
                  Live Notifications
                </CardTitle>
                <p className="text-xs text-slate-400">Real-time activity feed</p>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Filter buttons */}
        <div className="flex gap-2 px-4 py-2 border-b border-slate-700">
          {(['all', 'unread', 'critical'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Select All Not Safe + explainability */}
        {notifications.length > 0 && userCanAcknowledge && (
          <div className="px-4 py-2 border-b border-slate-700 space-y-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allNotSafeSelected}
                onChange={() => allNotSafeSelected ? deselectAll() : selectAllNotSafe()}
                className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 accent-red-500"
              />
              <span className="text-xs font-medium text-slate-200">
                Select all not-safe notifications
              </span>
              {notSafeCount > 0 && (
                <span className="text-[10px] text-slate-500">({notSafeCount})</span>
              )}
            </label>
            <p className="text-[10px] text-slate-500 pl-5.5">
              Bulk actions are restricted to risky notifications only
            </p>
          </div>
        )}

        {/* Bulk Action Bar */}
        {someSelected && userCanAcknowledge && (
          <div className="px-4 py-2 border-b border-slate-700 bg-red-950/30 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-300 mr-1">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => handleBulkAction('Block Sender')}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-900/50 hover:bg-red-900/80 text-red-300 rounded transition-colors"
            >
              <ShieldBan className="w-3 h-3" />
              Block Sender
            </button>
            <button
              onClick={() => handleBulkAction('Mute Domain')}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-900/50 hover:bg-orange-900/80 text-orange-300 rounded transition-colors"
            >
              <VolumeX className="w-3 h-3" />
              Mute Domain
            </button>
            <button
              onClick={() => handleBulkAction('Escalate')}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-900/50 hover:bg-purple-900/80 text-purple-300 rounded transition-colors"
            >
              <ArrowUpRight className="w-3 h-3" />
              Escalate
            </button>
            <button
              onClick={deselectAll}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Bulk action feedback toast */}
        {bulkActionFeedback && (
          <div className="px-4 py-1.5 bg-green-950/40 border-b border-green-800/40 text-xs text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {bulkActionFeedback}
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-lg bg-slate-800/50 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">No alerts</p>
              <p className="text-slate-500 text-xs">Activity will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 px-4 py-2">
              {notifications.map((notification) => {
                const notSafe = isNotSafe(notification);
                const isSelected = selectedIds.has(notification._id);

                return (
                  <div
                    key={notification._id}
                    className={`
                      group relative p-3 rounded-lg border transition-all duration-300
                      ${getSeverityStyles(notification.severity)}
                      ${isSelected ? 'ring-1 ring-red-500/60 bg-red-950/20' : ''}
                      ${!notSafe ? 'opacity-60' : ''}
                    `}
                  >
                    {/* Content */}
                    <div className="flex items-start gap-2">
                      {/* Checkbox for not-safe items */}
                      {userCanAcknowledge && (
                        <div className="mt-1 flex-shrink-0">
                          {notSafe ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(notification._id)}
                              className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 accent-red-500 cursor-pointer"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              disabled
                              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 opacity-30 cursor-not-allowed"
                            />
                          )}
                        </div>
                      )}
                      <span className="text-lg mt-0.5 flex-shrink-0">
                        {getSeverityIcon(notification.severity)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {notification.title}
                        </h3>
                        <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <span>{formatTime(notification.timestamp || notification.createdAt)}</span>
                          {notification.category && (
                            <span className="capitalize px-1.5 py-0.5 bg-gray-900/50 rounded">
                              {notification.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-900/40 hover:bg-green-900/60 text-green-300 rounded transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded transition-colors ml-auto"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    );
  }

