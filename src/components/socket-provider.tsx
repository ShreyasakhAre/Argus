"use client";

import { useEffect, useState } from "react";
import { initSocketConnection, getSocketInstance } from "@/lib/socket";

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = initSocketConnection();
    setSocket(socketInstance);

    const handleConnect = () => {
      console.log("[SocketProvider] Connected to socket");
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("[SocketProvider] Disconnected from socket");
      setIsConnected(false);
    };

    const handleConnectError = (error: any) => {
      console.error("[SocketProvider] Connection error:", error);
      setIsConnected(false);
    };

    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    socketInstance.on("connect_error", handleConnectError);

    // Auto-connect
    socketInstance.connect();

    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("disconnect", handleDisconnect);
      socketInstance.off("connect_error", handleConnectError);
    };
  }, []);

  return (
    <div className="socket-provider">
      {children}
    </div>
  );
}
