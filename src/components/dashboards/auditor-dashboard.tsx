'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSidebar } from '@/lib/sidebar-context';
import { useRole } from '@/components/role-provider';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Shield,
  TrendingUp,
  Search,
  Filter,
  Activity,
  Eye,
  User,
  BarChart3,
} from 'lucide-react';

import type { DatasetNotification } from '@/lib/types';

type TabType = 'overview' | 'notifications' | 'feedback' | 'governance' | 'logs';

export function AuditorDashboard() {
  const { orgId } = useRole();

  const { activeTab: sidebarTab, setActiveTab: setSidebarTab } = useSidebar();
  const activeTab = (sidebarTab as TabType) || 'overview';

  const setActiveTab = (tab: TabType) => setSidebarTab(tab);

  const [notifications, setNotifications] = useState<DatasetNotification[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => {
    fetchAll();
  }, [orgId]);

  const fetchAll = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/dashboards/audit?org_id=${orgId}`);
      if (!res.ok) throw new Error('Failed to fetch audit data');

      const data = await res.json();
      setAuditData(data?.data ?? null);
      setNotifications(Array.isArray(data?.data?.recent_events) ? data.data.recent_events : []);
      
      // Derive feedback from notifications that have been manually reviewed
      const extractedFeedback = data?.data?.recent_events?.filter((n: any) => 
        n?.review_status && n.review_status !== 'Pending'
      ).map((n: any) => ({
        notification_id: n.notification_id,
        timestamp: n.timestamp,
        decision: n.review_status === 'Approved' ? 'confirmed' : 'rejected',
        override:
          (n.review_status === 'Rejected' && Number(n.is_malicious) === 1) || 
          (n.review_status === 'Approved' && Number(n.is_malicious) !== 1)
            ? 'false_positive'
            : 'none',
        note: n.analyst_feedback || `Reviewed as ${n.review_status}`,
      })) ?? [];

      setFeedback(extractedFeedback);
    } catch (error) {
      console.error('Auditor fetch error:', error);
      setAuditData(null);
      setNotifications([]);
      setFeedback([]);
    }

    setLoading(false);
  };

  const filteredNotifications = useMemo(() => {
    return (notifications ?? []).filter((n) => {
      const matchesSearch =
        (n?.notification_id ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (n?.sender ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (n?.receiver ?? '').toLowerCase().includes(search.toLowerCase());

      const matchesRisk =
        riskFilter === 'all'
          ? true
          : (n?.threat_category ?? '').toLowerCase() === riskFilter.toLowerCase();

      return matchesSearch && matchesRisk;
    });
  }, [notifications, search, riskFilter]);

  const total = auditData?.total_events_reviewed ?? 0;
  const flagged = auditData?.policy_violations ?? 0;
  const safe = total - flagged;

  const overrideRate =
    (feedback ?? []).length === 0
      ? 0
      : Math.round(
          ((feedback ?? []).filter((f) => f?.override === 'false_positive').length /
            (feedback ?? []).length) *
            100
        );

  const confirmRate =
    (feedback ?? []).length === 0
      ? 0
      : Math.round(
          ((feedback ?? []).filter((f) => f?.decision === 'confirmed').length /
            (feedback ?? []).length) *
            100
        );

  const exportCSV = () => {
    const rows = [
      [
        'Notification ID',
        'Sender',
        'Receiver',
        'Risk',
        'AI Decision',
        'Timestamp',
      ],
      ...notifications.map((n) => [
        n?.notification_id ?? 'N/A',
        n?.sender ?? 'N/A',
        n?.receiver ?? 'N/A',
        `${Math.round((n?.risk_score ?? 0) * 100)}%`,
        Number(n?.is_malicious) === 1 ? 'Malicious' : 'Safe',
        n?.timestamp ?? 'N/A',
      ]),
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${Date.now()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Auditor Dashboard
          </h2>
          <p className="text-muted-foreground">
            Compliance, governance, read-only monitoring & audit trails
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Records"
          value={total}
          icon={<FileText className="w-6 h-6" />}
          color="text-cyan-500"
        />

        <MetricCard
          title="Flagged"
          value={flagged}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="text-red-500"
        />

        <MetricCard
          title="Safe"
          value={safe}
          icon={<CheckCircle className="w-6 h-6" />}
          color="text-green-500"
        />

        <MetricCard
          title="Feedback Logs"
          value={feedback.length}
          icon={<Clock className="w-6 h-6" />}
          color="text-purple-500"
        />
      </div>

      {/* NAV */}
      <div className="border-b border-border flex gap-2 overflow-auto">
        {[
          ['overview', 'Overview'],
          ['notifications', 'Notifications'],
          ['feedback', 'Feedback'],
          ['governance', 'Governance'],
          ['logs', 'System Logs'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as TabType)}
            className={`px-4 py-2 whitespace-nowrap font-medium transition ${
              activeTab === id
                ? 'text-cyan-500 border-b-2 border-cyan-500'
                : 'text-muted-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && auditData && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <Shield className="w-5 h-5 text-cyan-500" />
                Audit Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                label="Total Events Reviewed"
                value={auditData.total_events_reviewed}
              />
              <InfoRow
                label="Policy Violations"
                value={auditData.policy_violations}
              />
              <InfoRow
                label="Critical Incidents"
                value={auditData.critical_incidents}
              />
              <InfoRow
                label="Pending Reviews"
                value={auditData.pending_reviews}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Governance Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                label="Compliance Rate"
                value={`${auditData.compliance_rate}%`}
              />
              <InfoRow
                label="MFA Enabled"
                value={`${auditData.mfa_enabled_percentage}%`}
              />
              <InfoRow
                label="Unresolved Critical"
                value={auditData.unresolved_critical}
              />
              <InfoRow
                label="Overdue Reviews"
                value={auditData.overdue_reviews}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <Eye className="w-5 h-5 text-cyan-500" />
              Notification Records
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sender / id"
                  className="pl-9"
                />
              </div>

              <select
                className="border bg-background px-3 rounded-md"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
              >
                <option value="all">All Risk</option>
                <option value="critical">Critical</option>
                <option value="suspicious">Suspicious</option>
                <option value="safe">Safe</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3">ID</th>
                    <th className="text-left py-3">Sender</th>
                    <th className="text-left py-3">Receiver</th>
                    <th className="text-left py-3">Risk</th>
                    <th className="text-left py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredNotifications.map((n) => (
                    <tr key={n.notification_id} className="border-b">
                      <td className="py-3 font-mono">
                        {n.notification_id}
                      </td>
                      <td className="py-3">{n.sender}</td>
                      <td className="py-3">{n.receiver}</td>
                      <td className="py-3">
                        <Badge className={n.risk_score > 0.7 ? 'bg-red-500' : n.risk_score > 0.4 ? 'bg-amber-500' : 'bg-green-500'}>
                          {Math.round(n.risk_score * 100)}%
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge className={Number(n?.is_malicious) === 1 ? 'bg-red-500' : 'bg-green-500'}>
                          {Number(n?.is_malicious) === 1 ? 'Flagged' : 'Safe'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FEEDBACK */}
      {activeTab === 'feedback' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <User className="w-5 h-5 text-purple-500" />
              Analyst Feedback Trail
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {feedback.map((f, i) => (
                <div
                  key={i}
                  className="border rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{f.notification_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {f.timestamp}
                    </p>
                    {f.note && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Note: {f.note}
                      </p>
                    )}
                  </div>

                  <Badge
                    className={
                      f.decision === 'confirmed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-green-500/20 text-green-400'
                    }
                  >
                    {f.decision === 'confirmed' ? 'Confirmed' : 'Rejected'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GOVERNANCE */}
      {activeTab === 'governance' && auditData && (
        <div className="grid md:grid-cols-3 gap-4">
          <MetricCard
            title="Override Rate"
            value={`${overrideRate}%`}
            icon={<Activity className="w-6 h-6" />}
            color="text-amber-500"
          />

          <MetricCard
            title="Confirmed Threats"
            value={`${confirmRate}%`}
            icon={<Shield className="w-6 h-6" />}
            color="text-red-500"
          />

          <MetricCard
            title="Model Trust Score"
            value={`${auditData.compliance_rate}%`}
            icon={<BarChart3 className="w-6 h-6" />}
            color="text-green-500"
          />
        </div>
      )}

      {/* LOGS */}
      {activeTab === 'logs' && auditData && (
        <Card>
          <CardHeader>
            <CardTitle>Recent System Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditData.recent_timeline?.map((log: any, i: number) => (
                <div
                  key={i}
                  className="border rounded-xl p-4 flex justify-between"
                >
                  <div>
                    <p className="font-medium">{log.details}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.department} • {log.severity}
                    </p>
                  </div>

                  <span className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------- COMPONENTS ---------- */

function MetricCard({
  title,
  value,
  icon,
  color,
}: any) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={color}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  color,
}: any) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
