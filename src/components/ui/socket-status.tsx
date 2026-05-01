"use client";

import { useEffect, useState } from "react";
import { getSocketInstance, initSocketConnection } from "@/lib/socket";
import { Activity, AlertCircle, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SocketStatus() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const socket = getSocketInstance() || initSocketConnection();
    if (!socket) return;

    const updateStatus = () => {
      if (socket.connected) {
        setStatus("connected");
      } else {
        setStatus("disconnected");
      }
    };

    updateStatus();

    socket.on("connect", updateStatus);
    socket.on("disconnect", updateStatus);
    socket.on("connect_error", () => setStatus("disconnected"));

    // Latency check (ping/pong)
    const interval = setInterval(() => {
      if (socket.connected) {
        const start = Date.now();
        socket.emit("ping_latency", () => {
          setLatency(Date.now() - start);
        });
      }
    }, 5000);

    return () => {
      socket.off("connect", updateStatus);
      socket.off("disconnect", updateStatus);
      socket.off("connect_error", updateStatus);
      clearInterval(interval);
    };
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-default">
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1.5 px-2 py-0.5 border-none bg-transparent hover:bg-white/5 transition-colors`}
            >
              <div className="relative flex h-2 w-2">
                {status === "connected" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  status === "connected" ? "bg-green-500" : 
                  status === "connecting" ? "bg-yellow-500" : "bg-red-500"
                }`}></span>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                status === "connected" ? "text-green-400" : 
                status === "connecting" ? "text-yellow-400" : "text-red-400"
              }`}>
                {status}
              </span>
              {status === "connected" && latency !== null && (
                <span className="text-[10px] text-muted-foreground border-l border-white/10 pl-1.5 ml-0.5">
                  {latency}ms
                </span>
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-slate-900 border-slate-800 text-slate-200">
          <div className="space-y-1 p-1">
            <div className="flex items-center gap-2 font-medium">
              {status === "connected" ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Socket Stream: {status}</span>
            </div>
            <p className="text-xs text-slate-400">
              {status === "connected" 
                ? "Real-time threat detection active" 
                : "Unable to receive real-time updates"}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
