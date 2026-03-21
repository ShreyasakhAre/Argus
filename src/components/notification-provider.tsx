"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";

let socketInstance: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;

/**
 * Initialize Socket.IO connection with robust reconnection handling
 * Ensures only one connection exists across the app
 */
function initializeSocket(): Socket {
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_URL || "https://argus-backend.onrender.com", { transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: RECONNECT_DELAY,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    transports: ["websocket", "polling"],
  });

  // Connection handlers
  socketInstance.on("connect", () => {
    console.log("✅ Socket connected:", socketInstance?.id);
    reconnectAttempts = 0;
  });

  socketInstance.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
    if (reason === "io server disconnect") {
      // Server disconnected, attempt reconnect
      setTimeout(() => {
        socketInstance?.connect();
      }, RECONNECT_DELAY);
    }
  });

  socketInstance.on("connect_error", (error) => {
    console.error("⚠️ Socket connection error:", error);
    reconnectAttempts++;
  });

  // Main new_alert listener
  socketInstance.on("new_alert", (data) => {
    console.log("🔔 SOCKET EVENT:", data);
    dispatchNotificationEvent(data);
  });

  return socketInstance;
}

/**
 * Dispatch browser event for new_alert
 * This is the single source of truth for all notification listeners
 */
export function dispatchNotificationEvent(data: any) {
  const eventData = {
    type: data.type || "new", // "new", "acknowledged", etc.
    notification: data || data,
    severity: data?.severity || data.severity || "medium",
    timestamp: new Date(),
  };

  // Dispatch browser event (single source of truth)
  window.dispatchEvent(
    new CustomEvent("new_alert", { detail: eventData })
  );

  // Show toast based on severity and type
  showNotificationToast(eventData);

  // Play sound for critical notifications
  if (eventData.severity === "critical") {
    playCriticalSound();
  }
}

/**
 * Show toast notification with severity-based styling
 */
function showNotificationToast(data: any) {
  const { notification, severity, type } = data;

  if (type === "acknowledged") {
    toast.success("✓ Alert acknowledged", { duration: 4000 });
    return;
  }

  const message = notification?.message || notification?.title || "New alert";
  const toastOptions = { duration: 6000, position: "top-right" as const };

  switch (severity) {
    case "critical":
      toast.error(`🔴 CRITICAL: ${message}`, {
        ...toastOptions,
        duration: 8000,
      });
      break;
    case "high":
      toast(
        (t) => (
          <div className="flex items-center gap-2">
            <span className="text-lg">🟠</span>
            <span>{message}</span>
          </div>
        ),
        {
          ...toastOptions,
          className: "!bg-yellow-900/80 !text-yellow-100 !border-yellow-700",
        }
      );
      break;
    case "medium":
      toast(
        (t) => (
          <div className="flex items-center gap-2">
            <span className="text-lg">🟡</span>
            <span>{message}</span>
          </div>
        ),
        {
          ...toastOptions,
          className: "!bg-gray-700/80 !text-gray-100 !border-gray-600",
        }
      );
      break;
    case "safe":
      toast(
        (t) => (
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span>{message}</span>
          </div>
        ),
        {
          ...toastOptions,
          className: "!bg-green-900/80 !text-green-100 !border-green-700",
        }
      );
      break;
  }
}

/**
 * Play sound for critical alerts
 */
function playCriticalSound() {
  try {
    // First try to load from file
    const audio = new Audio("/sounds/critical-alert.mp3");
    audio.volume = 0.8;
    audio.play().catch(() => {
      // Fallback to Web Audio API sine wave
      generateBeep();
    });
  } catch (err) {
    // Fallback to Web Audio API
    generateBeep();
  }
}

/**
 * Generate a beep sound using Web Audio API as fallback
 * Creates a triple beep pattern for critical alerts
 */
function generateBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;

    // Create 3 rapid beeps
    for (let i = 0; i < 3; i++) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.frequency.value = 800 + i * 100; // Rising frequency
      osc.type = 'sine';

      const startTime = now + i * 0.2;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }
  } catch (err) {
    console.log("Audio context not available:", err);
  }
}

/**
 * Notification Provider Component
 * Initializes Socket.IO connection and ensures it stays alive
 */
export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initRef = useRef(false);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Only initialize once
    if (!initRef.current) {
      initializeSocket();
      initRef.current = true;
      console.log("🚀 NotificationProvider initialized");

      // Start streaming notifications from the dataset
      streamTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/notifications/stream`);
          const data = await res.json();
          const batch = datas || [];

          for (const notif of batch) {
            dispatchNotificationEvent({
              type: "new",
              notification: notif,
              severity: notif.severity || "medium",
            });
          }
        } catch (err) {
          // Silently ignore stream errors
        }
      }, 8000); // Emit one notification every 8 seconds
    }

    // Cleanup on unmount
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      if (socketInstance) {
        console.log("🧹 Cleaning up Socket.IO connection");
        socketInstance.disconnect();
        socketInstance = null;
      }
    };
  }, []);

  // Keep connection alive on focus
  useEffect(() => {
    const handleFocus = () => {
      if (socketInstance && !socketInstance.connected) {
        console.log("🔄 Reconnecting on focus...");
        socketInstance.connect();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  return <>{children}</>;
}

/**
 * Export socket instance for use in other parts of the app
 */
export function getSocket(): Socket | null {
  return socketInstance;
}

/**
 * Manually trigger a reconnection attempt
 */
export function reconnectSocket() {
  if (socketInstance) {
    socketInstance.connect();
  } else {
    initializeSocket();
  }
}
