'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRole } from '@/components/role-provider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { AlertTriangle, CheckCircle, Activity, TrendingUp, RefreshCw, Shield, Download, QrCode } from 'lucide-react';
import { AlertPanel } from '@/components/alert-panel';
import { ThreatPatterns } from '@/components/threat-patterns';
import { AnalyticsPanel } from '@/components/analytics-panel';
import { ScannerTools } from '@/components/scanner-tools';
import type { Stats } from '@/lib/ml-service';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export function AdminDashboard() {
  const { orgId } = useRole();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'analytics' | 'scanners'>('overview');

  useEffect(() => {
    fetchStats();
  }, [orgId]);

  const fetchStats = async () => {
    setLoading(true);
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
    setLoading(false);
  };

  const handleRetrain = async () => {
    setRetraining(true);
    await fetch('/api/retrain', { method: 'POST' });
    await fetchStats();
    setRetraining(false);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const res = await fetch(`/api/export?format=${format}&org_id=${orgId}`);
    const data = await res.json();
    const blob = new Blob([data.content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    a.click();
  };

  if (loading || !stats) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const pieData = [
    { name: 'Flagged', value: stats.flagged_notifications },
    { name: 'Benign', value: stats.benign_notifications },
  ];

  const deptData = Object.entries(stats.department_stats).map(([dept, data]) => ({
    department: dept,
    total: data.total,
    flagged: data.flagged,
    risk: Math.round(data.avg_risk * 100),
  }));

  const trendData = [
    { day: 'Mon', flagged: 3, total: 15 },
    { day: 'Tue', flagged: 5, total: 18 },
    { day: 'Wed', flagged: 2, total: 12 },
    { day: 'Thu', flagged: 4, total: 20 },
    { day: 'Fri', flagged: 3, total: 16 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
          <p className="text-muted-foreground">System overview and ML model management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
            <Download className="w-4 h-4 mr-1" /> JSON
          </Button>
          <Button onClick={handleRetrain} disabled={retraining} className="bg-primary hover:bg-primary/90">
            <RefreshCw className={`w-4 h-4 mr-2 ${retraining ? 'animate-spin' : ''}`} />
            {retraining ? 'Retraining...' : 'Retrain Model'}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {(['overview', 'threats', 'analytics', 'scanners'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors flex items-center gap-2 ${
              activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'scanners' && <QrCode className="w-4 h-4" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Notifications</p>
                    <p className="text-3xl font-bold text-foreground">{stats.total_notifications}</p>
                  </div>
                  <Activity className="w-10 h-10 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Flagged</p>
                    <p className="text-3xl font-bold text-red-500">{stats.flagged_notifications}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Benign</p>
                    <p className="text-3xl font-bold text-green-500">{stats.benign_notifications}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Model Accuracy</p>
                    <p className="text-3xl font-bold text-primary">{Math.round(stats.model_metrics.accuracy * 100)}%</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Model Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Precision</p>
                      <p className="text-2xl font-bold text-foreground">{Math.round(stats.model_metrics.precision * 100)}%</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Recall</p>
                      <p className="text-2xl font-bold text-foreground">{Math.round(stats.model_metrics.recall * 100)}%</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">F1 Score</p>
                      <p className="text-2xl font-bold text-foreground">{Math.round(stats.model_metrics.f1_score * 100)}%</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Training Samples</p>
                      <p className="text-2xl font-bold text-foreground">{stats.model_metrics.total_samples}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Fraud Trend (Weekly)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" className="text-muted-foreground" />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="flagged" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Department Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={deptData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="department" className="text-muted-foreground" />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="flagged" fill="#ef4444" name="Flagged" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <AlertPanel maxAlerts={4} />
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Detection Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#22c55e'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm text-muted-foreground">Flagged</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm text-muted-foreground">Benign</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {activeTab === 'threats' && <ThreatPatterns />}
      {activeTab === 'analytics' && <AnalyticsPanel />}
      {activeTab === 'scanners' && <ScannerTools />}
    </div>
  );
}
