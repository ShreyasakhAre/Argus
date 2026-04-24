'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSidebar } from '@/lib/sidebar-context';
import { useRole } from '@/components/role-provider';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

import {
  AlertTriangle,
  Building,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Mail,
  MessageSquare,
  RefreshCw,
  ScanLine,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
} from 'lucide-react';

import type { HeatmapData } from '@/lib/ml-service';
import { DatasetNotification } from '@/lib/types';
import {
  calculateDepartmentSecurityScore,
  formatSecurityScore,
} from '@/lib/security-score';
import { calculateThreatVelocity } from '@/lib/threat-velocity';

import {
  useNotificationBulkSelect,
  SelectAllNotSafeBar,
  BulkActionBar,
  BulkFeedbackToast,
  NotificationCheckbox,
  isNotSafe,
} from '@/components/notification-bulk-actions';

const sourceAppIcons: Record<string, React.ReactNode> = {
  Email: <Mail className="w-4 h-4" />,
  Slack: <MessageSquare className="w-4 h-4" />,
  'Microsoft Teams': <Users className="w-4 h-4" />,
  'HR Portal': <Building className="w-4 h-4" />,
  'Finance System': <DollarSign className="w-4 h-4" />,
  'Internal Mobile App': <Smartphone className="w-4 h-4" />,
};

const sourceAppColors: Record<string, string> = {
  Email: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Slack: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Microsoft Teams': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'HR Portal': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Finance System': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Internal Mobile App': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const getRiskColor = (score: number) => {
  if (score >= 0.7) return '#ef4444';
  if (score >= 0.4) return '#f59e0b';
  return '#22c55e';
};

const getRiskLevel = (score: number) => {
  if (score >= 0.7) return 'High';
  if (score >= 0.4) return 'Medium';
  return 'Low';
};

