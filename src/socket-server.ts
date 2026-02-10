import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { NotificationEventPayload } from "./lib/types";

const PORT = 4002;

const httpServer = createServer();

export const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

/**
 * Connection handlers
 */
io.on("connection", (socket: Socket) => {
  console.log("🟢 Client connected:", socket.id);

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });

  // Handle errors
  socket.on("error", (error: any) => {
    console.error("❌ Socket error:", error);
  });
});

// Only start listening if the server isn't already listening
if (!httpServer.listening) {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Socket server running on ${PORT}`);
  }).on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} already in use, reusing existing server`);
    } else {
      console.error('Socket server error:', error);
    }
  });
}

/**
 * EMIT NOTIFICATION WITH METADATA
 * Emits to ALL clients - frontend/providers handle filtering
 * This prevents race conditions and ensures no notifications are missed
 */
export const emitNotification = (payload: NotificationEventPayload) => {
  console.log(`📤 Emitting notification: ${payload.notification.title} (severity: ${payload.severity})`);
  
  // Emit to ALL connected clients
  // Frontend providers filter based on user permissions
  io.emit("fraud-alert", {
    type: payload.type,
    notification: payload.notification,
    severity: payload.severity,
    timestamp: payload.timestamp,
    recipients: payload.recipients,
  });
};

/**
 * LEGACY: Keep for backwards compatibility
 */
export const emitAlert = (payload: any) => {
  console.log(`📤 Emitting alert (legacy):`);
  io.emit("fraud-alert", payload);
};
