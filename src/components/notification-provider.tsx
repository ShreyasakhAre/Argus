"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";

let socketInstance: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;
const NOTIFICATION_THROTTLE_MS = 7000; // 7s minimum cadence to prevent UI blocking
let lastNotificationTime = 0;
let queuedNotification: any = null;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize Socket.IO connection with robust reconnection handling
 * Ensures only one connection exists across the app
 */
function initializeSocket(): Socket {
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  const socketUrl = process.env.NODE_ENV === 'development' 
    ? "http://localhost:5000" 
    : process.env.NEXT_PUBLIC_BACKEND_URL || window.location.origin;

  socketInstance = io(socketUrl, {
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
 * Dispatch browser event for new_alert with throttling
 * This is the single source of truth for all notification listeners
 */
function emitNotification(data: any) {
  const eventData = {
    type: data.type || "new", // "new", "acknowledged", etc.
    notification: data,
    severity: data?.severity || data.severity || "medium",
    timestamp: new Date(),
  };

  // Dispatch browser event (single source of truth)
  // Use requestAnimationFrame for better performance
  requestAnimationFrame(() => {
    window.dispatchEvent(
      new CustomEvent("new_alert", { detail: eventData })
    );
  });

  // Show toast based on severity and type (async)
  requestAnimationFrame(() => {
    showNotificationToast(eventData);
  });

  // Play sound for critical notifications (async)
  if (eventData.severity === "critical") {
    requestAnimationFrame(() => {
      playCriticalSound();
    });
  }
}

export function dispatchNotificationEvent(data: any) {
  const now = Date.now();
  const elapsed = now - lastNotificationTime;

  if (elapsed >= NOTIFICATION_THROTTLE_MS) {
    lastNotificationTime = now;
    emitNotification(data);
    return;
  }

  // Keep the latest notification from burst traffic and emit when window opens.
  queuedNotification = data;
  if (throttleTimer) return;

  const remaining = NOTIFICATION_THROTTLE_MS - elapsed;
  throttleTimer = setTimeout(() => {
    throttleTimer = null;
    if (!queuedNotification) return;

    lastNotificationTime = Date.now();
    emitNotification(queuedNotification);
    queuedNotification = null;
  }, remaining);
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

  useEffect(() => {
    // Only initialize once
    if (!initRef.current) {
      initializeSocket();
      initRef.current = true;
      console.log("🚀 NotificationProvider initialized");
    }

    // Cleanup on unmount
    return () => {
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