export function DepartmentHeadDashboard() {
  const { orgId } = useRole();
  const { activeTab: sidebarTab, setActiveTab: setSidebarTab } = useSidebar();

  const activeTab =
    (sidebarTab as 'overview' | 'notifications' | 'heatmap') || 'overview';

  const setActiveTab = (
    tab: 'overview' | 'notifications' | 'heatmap'
  ) => setSidebarTab(tab);

  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [notifications, setNotifications] = useState<DatasetNotification[]>([]);
  const [summary, setSummary] = useState({
    totalAlerts: 0,
    safe: 0,
    suspicious: 0,
    malicious: 0,
    teamRiskScore: 0,
  });
  const [loading, setLoading] = useState(true);

  const [bulkMode, setBulkMode] = useState(false);
  const [safeCollapsed, setSafeCollapsed] = useState(true);

  const [selectedDepartment, setSelectedDepartment] =
    useState<string | null>(null);

  const [showDepartmentsModal, setShowDepartmentsModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerUrl, setScannerUrl] = useState('');
  const [scannerResult, setScannerResult] = useState<string | null>(null);

  const handleScan = async () => {
    if (!scannerUrl) return;
    setScannerResult('Scanning...');
    
    try {
      // Simulate real scanning logic based on URL patterns
      const suspiciousPatterns = [
        /bit\.ly/i,
        /tinyurl/i,
        /shortened/i,
        /free\d*\.\w+/i,
        /secure-?account/i,
        /verify-?now/i,
        /urgent/i,
        /suspended/i,
        /click-?here/i
      ];
      
      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(scannerUrl));
      
      setTimeout(() => {
        if (isSuspicious) {
          setScannerResult('⚠️ Warning: Suspicious URL patterns detected. This link may be malicious.');
        } else {
          setScannerResult('✅ Safe: No obvious malicious patterns detected in the URL.');
        }
      }, 1500);
    } catch (error) {
      setScannerResult('❌ Error: Unable to scan the provided URL.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const [dashboardRes, notificationsRes] = await Promise.all([
        api.get<any>(`/api/dashboards/department-head?org_id=${orgId ?? ''}`),
        api.get<any>(`/api/notifications?org_id=${orgId ?? ''}&limit=1000`),
      ]);

      const dashboardData = dashboardRes?.data ?? dashboardRes;
      const notificationsData = Array.isArray(notificationsRes) ? notificationsRes : (notificationsRes?.data ?? []);
      const dashboardNotifications = Array.isArray(dashboardData?.notifications) ? dashboardData.notifications : [];

      // Debug logs for temporary tracing of zero-state issues.
      console.debug('[department-dashboard] raw dashboard response', dashboardRes);
      console.debug('[department-dashboard] mapped counts', {
        departments: Object.keys(dashboardData?.department_stats || {}).length,
        dashboardNotifications: dashboardNotifications.length,
        notificationsFallback: notificationsData.length,
      });

      setHeatmapData(dashboardData?.department_stats ?? {});
      setNotifications(dashboardNotifications.length > 0 ? dashboardNotifications : notificationsData);
      setSummary({
        totalAlerts: dashboardData?.stats?.totalAlerts || 0,
        safe: dashboardData?.stats?.safe || 0,
        suspicious: dashboardData?.stats?.suspicious || 0,
        malicious: dashboardData?.stats?.malicious || 0,
        teamRiskScore: dashboardData?.stats?.teamRiskScore || 0,
      });
    } catch (error) {
      console.error('Department dashboard fetch error:', error);
      setHeatmapData({});
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (!selectedDepartment) return notifications ?? [];
    return (notifications ?? []).filter(
      (n: DatasetNotification) => n?.department === selectedDepartment
    );
  }, [notifications, selectedDepartment]);

  const notSafeNotifications = (filteredNotifications ?? []).filter(isNotSafe);
  const safeNotifications = (filteredNotifications ?? []).filter(
    (n: DatasetNotification) => !isNotSafe(n)
  );

  const {
    selectedIds,
    notSafeCount,
    allNotSafeSelected,
    toggleSelect,
    selectAllNotSafe,
    deselectAll,
    handleBulkAction,
    feedback,
  } = useNotificationBulkSelect(filteredNotifications ?? []);

  const chartData = useMemo(() => {
    if (!heatmapData) return [];

    return Object.entries(heatmapData ?? {})
      .map(([dept, data]: [string, any]) => ({
        department: dept ?? 'Unknown',
        avgRisk: Math.round((data?.avg_risk ?? 0) * 100),
        flagged: data?.flagged ?? 0,
        total: data?.total ?? 0,
        highRisk: data?.high_risk ?? 0,
        mediumRisk: data?.medium_risk ?? 0,
        lowRisk: data?.low_risk ?? 0,
      }))
      .sort((a, b) => (b?.avgRisk ?? 0) - (a?.avgRisk ?? 0));
  }, [heatmapData]);

  const totalFlagged = (chartData ?? []).reduce(
    (sum, item) => sum + (item?.flagged ?? 0),
    0
  );

  const totalNotifications = summary.totalAlerts || (chartData ?? []).reduce(
    (sum, item) => sum + (item?.total ?? 0),
    0
  );

  const avgRisk =
    (chartData ?? []).length > 0
      ? (chartData ?? []).reduce((sum, item) => sum + (item?.avgRisk ?? 0), 0) /
        (chartData ?? []).length /
        100
      : 0;

  const securityScores = useMemo(() => {
    if (!heatmapData) return [];

    return Object.keys(heatmapData ?? {}).map((dept) => {
      const deptNotifications = (notifications ?? []).filter(
        (n) => n?.department === dept
      );

      const result = calculateDepartmentSecurityScore(
        deptNotifications ?? [],
        [],
        dept
      );

      return {
        department: dept ?? 'Unknown',
        score: result?.score ?? 0,
        formatted: formatSecurityScore(result?.score ?? 0),
      };
    });
  }, [heatmapData, notifications]);

  const threatVelocity = calculateThreatVelocity(notifications ?? []);

  if (loading || !heatmapData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Department Head Dashboard
          </h2>
          <p className="text-zinc-400">
            Department-wise risk visibility for {orgId}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={showScannerModal} onOpenChange={setShowScannerModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ScanLine className="w-4 h-4" />
                Scanner Utility
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-white">Run Security Scan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Target URL, IP, or Payload</label>
                  <input
                    type="text"
                    value={scannerUrl}
                    onChange={(e) => setScannerUrl(e.target.value)}
                    placeholder="Enter indicator to scan..."
                    className="w-full bg-zinc-800 text-white rounded p-2 text-sm border border-zinc-700"
                  />
                </div>
                <Button onClick={handleScan} className="w-full" disabled={!scannerUrl || scannerResult === 'Scanning...'}>
                  {scannerResult === 'Scanning...' ? 'Executing...' : 'Run Scan'}
                </Button>
                {scannerResult && scannerResult !== 'Scanning...' && (
                  <div className={`p-3 rounded text-sm ${
                    scannerResult.includes('⚠️') || scannerResult.includes('❌') 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {scannerResult}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {activeTab === 'notifications' && (
            <div className="flex items-center gap-2">
              <Button
                variant={bulkMode ? 'default' : 'outline'}
                onClick={() => {
                  setBulkMode(!bulkMode);
                  deselectAll();
                }}
              >
                Bulk Mode
              </Button>

              <Badge className="bg-red-500/20 text-red-400">
                {notSafeCount} Not Safe
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Threat Velocity */}
      {activeTab === 'overview' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-white font-medium">
                  {threatVelocity.displayText}
                </p>
                <p className="text-sm text-zinc-400">
                  24h: {threatVelocity.current24h} vs Prev:{' '}
                  {threatVelocity.previous24h}
                </p>
              </div>

              <div className="flex items-center gap-2 text-cyan-400">
                <TrendingUp className="w-4 h-4" />
                {Math.abs(
                  threatVelocity.percentageChange
                ).toFixed(1)}
                %
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        {['overview', 'notifications', 'heatmap'].map((tab) => (
          <button
            key={tab}
            onClick={() =>
              setActiveTab(
                tab as 'overview' | 'notifications' | 'heatmap'
              )
            }
            className={`px-4 py-2 capitalize ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            {/* Departments */}
            <Dialog
              open={showDepartmentsModal}
              onOpenChange={setShowDepartmentsModal}
            >
              <DialogTrigger asChild>
                <Card className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-700">
                  <CardContent className="pt-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-zinc-400 text-sm">
                          Departments
                        </p>
                        <p className="text-3xl text-white font-bold">
                          {chartData.length}
                        </p>
                      </div>
                      <Building2 className="w-10 h-10 text-cyan-500" />
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>

              <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Departments
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                  {chartData.map((dept) => (
                    <div
                      key={dept.department}
                      onClick={() => {
                        setSelectedDepartment(dept.department);
                        setShowDepartmentsModal(false);
                        setActiveTab('notifications');
                      }}
                      className="p-4 rounded-lg bg-zinc-800 cursor-pointer hover:bg-zinc-700"
                    >
                      <div className="flex justify-between mb-2">
                        <span className="text-white font-medium">
                          {dept.department}
                        </span>
                        <Badge>
                          {getRiskLevel(dept.avgRisk / 100)}
                        </Badge>
                      </div>

                      <div className="text-sm text-zinc-400">
                        Total {dept.total} • Flagged {dept.flagged}
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* Cards */}
            <StatCard
              title="Total Notifications"
              value={totalNotifications}
              icon={<Shield className="w-10 h-10 text-blue-500" />}
            />

            <StatCard
              title="Not Safe Alerts"
              value={summary.suspicious + summary.malicious || totalFlagged}
              icon={
                <AlertTriangle className="w-10 h-10 text-red-500" />
              }
            />

            <StatCard
              title="Avg Risk"
              value={`${summary.teamRiskScore || Math.round(avgRisk * 100)}%`}
              icon={
                <TrendingUp
                  className="w-10 h-10"
                  style={{ color: getRiskColor(avgRisk) }}
                />
              }
            />
          </div>

          {/* Security Scores */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">
                Department Security Scores
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {securityScores.map((item) => (
                <div
                  key={item.department}
                  className="p-3 rounded-lg bg-zinc-800 flex justify-between"
                >
                  <span className="text-white">
                    {item.department}
                  </span>
                  <span className={item.formatted.color}>
                    {item.formatted.display}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <>
          <BulkFeedbackToast message={feedback} />

          {bulkMode && (
            <>
              <SelectAllNotSafeBar
                allNotSafeSelected={allNotSafeSelected}
                notSafeCount={notSafeCount}
                onToggle={selectAllNotSafe}
              />

              <BulkActionBar
                selectedCount={selectedIds.size}
                role="department_head"
                onAction={handleBulkAction}
                onClear={deselectAll}
              />
            </>
          )}

          {/* Not Safe */}
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-red-400 font-semibold text-lg">
                Not Safe ({notSafeNotifications.length})
              </h3>

              {selectedDepartment && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDepartment(null)}
                >
                  Clear Filter
                </Button>
              )}
            </div>

            {notSafeNotifications.map((item) => (
              <NotificationCard
                key={item.notification_id}
                notification={item}
                bulkMode={bulkMode}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
              />
            ))}
          </section>

          {/* Safe */}
          <section className="space-y-3">
            <button
              onClick={() => setSafeCollapsed(!safeCollapsed)}
              className="w-full flex justify-between"
            >
              <h3 className="text-green-400 font-semibold text-lg">
                Safe ({safeNotifications.length})
              </h3>

              {safeCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>

            {!safeCollapsed &&
              safeNotifications.map((item) => (
                <NotificationCard
                  key={item.notification_id}
                  notification={item}
                  bulkMode={false}
                  selectedIds={new Set()}
                  toggleSelect={() => {}}
                />
              ))}
          </section>
        </>
      )}

      {/* HEATMAP */}
      {activeTab === 'heatmap' && (
        <>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">
                Risk by Department
              </CardTitle>
            </CardHeader>

            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="department" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip />

                  <Bar dataKey="avgRisk">
                    {chartData.map((item, i) => (
                      <Cell
                        key={i}
                        fill={getRiskColor(item.avgRisk / 100)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ---------- reusable ---------- */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="pt-6">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-zinc-400">{title}</p>
            <p className="text-3xl text-white font-bold">
              {value}
            </p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

interface NotificationCardProps {
  notification: DatasetNotification;
  bulkMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
}

function NotificationCard({
  notification,
  bulkMode,
  selectedIds,
  toggleSelect,
}: NotificationCardProps) {
  const notSafe = isNotSafe(notification);

  return (
    <div
      className={`rounded-lg border p-4 bg-zinc-900 ${
        notSafe
          ? 'border-red-500/30'
          : 'border-green-500/30'
      }`}
    >
      <div className="flex gap-3">
        {bulkMode && (
          <NotificationCheckbox
            notification={notification}
            isSelected={selectedIds.has(
              notification.notification_id
            )}
            onToggle={toggleSelect}
          />
        )}

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-mono text-xs text-zinc-400">
              {notification.notification_id}
            </span>

            <Badge
              className={
                sourceAppColors[notification.channel]
              }
            >
              <span className="flex items-center gap-1">
                {sourceAppIcons[notification.channel]}
                {notification.channel}
              </span>
            </Badge>

            <Badge>
              {notification.threat_category} (
              {Math.round(notification.risk_score * 100)}%)
            </Badge>

            <Badge variant="outline">
              {notification.department}
            </Badge>
          </div>

          <p className="text-white text-sm bg-zinc-800 p-3 rounded-lg">
            {notification.content}
          </p>

          <div className="text-xs text-zinc-400">
            {notification.sender} → {notification.receiver}
          </div>

          <div className="text-xs text-zinc-500">
            {notification.timestamp}
          </div>
        </div>
      </div>
    </div>
  );
}