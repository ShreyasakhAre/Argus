'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Clock, Target, Shield } from 'lucide-react';
import api from '@/lib/api';

interface Analytics {
  hourlyDistribution: { hour: number; total: number; flagged: number }[];
  weeklyTrend: { week: string; detected: number; falsePositive: number; confirmed: number }[];
  attackVectors: { name: string; value: number }[];
  riskTrend: { date: string; avgRisk: number; maxRisk: number }[];
  summary: {
    avgResponseTime: string;
    detectionRate: string;
    falsePositiveRate: string;
    threatsBlocked: number;
    totalAnalyzed: number;
  };
}

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];

export function AnalyticsPanel() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get<any>('/api/analytics');
        const payload = response?.data || response || {};

        if (!mounted) return;
        setAnalytics({
          hourlyDistribution: Array.isArray(payload.hourlyDistribution) ? payload.hourlyDistribution : [],
          weeklyTrend: Array.isArray(payload.weeklyTrend) ? payload.weeklyTrend : [],
          attackVectors: Array.isArray(payload.attackVectors) ? payload.attackVectors : [],
          riskTrend: Array.isArray(payload.riskTrend) ? payload.riskTrend : [],
          summary: {
            avgResponseTime: payload.summary?.avgResponseTime || 'N/A',
            detectionRate: payload.summary?.detectionRate || '0%',
            falsePositiveRate: payload.summary?.falsePositiveRate || '0%',
            threatsBlocked: Number(payload.summary?.threatsBlocked || 0),
            totalAnalyzed: Number(payload.summary?.totalAnalyzed || 0),
          },
        });
        setError('');
      } catch (err: any) {
        if (!mounted) return;
        setAnalytics({
          hourlyDistribution: [],
          weeklyTrend: [],
          attackVectors: [],
          riskTrend: [],
          summary: {
            avgResponseTime: 'N/A',
            detectionRate: '0%',
            falsePositiveRate: '0%',
            threatsBlocked: 0,
            totalAnalyzed: 0,
          },
        });
        setError(err?.message || 'Failed to load analytics');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-zinc-400">Loading analytics...</div>;
  }

  if (!analytics) return null;

  const attackVectors = analytics?.attackVectors ?? [];
  const weeklyTrend = analytics?.weeklyTrend ?? [];
  const riskTrend = analytics?.riskTrend ?? [];

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Avg Response</span>
            </div>
            <p className="text-2xl font-bold text-white">{analytics?.summary?.avgResponseTime ?? 'N/A'}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs">Detection Rate</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{analytics?.summary?.detectionRate ?? '0%'}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">False Positive</span>
            </div>
            <p className="text-2xl font-bold text-yellow-500">{analytics?.summary?.falsePositiveRate ?? '0%'}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Threats Blocked</span>
            </div>
            <p className="text-2xl font-bold text-cyan-500">{analytics?.summary?.threatsBlocked ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Attack Vectors Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={attackVectors} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {attackVectors.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Weekly Detection Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyTrend}>
                <XAxis dataKey="week" stroke="#71717a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Bar dataKey="confirmed" fill="#ef4444" name="Confirmed" radius={[2, 2, 0, 0]} />
                <Bar dataKey="falsePositive" fill="#22c55e" name="False Positive" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Risk Score Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={riskTrend}>
              <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} />
              <YAxis stroke="#71717a" tick={{ fontSize: 11 }} domain={[0, 1]} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              <Area type="monotone" dataKey="avgRisk" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} name="Avg Risk" />
              <Area type="monotone" dataKey="maxRisk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Max Risk" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
