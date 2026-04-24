'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';

import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Shield,
  Activity,
  Download,
  Globe,
  Bot,
  BarChart3,
  Bell,
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import NotificationsFeed from '@/components/notifications-feed';
import { AlertPanel } from '@/components/alert-panel';
import { ThreatPatterns } from '@/components/threat-patterns';
import { AnalyticsPanel } from '@/components/analytics-panel';
import { ScannerTools } from '@/components/scanner-tools';
import { AdminRolesPanel } from '@/components/admin-roles-panel';
import { AutonomousAgentPanel } from '@/components/autonomous-agent-panel';
import { AgentActivityLog } from '@/components/agent-activity-log';
import { AdminRiskManagement } from '@/components/admin-risk-management';
import { LiveAttackMap } from '@/components/live-attack-map';
import { PolicyManagement } from '@/components/policy-management';
import { InsightsPanel } from '@/components/insights-panel';
import { SidebarNotifications } from '@/components/common/sidebar-notifications';
import { LiveAlertContainer } from '@/components/live-alert-toast';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import api from '@/lib/api';

type DashboardTab =
  | 'overview'
  | 'agent'
  | 'risk'
  | 'attack-map'
  | 'policies'
  | 'insights'
  | 'threats'
  | 'analytics'
  | 'scanners'
  | 'permissions';

interface Stats {
  totalAlerts: number;
  flagged: number;
  benign: number;
  avgRiskScore?: number;
  high_risk?: number;
  medium_risk?: number;
  low_risk?: number;
  flagged_percentage?: number;
  department_stats?: Record<
    string,
    {
      total: number;
      flagged: number;
      avg_risk: number;
    }
  >;
  model_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    total_samples: number;
    malicious_samples?: number;
    benign_samples?: number;
  };
  feature_importance?: Record<string, number>;
}

interface NotificationItem {
  risk_level?: string;
  timestamp?: string;
}

interface NotificationSummary {
  totalNotifications: number;
  unreadNotifications: number;
  activeNotifications: number;
}

const COLORS = ['#ef4444', '#22c55e'];

