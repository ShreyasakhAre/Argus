'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRole } from '@/components/role-provider';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Activity, TrendingUp, RefreshCw, Shield,
  Download, QrCode, Zap, Users, Target
} from 'lucide-react';
import { AlertPanel } from '@/components/alert-panel';
import { ThreatPatterns } from '@/components/threat-patterns';
import { AnalyticsPanel } from '@/components/analytics-panel';
import { ScannerTools } from '@/components/scanner-tools';
import { AdminRolesPanel } from '@/components/admin-roles-panel';
import { SidebarNav } from '@/components/dashboards/sidebar-nav';
import { AIAgentPanel } from '@/components/dashboards/ai-agent-panel';
import { ModelManagementPanel } from '@/components/dashboards/model-management-panel';
import { PolicyPanel } from '@/components/dashboards/policy-panel';
import { ThreatsPanel } from '@/components/dashboards/threats-panel';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent, PremiumCardFooter } from '@/components/ui/premium-card';
import type { Stats } from '@/lib/ml-service';
import NotificationsFeed from "@/components/notifications-feed";
import { calculateThreatVelocity } from '@/lib/threat-velocity';
import { startRealtimeEmissions } from '@/lib/realtime-emitter';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#06b6d4', '#3b82f6', '#8b5cf6'];

interface StatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  color: 'red' | 'orange' | 'yellow' | 'cyan' | 'blue' | 'purple' | 'green';
}

