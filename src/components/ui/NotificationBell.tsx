"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

/* ===============================
   🔊 Load critical alert sound ONCE
================================ */
const criticalSound =
  typeof Audio !== "undefined"
    ? new Audio("/sounds/pop-up.mp3")
    : null;

/* ===============================
   🔓 Unlock sound (browser rule)
================================ */
const enableSound = () => {
  criticalSound?.play().catch(() => {});
  criticalSound?.pause();
  if (criticalSound) criticalSound.currentTime = 0;
};

function formatTimeAgo(ts: string | number): string {
  const diff = Date.now() - new Date(ts).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  /* ===============================
     📥 Load notifications from DB
  ================================ */
  const loadNotifications = async () => {
    const res = await fetch("/api/notifications");
    const data = await res.json();

    setNotifications(data.notifications || []);
    setUnread(data.unreadCount || 0);
  };

  /* ===============================
     ⚡ Real-time updates (window event)
  ================================ */
  useEffect(() => {
    loadNotifications();

    const handler = (e: any) => {
      const data = e.detail;

      if (data?.type === "new") {
        setNotifications((prev) => [data.notification, ...prev]);
        setUnread((c) => c + 1);

        // 🔊 sound ONLY for critical
        if (data.notification?.severity === "critical") {
          criticalSound?.play().catch(() => {});
        }
      }
    };

    window.addEventListener("new_alert", handler as EventListener);

    return () =>
      window.removeEventListener("new_alert", handler as EventListener);
  }, []);

  /* ===============================
     ✅ Mark notification as read
  ================================ */
  const markRead = async (id: string) => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setNotifications((prev) =>
      prev.map((n) =>
        n._id === id ? { ...n, read: true } : n
      )
    );

    setUnread((c) => Math.max(0, c - 1));
  };

    /* Only render latest 50 in the dropdown for performance */
    const visible = notifications.slice(0, 50);

    return (
      <div className="relative">
        {/* 🔔 Bell Button */}
        <button
          onClick={() => {
            enableSound(); // 🔓 unlock audio
            setOpen((o) => !o);
          }}
          className="relative"
        >
          <Bell className="w-6 h-6 text-white" />

          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-xs px-1 rounded-full text-white">
              {unread}
            </span>
          )}
        </button>

        {/* 🔽 Dropdown */}
        {open && (
          <div
            className="absolute right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-50 flex flex-col"
            style={{ width: "min(22rem, calc(100vw - 2rem))", maxHeight: "380px" }}
          >
            <div className="px-4 py-2.5 border-b border-zinc-700 flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold text-zinc-200">Notifications</span>
              {notifications.length > 50 && (
                <span className="text-xs text-zinc-500">{notifications.length} total</span>
              )}
            </div>

            <div className="overflow-y-auto flex-1 overscroll-contain">
              {visible.length === 0 && (
                <div className="p-4 text-gray-400 text-sm">No notifications</div>
              )}

              {visible.map((n, i) => (
                <div
                  key={n._id}
                  onClick={() => !n.read && markRead(n._id)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    n.read
                      ? "opacity-50"
                      : "bg-zinc-800/60 hover:bg-zinc-700/80"
                  } ${i < visible.length - 1 ? "border-b border-zinc-800" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm text-zinc-100 leading-snug">{n.title}</div>
                    {!n.read && (
                      <span className="mt-1 shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.message}</div>
                  {n.timestamp && (
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {formatTimeAgo(n.timestamp)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <a
              href="/notifications"
              className="block text-center text-xs text-zinc-400 hover:text-zinc-200 py-2 border-t border-zinc-700 shrink-0 transition-colors"
            >
              View all notifications
            </a>
          </div>
        )}
      </div>
    );
}
