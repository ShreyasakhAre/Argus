'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSidebar } from '@/lib/sidebar-context';
import { useRole } from '@/components/role-provider';
import { useAuth } from '@/components/auth-provider';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

import {
  Mail,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Shield,
  MessageSquare,
  Users,
  Building,
  DollarSign,
  Smartphone,
  QrCode,
  Eye,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Search,
  Clock,
  Sparkles,
} from 'lucide-react';

import type {
  DatasetNotification,
} from '@/lib/types';

import { ScannerTools } from '@/components/scanner-tools';

import {
  calculateSecurityScore,
  formatSecurityScore,
} from '@/lib/security-score';

import {
  useNotificationBulkSelect,
  SelectAllNotSafeBar,
  BulkActionBar,
  BulkFeedbackToast,
  NotificationCheckbox,
  isNotSafe,
} from '@/components/notification-bulk-actions';

/* -------------------------------------------------------------------------- */
/*                                   MAPPINGS                                 */
/* -------------------------------------------------------------------------- */

const sourceAppIcons: Record<string, React.ReactNode> = {
  Email: <Mail className="w-4 h-4" />,
  Slack: <MessageSquare className="w-4 h-4" />,
  'Microsoft Teams': <Users className="w-4 h-4" />,
  'HR Portal': <Building className="w-4 h-4" />,
  'Finance System': <DollarSign className="w-4 h-4" />,
  'Internal Mobile App': <Smartphone className="w-4 h-4" />,
};

const sourceAppColors: Record<string, string> = {
  Email: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Slack: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'Microsoft Teams': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'HR Portal': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Finance System': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Internal Mobile App': 'bg-pink-500/15 text-pink-400 border-pink-500/30',
};

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