export function AdminDashboard() {
  const { orgId } = useRole();
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-agent' | 'model-management' | 'policies' | 'threats' | 'live-alerts' | 'analytics' | 'scanners' | 'permissions'>('overview');
  
  // Check if sidebar is already rendered by global layout
  const isStandalone = false; // Admin dashboard uses global layout, so no internal sidebar

  useEffect(() => {
    fetchStats();
    fetchNotifications();
    // Start real-time notifications
    startRealtimeEmissions(7000); // Emit every 7 seconds
  }, [orgId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      
      const text = await res.text();
      if (!text) {
        throw new Error('Empty response from /api/stats');
      }
      
      try {
        const data = JSON.parse(text);
        setStats(data);
      } catch (parseError) {
        console.error('Failed to parse stats JSON:', parseError, 'Text was:', text.substring(0, 100));
        throw new Error('Invalid JSON from /api/stats');
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
      // set dummy stats so it doesn't crash
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?org_id=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data?.notifications || []);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
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
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  const safeStats = stats ?? {
  department_stats: {},
  total_notifications: 0,
  flagged_notifications: 0,
  benign_notifications: 0,
  model_metrics: {
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1_score: 0,
    total_samples: 0
  }
};

  // Calculate threat velocity
  const threatVelocity = calculateThreatVelocity(notifications);

  const pieData = [
    { name: 'Flagged', value: safeStats.flagged_notifications || 0 },
    { name: 'Benign', value: safeStats.benign_notifications || 0 },
  ];

  const deptData = safeStats.department_stats && typeof safeStats.department_stats === 'object' 
    ? Object.entries(safeStats.department_stats).map(([dept, data]) => ({
        department: dept,
        total: data?.total || 0,
        flagged: data?.flagged || 0,
        risk: (((data?.avg_risk ) || 0) > 1 ? Math.round((data?.avg_risk ) || 0) : Math.round(((data?.avg_risk ) || 0) * 100)),
      }))
    : [];

  const trendData = [
    { day: 'Mon', flagged: 3, total: 15, risk: 20 },
    { day: 'Tue', flagged: 5, total: 18, risk: 28 },
    { day: 'Wed', flagged: 2, total: 12, risk: 17 },
    { day: 'Thu', flagged: 4, total: 20, risk: 24 },
    { day: 'Fri', flagged: 3, total: 16, risk: 19 },
  ];

  const statCards: StatCard[] = [
    {
      title: 'Total Notifications',
      value: stats?.total_notifications || 0,
      subtitle: 'All time',
      icon: <Activity className="w-6 h-6" />,
      trend: 12,
      color: 'cyan',
    },
    {
      title: 'Flagged Alerts',
      value: stats?.flagged_notifications || 0,
      subtitle: 'Requires action',
      icon: <AlertTriangle className="w-6 h-6" />,
      trend: -5,
      color: 'red',
    },
    {
      title: 'Benign',
      value: stats?.benign_notifications || 0,
      subtitle: 'Cleared',
      icon: <CheckCircle className="w-6 h-6" />,
      trend: 8,
      color: 'green',
    },
    {
      title: 'Model Accuracy',
      value: `${(((stats?.model_metrics?.accuracy ) || 0) > 1 ? Math.round((stats?.model_metrics?.accuracy ) || 0) : Math.round(((stats?.model_metrics?.accuracy ) || 0) * 100))}%`,
      subtitle: 'Performance',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'blue',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string; text: string; border: string }> = {
      red: { bg: 'bg-red-500/10', icon: 'text-red-400', text: 'text-red-300', border: 'border-red-500/20' },
      orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', text: 'text-orange-300', border: 'border-orange-500/20' },
      yellow: { bg: 'bg-yellow-500/10', icon: 'text-yellow-400', text: 'text-yellow-300', border: 'border-yellow-500/20' },
      cyan: { bg: 'bg-cyan-500/10', icon: 'text-cyan-400', text: 'text-cyan-300', border: 'border-cyan-500/20' },
      blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400', text: 'text-blue-300', border: 'border-blue-500/20' },
      green: { bg: 'bg-green-500/10', icon: 'text-green-400', text: 'text-green-300', border: 'border-green-500/20' },
      purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', text: 'text-purple-300', border: 'border-purple-500/20' },
    };
    return colors[color] || colors.cyan;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950" style={{ width: '100%' }}>
      <div className="space-y-2 w-full" style={{ width: '100%' }}>
          {/* Header */}
          <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                  <p className="text-slate-400">System overview and management</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-800 bg-slate-900/30">
            <div className="px-6">
              <div className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'ai-agent', label: 'AI Agent' },
              { id: 'policies', label: 'Policies' },
              { id: 'threats', label: 'Threats' },
              { id: 'model-management', label: 'Model Management' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'live-alerts', label: 'Live Alerts' },
              { id: 'scanners', label: 'Scanners' },
              { id: 'permissions', label: 'Roles & Permissions' },
            ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Threat Velocity Indicator - Only show on overview tab */}
          {activeTab === 'overview' && (
            <div className={`px-4 py-3 rounded-lg border ${
              threatVelocity.isSpike 
                ? 'bg-red-500/10 border-red-500/30' 
                : threatVelocity.percentageChange < 0 
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    threatVelocity.isSpike 
                      ? 'bg-red-500 animate-pulse' 
                      : threatVelocity.percentageChange < 0 
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${
                      threatVelocity.isSpike 
                        ? 'text-red-400' 
                        : threatVelocity.percentageChange < 0 
                          ? 'text-green-400'
                          : 'text-blue-400'
                    }`}>
                      {threatVelocity.displayText}
                    </p>
                    <p className="text-xs text-slate-400">
                      High-risk alerts: {threatVelocity.current24h} (24h) vs {threatVelocity.previous24h} (prev 24h)
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  threatVelocity.isSpike 
                    ? 'text-red-400' 
                    : threatVelocity.percentageChange < 0 
                      ? 'text-green-400'
                      : 'text-blue-400'
                }`}>
                  {threatVelocity.percentageChange > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4 rotate-180" />
                  )}
                  {Math.abs(threatVelocity.percentageChange).toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics - Only show on overview tab */}
          {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2" style={{ width: '100%' }}>
        {statCards.map((stat, index) => {
          const colors = getColorClasses(stat.color);
          return (
            <PremiumCard key={index} className="group hover-glow" glowColor="cyan">
              <PremiumCardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                      <div className={colors.icon}>{stat.icon}</div>
                    </div>
                    {stat.trend && (
                      <div className={`text-sm font-semibold ${stat.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stat.trend > 0 ? '↑' : '↓'} {Math.abs(stat.trend)}%
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">{stat.title}</p>
                    <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                  </div>
                </div>
              </PremiumCardContent>
            </PremiumCard>
          );
        })}
      </div>
      )}

      {/* Notifications Feed - Only on overview */}
      {activeTab === 'overview' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-2" style={{ width: '100%' }}>
        <div className="lg:col-span-2 space-y-2">
          <NotificationsFeed />
          <ThreatPatterns />
        </div>
        <div>
          <AlertPanel maxAlerts={5} />
        </div>
      </div>
      )}
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-2" style={{ width: '100%' }}>
          {/* Model Metrics */}
          <PremiumCard>
            <PremiumCardHeader>
              <PremiumCardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Model Performance Metrics
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Precision', value: (((stats?.model_metrics?.precision ) || 0) > 1 ? Math.round((stats?.model_metrics?.precision ) || 0) : Math.round(((stats?.model_metrics?.precision ) || 0) * 100)), color: 'cyan' },
                  { label: 'Recall', value: (((stats?.model_metrics?.recall ) || 0) > 1 ? Math.round((stats?.model_metrics?.recall ) || 0) : Math.round(((stats?.model_metrics?.recall ) || 0) * 100)), color: 'orange' },
                  { label: 'F1 Score', value: (((stats?.model_metrics?.f1_score ) || 0) > 1 ? Math.round((stats?.model_metrics?.f1_score ) || 0) : Math.round(((stats?.model_metrics?.f1_score ) || 0) * 100)), color: 'blue' },
                  { label: 'Samples', value: stats?.model_metrics?.total_samples || 0, color: 'purple' },
                ].map((metric, idx) => {
                  const colors = getColorClasses(metric.color);
                  return (
                    <div key={idx} className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
                      <p className="text-sm text-slate-400 mb-2">{metric.label}</p>
                      <p className={`text-2xl font-bold ${colors.text}`}>{metric.value}{metric.label !== 'Samples' ? '%' : ''}</p>
                    </div>
                  );
                })}
              </div>
            </PremiumCardContent>
          </PremiumCard>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2" style={{ width: '100%' }}>
            <div className="lg:col-span-2 space-y-2">
              {/* Trend Chart */}
              <PremiumCard>
                <PremiumCardHeader>
                  <PremiumCardTitle>Fraud Detection Trends</PremiumCardTitle>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorFlagged" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                      <XAxis dataKey="day" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 41, 0.8)',
                          border: '1px solid rgba(0, 212, 255, 0.2)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#f1f5f9' }}
                      />
                      <Area type="monotone" dataKey="flagged" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFlagged)" name="Flagged" />
                      <Area type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total" />
                    </AreaChart>
                  </ResponsiveContainer>
                </PremiumCardContent>
              </PremiumCard>

              {/* Department Statistics */}
              <PremiumCard>
                <PremiumCardHeader>
                  <PremiumCardTitle>Department Risk Analysis</PremiumCardTitle>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={deptData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                      <XAxis dataKey="department" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 41, 0.8)',
                          border: '1px solid rgba(0, 212, 255, 0.2)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#f1f5f9' }}
                      />
                      <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="flagged" fill="#ef4444" name="Flagged" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </PremiumCardContent>
              </PremiumCard>
            </div>

            {/* Distribution Pie Chart */}
            <div className="space-y-2">
              <PremiumCard>
                <PremiumCardHeader>
                  <PremiumCardTitle>Detection Distribution</PremiumCardTitle>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#22c55e'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 41, 0.8)',
                          border: '1px solid rgba(0, 212, 255, 0.2)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#f1f5f9' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-3 mt-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm text-slate-300">Flagged</span>
                      </div>
                      <span className="text-sm font-semibold text-red-400">{stats?.flagged_notifications || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm text-slate-300">Benign</span>
                      </div>
                      <span className="text-sm font-semibold text-green-400">{stats?.benign_notifications || 0}</span>
                    </div>
                  </div>
                </PremiumCardContent>
              </PremiumCard>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content - Additional tabs */}
      {activeTab === 'threats' && <ThreatsPanel />}
      {activeTab === 'ai-agent' && <AIAgentPanel />}
      {activeTab === 'model-management' && <ModelManagementPanel />}
      {activeTab === 'policies' && <PolicyPanel />}
      {activeTab === 'live-alerts' && <AlertPanel showAll />}
      {activeTab === 'analytics' && <AnalyticsPanel />}
      {activeTab === 'scanners' && <ScannerTools />}
      {activeTab === 'permissions' && <AdminRolesPanel />}
      </div>
    </div>
  );
}
