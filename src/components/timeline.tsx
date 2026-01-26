'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, AlertTriangle, CheckCircle, Eye, ArrowUp, User } from 'lucide-react';
import type { TimelineEvent } from '@/lib/mock-data';

const eventConfig = {
  detected: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500' },
  reviewed: { icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500' },
  approved: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500' },
  rejected: { icon: CheckCircle, color: 'text-yellow-400', bg: 'bg-yellow-500' },
  escalated: { icon: ArrowUp, color: 'text-purple-400', bg: 'bg-purple-500' },
};

interface TimelineProps {
  notificationId?: string;
  maxEvents?: number;
}

export function Timeline({ notificationId, maxEvents = 10 }: TimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [notificationId]);

  const fetchTimeline = async () => {
    const url = notificationId 
      ? `/api/timeline?notification_id=${notificationId}`
      : '/api/timeline';
    const res = await fetch(url);
    const data = await res.json();
    setEvents(data.events.slice(0, maxEvents));
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-8 text-center">
          <History className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-500" />
          Activity Timeline
          {notificationId && (
            <Badge variant="outline" className="ml-2 text-zinc-400">
              {notificationId}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-700" />
          
          <div className="space-y-4">
            {events.map((event, idx) => {
              const config = eventConfig[event.event_type];
              const Icon = config.icon;
              
              return (
                <div key={event.id} className="relative pl-10">
                  <div className={`absolute left-2 w-5 h-5 rounded-full ${config.bg} flex items-center justify-center`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  
                  <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`${config.bg}/20 ${config.color} text-xs`}>
                          {event.event_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs font-mono text-zinc-500">{event.notification_id}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{event.timestamp}</span>
                    </div>
                    
                    <p className="text-sm text-zinc-300">{event.details}</p>
                    
                    {event.actor && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                        <User className="w-3 h-3" />
                        <span>{event.actor}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