export function AdminDashboard() {
  const { user } = useAuth();
  const orgId = user?.orgId || 'ORG001';
  const { alerts, removeAlert } = useRealtimeAlerts();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationSummary, setNotificationSummary] = useState<NotificationSummary>({
    totalNotifications: 0,
    unreadNotifications: 0,
    activeNotifications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    boot();
  }, [orgId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [orgId]);

  // Force refetch after login
  useEffect(() => {
    const handleLoginSuccess = () => {
      console.log('Login success detected, forcing dashboard refetch');
      boot(); // Force immediate refetch
    };

    window.addEventListener('auth_login_success', handleLoginSuccess);
    return () => window.removeEventListener('auth_login_success', handleLoginSuccess);
  }, []);

  const boot = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchNotifications()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      console.log('Fetching stats for all data (no org filter)');
      const resData = await api.get(`/stats${orgId ? `?org_id=${orgId}` : ''}`);
      
      if (resData.success && resData.data) {
        setStats(resData.data);
        console.log('Stats loaded:', resData.data);
      }
      setError('');
    } catch (err: any) {
      console.error('Fetch stats error:', err);
      setError('Failed to load stats');
    }
  };

  const fetchNotifications = async () => {
    try {
      const notificationsData = await api.get('/notifications?limit=10000');

      setNotifications(Array.isArray(notificationsData?.data) ? notificationsData.data : (Array.isArray(notificationsData) ? notificationsData : []));
      setNotificationSummary({
        totalNotifications: notificationsData?.totalCount ?? 0,
        unreadNotifications: notificationsData?.unreadCount ?? 0,
        activeNotifications: notificationsData?.unreadCount ?? 0,
      });
    } catch (err: any) {
      console.error('Fetch notifications error:', err);
    }
  };

  const handleRetrain = async () => {
    try {
      setRetraining(true);
      await api.post('/retrain');
      await fetchStats();
    } finally {
      setRetraining(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const data = await api.get(`/export?format=${format}&org_id=${orgId}`);

    const blob = new Blob([data.content], {
      type: format === 'csv' ? 'text/csv' : 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    a.click();
  };

  const threatVelocity = useMemo(() => {
    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const now = Date.now();

    const current24 = safeNotifications.filter((n) => {
      if (!n?.timestamp) return false;
      const t = new Date(n.timestamp).getTime();
      return now - t <= 24 * 60 * 60 * 1000;
    }).length;

    const previous24 = safeNotifications.filter((n) => {
      if (!n?.timestamp) return false;
      const t = new Date(n.timestamp).getTime();
      const diff = now - t;
      return (
        diff > 24 * 60 * 60 * 1000 &&
        diff <= 48 * 60 * 60 * 1000
      );
    }).length;

    const change =
      previous24 === 0
        ? current24 * 100
        : ((current24 - previous24) / previous24) * 100;

    return {
      current24,
      previous24,
      percentage: change,
      spike: change > 40,
    };
  }, [notifications]);

  if (loading || !stats) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const deptData = Object.entries(stats?.department_stats ?? {}).map(
    ([key, value]) => ({
      department: key,
      total: value.total,
      flagged: value.flagged,
    })
  );

  const pieData = [
    {
      name: 'Flagged',
      value: stats?.flagged ?? 0,
    },
    {
      name: 'Benign',
      value: stats?.benign ?? 0,
    },
  ];

  const trendData = [
    { day: 'Mon', total: 18, flagged: 4 },
    { day: 'Tue', total: 22, flagged: 7 },
    { day: 'Wed', total: 16, flagged: 3 },
    { day: 'Thu', total: 26, flagged: 9 },
    { day: 'Fri', total: 20, flagged: 5 },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-400">
            Enterprise Threat Intelligence Control Center
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSidebarOpen(true)}
            className="relative"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
            {notificationSummary.activeNotifications > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {notificationSummary.activeNotifications > 99 ? '99+' : notificationSummary.activeNotifications}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={boot}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button
            onClick={handleRetrain}
            disabled={retraining}
          >
            <Bot className="w-4 h-4 mr-2" />
            {retraining ? 'Retraining...' : 'Retrain ML'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-5 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          'overview',
          'agent',
          'risk',
          'attack-map',
          'policies',
          'insights',
          'threats',
          'analytics',
          'scanners',
          'permissions',
        ].map((tab) => (
           <button
            key={tab}
            onClick={() =>
              setActiveTab(tab as DashboardTab)
            }
            className={`capitalize pb-2 text-sm ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {/* Threat Velocity */}
          <div
            className={`rounded-xl p-4 border ${
              threatVelocity.spike
                ? 'border-red-500 bg-red-500/10'
                : 'border-cyan-500 bg-cyan-500/10'
            }`}
          >
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">
                  Threat Velocity
                </p>
                <p className="text-sm text-slate-300">
                  24h: {threatVelocity.current24} alerts vs{' '}
                  {threatVelocity.previous24}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {Math.abs(
                  threatVelocity.percentage
                ).toFixed(1)}
                %
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Alerts"
              value={stats?.totalAlerts ?? 0}
              icon={<Activity />}
            />
            <MetricCard
              title="Flagged"
              value={stats?.flagged ?? 0}
              icon={<AlertTriangle />}
            />
            <MetricCard
              title="Benign"
              value={stats?.benign ?? 0}
              icon={<CheckCircle />}
            />
            <MetricCard
              title="Accuracy"
              value={`${Math.round(
                (stats?.model_metrics?.accuracy ?? 0) * 100
              )}%`}
              icon={<Shield />}
            />
          </div>

          {/* Feed */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <NotificationsFeed />
            </div>
            <AlertPanel maxAlerts={5} />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-slate-900 rounded-xl p-4">
              <h3 className="mb-4 font-semibold">
                Detection Trends
              </h3>

              <ResponsiveContainer
                width="100%"
                height={260}
              >
                <AreaChart data={trendData}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    dataKey="total"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.15}
                  />
                  <Area
                    dataKey="flagged"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-900 rounded-xl p-4">
              <h3 className="mb-4 font-semibold">
                Detection Split
              </h3>

              <ResponsiveContainer
                width="100%"
                height={260}
              >
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    outerRadius={80}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Chart */}
          <div className="bg-slate-900 rounded-xl p-4">
            <h3 className="mb-4 font-semibold">
              Department Risk Analysis
            </h3>

            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <BarChart data={deptData}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="total"
                  fill="#3b82f6"
                />
                <Bar
                  dataKey="flagged"
                  fill="#ef4444"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Exports */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleExport('csv')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExport('json')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </>
      )}

      {activeTab === 'agent' && (
        <div className="space-y-4">
          <AutonomousAgentPanel />
          <AgentActivityLog />
        </div>
      )}

      {activeTab === 'risk' && (
        <AdminRiskManagement />
      )}

      {activeTab === 'attack-map' && (
        <LiveAttackMap />
      )}

      {activeTab === 'policies' && (
        <PolicyManagement />
      )}

      {activeTab === 'insights' && (
        <InsightsPanel />
      )}

      {activeTab === 'threats' && (
        <ThreatPatterns />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsPanel />
      )}

      {activeTab === 'scanners' && (
        <ScannerTools />
      )}

      {activeTab === 'permissions' && (
        <AdminRolesPanel />
      )}

      {/* Sidebar Notifications */}
      <SidebarNotifications 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Real-time Alerts */}
      <LiveAlertContainer 
        alerts={alerts} 
        onRemoveAlert={removeAlert} 
      />
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
      <div className="flex justify-between mb-4">
        <div className="text-slate-400 text-sm">
          {title}
        </div>
        <div className="text-cyan-400">{icon}</div>
      </div>

      <div className="text-3xl font-bold">
        {value}
      </div>
    </div>
  );
}