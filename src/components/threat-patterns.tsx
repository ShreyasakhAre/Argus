'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Eye, Activity } from 'lucide-react';
import type { ThreatPattern } from '@/lib/mock-data';
import api from '@/lib/api';

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

function resolveSeverityClass(severity?: string) {
  if (!severity) return severityColors.Medium;
  const normalized = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
  return severityColors[normalized as keyof typeof severityColors] || severityColors.Medium;
}

function resolveStatusClass(status?: string) {
  if (!status) return statusColors.Monitoring;
  const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return statusColors[normalized as keyof typeof statusColors] || statusColors.Monitoring;
}

export function ThreatPatterns() {
  const [patterns, setPatterns] = useState<ThreatPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get<any>('/api/threats');
        const source = Array.isArray(response?.patterns)
          ? response.patterns
          : Array.isArray(response?.data?.patterns)
            ? response.data.patterns
            : [];

        if (!mounted) return;
        setPatterns(
          source.map((item: any, index: number) => ({
            id: item.id || `${item.name || 'pattern'}-${index}`,
            name: item.name || item.type || 'Unknown threat',
            description: item.description || 'Derived threat pattern from dataset analysis.',
            severity: item.severity || 'Medium',
            status: item.status || 'Active',
            indicators: Array.isArray(item.indicators) ? item.indicators : [],
            detectedCount: Number(item.detectedCount || item.count || 0),
          }))
        );
        setError('');
      } catch (err: any) {
        if (!mounted) return;
        setPatterns([]);
        setError(err?.message || 'Failed to load threat patterns');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
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
        {loading && (
          <div className="text-sm text-zinc-400">Loading threat patterns...</div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-400">{error}</div>
        )}

        {!loading && !error && patterns.length === 0 && (
          <div className="text-sm text-zinc-400">No threat patterns available.</div>
        )}

        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            className={`p-4 rounded-lg border ${resolveSeverityClass(pattern.severity)} bg-opacity-10`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-semibold">{pattern.name}</span>
                  <Badge className={resolveSeverityClass(pattern.severity)}>
                    {pattern.severity}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${resolveStatusClass(pattern.status)}`} />
                    <span className="text-xs text-zinc-400">{pattern.status}</span>
                  </div>
                </div>
                <p className="text-sm text-zinc-400 mb-2">{pattern.description}</p>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(pattern.indicators) ? pattern.indicators : []).map((ind, i) => (
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