export function EmployeeDashboard() {
  const { orgId } = useRole();
  const { user } = useAuth();
  const { activeTab: sidebarTab, setActiveTab: setSidebarTab } = useSidebar();

  const activeTab =
    (sidebarTab as 'notifications' | 'scanners') || 'notifications';

  const setActiveTab = (tab: 'notifications' | 'scanners') =>
    setSidebarTab(tab);

  const [notifications, setNotifications] = useState<DatasetNotification[]>([]);
  const [stats, setStats] = useState({
    totalNotifications: 0,
    safe: 0,
    suspicious: 0,
    malicious: 0,
    notSafe: 0,
  });
  const [userFeedback, setUserFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [bulkMode, setBulkMode] = useState(false);
  const [safeCollapsed, setSafeCollapsed] = useState(true);

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<
    'all' | 'high' | 'medium' | 'low'
  >('all');

  const [selectedExplanation, setSelectedExplanation] = useState<{
    [key: string]: any;
  }>({});

  /* ---------------------------- SECURITY SCORE ---------------------------- */

  const securityScore = calculateSecurityScore(
    notifications,
    userFeedback
  );

  const formattedScore = formatSecurityScore(
    securityScore.score
  );

  /* ----------------------------- BULK ACTIONS ---------------------------- */

  const {
    selectedIds,
    notSafeCount,
    allNotSafeSelected,
    toggleSelect,
    selectAllNotSafe,
    deselectAll,
    handleBulkAction,
    feedback: bulkFeedback,
  } = useNotificationBulkSelect(notifications);

  /* ------------------------------ FETCH DATA ----------------------------- */

  useEffect(() => {
    fetchNotifications();
  }, [orgId, user?.email]);

  const fetchNotifications = async () => {
    setLoading(true);

    try {
      const dashboardRes = await api.get<any>(`/api/dashboards/employee?org_id=${orgId ?? 'unknown'}${user?.email ? `&email=${encodeURIComponent(user.email)}` : ''}`);

      const dashboardData = dashboardRes?.data ?? dashboardRes;
      const notificationsData = Array.isArray(dashboardData?.notifications) ? dashboardData.notifications : [];
      console.debug('[employee-dashboard] raw dashboard response', dashboardRes);
      console.debug('[employee-dashboard] mapped counts', {
        total: dashboardData?.stats?.totalNotifications,
        safe: dashboardData?.stats?.safe,
        suspicious: dashboardData?.stats?.suspicious,
        malicious: dashboardData?.stats?.malicious,
        notifications: notificationsData.length,
      });
      setNotifications(notificationsData);
      setStats({
        totalNotifications: dashboardData?.stats?.totalNotifications || notificationsData.length,
        safe: dashboardData?.stats?.safe || 0,
        suspicious: dashboardData?.stats?.suspicious || 0,
        malicious: dashboardData?.stats?.malicious || 0,
        notSafe: dashboardData?.stats?.notSafe || ((dashboardData?.stats?.suspicious || 0) + (dashboardData?.stats?.malicious || 0)),
      });
      
      // Set user feedback if available from dashboard
      if (dashboardData?.data?.user_feedback) {
        setUserFeedback(dashboardData.data.user_feedback);
      }
    } catch (e) {
      console.error('Employee dashboard fetch error:', e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanation = async (id: string) => {
    if (!id || selectedExplanation?.[id]) return;

    try {
      const res = await api.get(`/api/explain/${id}`);
      const data = (res as any).data;

      setSelectedExplanation((prev) => ({
        ...prev,
        [id]: data,
      }));
    } catch (e) {
      console.error(e);
    }
  };

  /* ------------------------------ FILTERING ------------------------------ */

  const filteredNotifications = useMemo(() => {
    let items = Array.isArray(notifications) ? [...notifications] : [];

    if (search.trim()) {
      const q = search.toLowerCase();

      items = items.filter(
        (n) =>
          (n?.content ?? '').toLowerCase().includes(q) ||
          (n?.sender ?? '').toLowerCase().includes(q) ||
          (n?.department ?? '').toLowerCase().includes(q) ||
          (n?.channel ?? '').toLowerCase().includes(q)
      );
    }

    if (riskFilter !== 'all') {
      items = items.filter((n) => {
        const score = Number(n?.risk_score ?? 0);
        if (riskFilter === 'high') return score >= 0.75;
        if (riskFilter === 'medium') return score >= 0.45 && score < 0.75;
        return score < 0.45;
      });
    }

    return items;
  }, [notifications, search, riskFilter]);

  const unsafeNotifications =
    (filteredNotifications ?? []).filter(isNotSafe);

  const safeNotifications =
    (filteredNotifications ?? []).filter(
      (n) => !isNotSafe(n)
    );

  /* ------------------------------- LOADING ------------------------------- */

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Employee Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Review notifications, risks, and scan
            suspicious links or QR codes.
          </p>
        </div>

        {activeTab === 'notifications' && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-red-500 border-red-500"
            >
              {notSafeCount ?? 0} Not Safe
            </Badge>

            <Button
              variant={
                bulkMode ? 'default' : 'outline'
              }
              onClick={() => {
                setBulkMode(!bulkMode);
                deselectAll();
              }}
            >
              Bulk Mode
            </Button>

            <Button
              variant="outline"
              onClick={fetchNotifications}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() =>
            setActiveTab('notifications')
          }
          className={`px-4 py-3 text-sm font-medium transition ${
            activeTab === 'notifications'
              ? 'border-b-2 border-cyan-500 text-cyan-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Notifications
          </span>
        </button>

        <button
          onClick={() => setActiveTab('scanners')}
          className={`px-4 py-3 text-sm font-medium transition ${
            activeTab === 'scanners'
              ? 'border-b-2 border-cyan-500 text-cyan-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            Scanners
          </span>
        </button>
      </div>

      {/* SCANNERS */}
      {activeTab === 'scanners' && (
        <ScannerTools />
      )}

      {/* NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <MetricCard
              title="Total Notifications"
              value={stats.totalNotifications}
              icon={<Mail className="w-8 h-8 text-cyan-400" />}
            />

            <MetricCard
              title="Safe"
              value={stats.safe}
              icon={
                <CheckCircle className="w-8 h-8 text-green-500" />
              }
            />

            <MetricCard
              title="Suspicious"
              value={stats.suspicious}
              icon={
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              }
            />

            <MetricCard
              title="Not Safe"
              value={stats.notSafe}
              icon={
                <AlertTriangle className="w-8 h-8 text-red-500" />
              }
            />

            <Card
              className={`border ${formattedScore?.borderColor ?? ''} ${formattedScore?.bgColor ?? ''}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Security Score
                    </p>
                    <p
                      className={`text-3xl font-bold ${formattedScore?.color ?? ''}`}
                    >
                      {formattedScore?.display ?? 'N/A'}
                    </p>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Personal safety posture
                    </div>
                  </div>

                  <Shield
                    className={`w-8 h-8 ${formattedScore?.color ?? ''}`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* QUICK ACTIONS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Button variant="outline" className="h-20 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => setActiveTab('scanners')}>
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-xs">Report Phishing</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => setActiveTab('scanners')}>
              <Smartphone className="w-5 h-5 text-cyan-500" />
              <span className="text-xs">Scan Link</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => setActiveTab('scanners')}>
              <QrCode className="w-5 h-5 text-indigo-500" />
              <span className="text-xs">Check QR</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => window.open('/training', '_blank')}>
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-xs">View Training Tips</span>
            </Button>
          </div>

          {/* SEARCH / FILTER */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Search sender, content, department..."
                    className="w-full h-10 rounded-md border bg-background pl-9 pr-3 text-sm"
                  />
                </div>

                <select
                  value={riskFilter}
                  onChange={(e) =>
                    setRiskFilter(
                      e.target.value as any
                    )
                  }
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">
                    All Risks
                  </option>
                  <option value="high">
                    High Risk
                  </option>
                  <option value="medium">
                    Medium Risk
                  </option>
                  <option value="low">
                    Low Risk
                  </option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* BULK UI */}
          <BulkFeedbackToast
            message={bulkFeedback}
          />

          {bulkMode && (
            <>
              <SelectAllNotSafeBar
                allNotSafeSelected={
                  allNotSafeSelected
                }
                notSafeCount={notSafeCount}
                onToggle={selectAllNotSafe}
              />

              <BulkActionBar
                selectedCount={
                  selectedIds.size
                }
                role="employee"
                onAction={handleBulkAction}
                onClear={deselectAll}
              />
            </>
          )}

          {/* UNSAFE */}
          <SectionTitle
            title={`Not Safe Notifications (${unsafeNotifications?.length ?? 0})`}
            danger
          />

          {(unsafeNotifications?.length ?? 0) === 0 ? (
            <EmptyState
              icon={
                <CheckCircle className="w-10 h-10 text-green-500" />
              }
              text="No unsafe notifications found."
            />
          ) : (
            <div className="space-y-3">
              {unsafeNotifications.map(
                (notification) => (
                  <NotificationCard
                    key={
                      notification?.notification_id ?? Math.random().toString()
                    }
                    notification={
                      notification
                    }
                    bulkMode={bulkMode}
                    selectedIds={
                      selectedIds
                    }
                    toggleSelect={
                      toggleSelect
                    }
                    selectedExplanation={
                      selectedExplanation
                    }
                    fetchExplanation={
                      fetchExplanation
                    }
                    refresh={fetchNotifications}
                  />
                )
              )}
            </div>
          )}

          {/* SAFE */}
          <button
            onClick={() =>
              setSafeCollapsed(
                !safeCollapsed
              )
            }
            className="w-full flex items-center justify-between"
          >
            <SectionTitle
              title={`Safe Notifications (${safeNotifications?.length ?? 0})`}
              success
            />

            {safeCollapsed ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {!safeCollapsed && (
            <div className="space-y-3">
              {(safeNotifications ?? []).map(
                (notification) => (
                  <NotificationCard
                    key={
                      notification?.notification_id ?? Math.random().toString()
                    }
                    notification={
                      notification
                    }
                    bulkMode={false}
                    selectedIds={
                      new Set()
                    }
                    toggleSelect={() => {}}
                    selectedExplanation={
                      selectedExplanation
                    }
                    fetchExplanation={
                      fetchExplanation
                    }
                    refresh={fetchNotifications}
                  />
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             SUPPORT COMPONENTS                             */
/* -------------------------------------------------------------------------- */

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font-bold">
              {value}
            </p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  title,
  danger,
  success,
}: {
  title: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <h3
      className={`text-lg font-semibold flex items-center gap-2 ${
        danger
          ? 'text-red-400'
          : success
          ? 'text-green-400'
          : ''
      }`}
    >
      {danger ? (
        <AlertTriangle className="w-5 h-5" />
      ) : success ? (
        <CheckCircle className="w-5 h-5" />
      ) : null}

      {title}
    </h3>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <div className="flex justify-center mb-3">
          {icon}
        </div>
        <p className="text-muted-foreground">
          {text}
        </p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                            NOTIFICATION CARD                               */
/* -------------------------------------------------------------------------- */

interface NotificationCardProps {
  notification: DatasetNotification;
  bulkMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectedExplanation: {
    [key: string]: any;
  };
  fetchExplanation: (
    id: string
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

function NotificationCard({
  notification,
  bulkMode,
  selectedIds,
  toggleSelect,
  selectedExplanation,
  fetchExplanation,
  refresh,
}: NotificationCardProps) {
  const notSafe = isNotSafe(notification);

  const riskColor =
    notification?.threat_category === 'high_risk_suspicious' || notification?.threat_category === 'ransomware' || notification?.threat_category === 'phishing' || notification?.threat_category === 'critical'
      ? 'text-red-400'
      : notification?.threat_category === 'suspicious' || notification?.threat_category === 'bec'
      ? 'text-amber-400'
      : 'text-green-400';

  return (
    <Card
      className={`overflow-hidden border-l-4 ${
        notSafe
          ? 'border-l-red-500'
          : 'border-l-green-500'
      }`}
    >
      <CardContent className="pt-5">
        <div className="flex gap-3">
          {bulkMode && (
            <NotificationCheckbox
              notification={notification}
              isSelected={selectedIds?.has(notification?.notification_id) ?? false}
              onToggle={toggleSelect}
            />
          )}

          <div className="flex-1 min-w-0">
            {/* TOP */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {notSafe ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span className="font-mono text-xs text-muted-foreground">
                {notification?.notification_id ?? 'N/A'}
              </span>
              <Badge
                className={sourceAppColors[notification?.channel ?? ''] ?? 'bg-gray-500/15'}
              >
                <span className="mr-1">
                  {sourceAppIcons[notification?.channel ?? ''] ?? <Shield className="w-4 h-4" />}
                </span>
                {notification?.channel ?? 'Unknown Channel'}
              </Badge>
              <Badge>
                {notification?.threat_category ?? 'Unknown Risk'} ({Math.round((notification?.risk_score ?? 0) * 100)}%)
              </Badge>
              <Badge variant="outline">
                {notification?.department ?? 'Unknown Department'}
              </Badge>
            </div>
            {/* META */}
            <div className="grid md:grid-cols-3 gap-2 text-sm mb-3">
              <div>
                <span className="text-muted-foreground">
                  From:
                </span>{' '}
                {notification?.sender ?? 'Unknown Sender'}
              </div>
              <div>
                <span className="text-muted-foreground">
                  To:
                </span>{' '}
                {notification?.receiver ?? 'Unknown Receiver'}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                {notification?.timestamp ?? 'Unknown Time'}
              </div>
            </div>
            {/* CONTENT */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              {notification?.content ?? 'No content available.'}
            </div>
            {/* EXPLANATION */}
            {notSafe && (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-0 text-cyan-400 hover:text-cyan-300"
                  onClick={() => fetchExplanation?.(notification?.notification_id ?? '')}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Why was this flagged?
                </Button>
                {notification?.notification_id && selectedExplanation?.[notification.notification_id] && (
                  <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <p className="text-sm border-b border-cyan-500/20 pb-2 mb-2">
                       <span className="font-semibold text-cyan-400">AI Explanation:</span> {selectedExplanation[notification.notification_id]?.explanation?.explanation_text ?? "Reason unavailable"}
                    </p>
                    <p className="text-sm">
                       <span className="font-semibold text-cyan-400">Recommended Action:</span> Do not interact. Report this to security immediately.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(selectedExplanation[notification.notification_id]?.explanation?.top_features ?? []).map((feature: any, idx: number) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-cyan-400 border-cyan-500/30"
                        >
                          {feature?.feature?.replace(/_/g, ' ') ?? 'Unknown Indicator'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await api.delete(`/api/notifications/${notification.notification_id}`);
                  await refresh();
                }}
              >
                Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await api.post('/api/fraud-analyst/request-review', {
                    notificationId: notification.notification_id,
                    feedback: 'Reported by employee for analyst review',
                  });
                  await refresh();
                }}
              >
                Report
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await api.post('/api/fraud-analyst/request-review', {
                    notificationId: notification.notification_id,
                    feedback: 'Employee requested manual review',
                  });
                  await refresh();
                }}
              >
                Request Review
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}