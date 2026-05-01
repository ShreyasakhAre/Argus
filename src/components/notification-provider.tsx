"use client";

import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { getSocketInstance, initSocketConnection } from "@/lib/socket";

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;

/**
 * Initialize Socket.IO connection with robust reconnection handling
 * Ensures only one connection exists across the app
 */
function initializeSocket(): Socket {
  const socketInstance = getSocketInstance() || initSocketConnection();

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

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}

/**
 * Dispatch browser event for new_alert
 * This is the single source of truth for all notification listeners
 */
export function dispatchNotificationEvent(data: any) {
  const eventData = {
    type: data.type || "new", // "new", "acknowledged", etc.
    notification: data.notification || data,
    severity: data?.severity || data.notification?.severity || "medium",
    timestamp: new Date(),
  };

  // Dispatch browser event (single source of truth)
  window.dispatchEvent(
    new CustomEvent("new_alert", { detail: eventData })
  );

  // Play sound for critical notifications
  if (eventData.severity === "critical") {
    playCriticalSound();
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
  }, []);

  // Keep connection alive on focus
  useEffect(() => {
    const handleFocus = () => {
      const socketInstance = getSocketInstance();
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
  return getSocketInstance();
}

/**
 * Manually trigger a reconnection attempt
 */
export function reconnectSocket() {
  const socketInstance = getSocketInstance();
  if (socketInstance) {
    socketInstance.connect();
  } else {
    initializeSocket();
  }
}
