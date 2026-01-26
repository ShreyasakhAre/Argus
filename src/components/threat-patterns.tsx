'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Eye, Activity } from 'lucide-react';
import type { ThreatPattern } from '@/lib/mock-data';

const severityColors = {
  Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusColors = {
  Active: 'bg-red-500',
  Monitoring: 'bg-yellow-500',
  Resolved: 'bg-green-500',
};

export function ThreatPatterns() {
  const [patterns, setPatterns] = useState<ThreatPattern[]>([]);

  useEffect(() => {
    fetch('/api/threats')
      .then(r => r.json())
      .then(d => setPatterns(d.patterns));
  }, []);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-500" />
          Threat Patterns Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            className={`p-4 rounded-lg border ${severityColors[pattern.severity]} bg-opacity-10`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-semibold">{pattern.name}</span>
                  <Badge className={severityColors[pattern.severity]}>
                    {pattern.severity}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${statusColors[pattern.status]}`} />
                    <span className="text-xs text-zinc-400">{pattern.status}</span>
                  </div>
                </div>
                <p className="text-sm text-zinc-400 mb-2">{pattern.description}</p>
                <div className="flex flex-wrap gap-1">
                  {pattern.indicators.map((ind, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-white">
                  <Eye className="w-4 h-4" />
                  <span className="font-bold text-lg">{pattern.detectedCount}</span>
                </div>
                <span className="text-xs text-zinc-500">detections</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
