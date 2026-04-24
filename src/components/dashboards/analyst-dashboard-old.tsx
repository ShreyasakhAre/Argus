'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  TrendingUp,
  Clock3,
  Briefcase,
  Filter,
  FileWarning,
  User,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  Paperclip,
  Link,
  Flag,
  ChevronDown,
  Download,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useRole } from '@/components/role-provider';
import { useAuth } from '@/components/auth-provider';
import { DatasetNotification, FraudCase, Priority, ReviewStatus, NotificationSeverity } from '@/lib/types';
import NotificationsFeed from '@/components/notifications-feed';
import ScannerTools from '@/components/scanner-tools';

type AnalystTab = 'queue' | 'cases' | 'tools' | 'analytics';

// Updated interfaces aligned with new dataset
interface NotificationItem extends DatasetNotification {
  risk_level?: string;
  severity?: string;
  source_app?: string;
}

interface CaseItem extends FraudCase {
  analyst_name?: string;
  id?: string;
  title?: string;
  status?: string;
}

interface AnalystMetrics {
  totalCases: number;
  pendingCases: number;
  criticalCases: number;
  avgReviewTime: number;
  accuracyRate: number;
  total: number;
  critical: number;
  avg: number;
  openCases: number;
}

export function AnalystDashboard() {
  const { orgId } = useRole();
  const { user } = useAuth();

  const [tab, setTab] = useState<AnalystTab>('queue');
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [metrics, setMetrics] = useState<AnalystMetrics>({
    totalCases: 0,
    pendingCases: 0,
    criticalCases: 0,
    avgReviewTime: 0,
    accuracyRate: 0,
    total: 0,
    critical: 0,
    avg: 0,
    openCases: 0
  });

  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [threatFilter, setThreatFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [riskFilter, setRiskFilter] = useState('all');

  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadAll();
  }, [orgId, currentPage, statusFilter, threatFilter, priorityFilter, departmentFilter]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchNotifications(), fetchCases(), fetchMetrics()]);
    setLoading(false);
  };

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams({
        org_id: orgId,
        review_status: statusFilter,
        page: currentPage.toString(),
        limit: '25'
      });
      
      if (threatFilter !== 'all') params.append('threat_category', threatFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      
      const res = await fetch(`/api/alerts?${params}`);
      const data = await res.json();

      if (data.success) {
        setNotifications(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setNotifications([]);
    }
  };

  const fetchCases = async () => {
    try {
      const res = await fetch(`/api/fraud-analyst/review-queue?status=Pending&page=1&limit=50`);
      const data = await res.json();

      if (data.success) {
        setCases(data.data?.cases || []);
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
      setCases([]);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/fraud-analyst/analytics?timeframe=24`);
      const data = await res.json();

      if (data.success && data.data?.summary) {
        setMetrics({
          totalCases: data.data.summary.totalCases || 0,
          pendingCases: data.data.summary.pendingCases || 0,
          criticalCases: data.data.summary.highRiskCount || 0,
          avgReviewTime: Math.round(data.data.summary.avgTimeToReview || 0),
          accuracyRate: Math.round(data.data.summary.accuracyRate || 0),
          total: data.data.summary.totalCases || 0,
          critical: data.data.summary.highRiskCount || 0,
          avg: Math.round((data.data.summary.avgRiskScore || 0) * 100),
          openCases: data.data.summary.pendingCases || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  };

  const filteredNotifications = useMemo(() => {
    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    return safeNotifications.filter((item) => {
      const q =
        search === '' ||
        item.sender.toLowerCase().includes(search.toLowerCase()) ||
        item.content.toLowerCase().includes(search.toLowerCase()) ||
        item.notification_id.toLowerCase().includes(search.toLowerCase()) ||
        item.receiver.toLowerCase().includes(search.toLowerCase());

      const t = threatFilter === 'all' || item.threat_category === threatFilter;
      const p = priorityFilter === 'all' || item.priority === priorityFilter;
      const d = departmentFilter === 'all' || item.department === departmentFilter;

      return q && t && p && d;
    });
  }, [notifications, search, threatFilter, priorityFilter, departmentFilter]);

  const handleReviewAction = async (action: 'approve' | 'reject' | 'escalate') => {
    if (!selected) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/fraud-analyst/cases/${selected.notification_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          feedback: notes,
          escalationReason: action === 'escalate' ? notes : undefined
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setNotifications((prev) =>
          Array.isArray(prev) ? prev.filter((n) => n.notification_id !== selected.notification_id) : []
        );
        setSelected(null);
        setNotes('');
        setShowDetails(false);
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    }

    setSubmitting(false);
  };

  const handleDecision = async (decision: 'confirm' | 'false_positive') => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/fraud-analyst/cases/${selected.notification_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: decision,
          feedback: notes,
          escalationReason: decision === 'escalate' ? notes : undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          Array.isArray(prev) ? prev.filter((n) => n.notification_id !== selected.notification_id) : []
        );
        setSelected(null);
        setNotes('');
        setShowDetails(false);
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
    setSubmitting(false);
  };

  const createCase = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/fraud-analyst/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: selected.notification_id,
          analyst_id: user?.email || 'analyst@company.com',
          analyst_name: user?.name || 'Analyst',
          title: `Case for ${selected.notification_id}`,
          priority: selected.priority,
          description: notes
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchCases();
        setSelected(null);
        setNotes('');
        setShowDetails(false);
      }
    } catch (err) {
      console.error('Failed to create case:', err);
    }
    setSubmitting(false);
  };

  const assignToMe = async (notification: NotificationItem) => {
    try {
      const res = await fetch(`/api/fraud-analyst/cases/${notification.notification_id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analystId: user?.email || 'analyst@company.com',
          analystName: user?.name || 'Analyst'
        }),
      });

      if (res.ok) {
        await fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to assign case:', err);
    }
  };

  const badgeClass = (risk: string) => {
    if (risk === 'Critical') return 'bg-red-500/20 text-red-400';
    if (risk === 'High') return 'bg-orange-500/20 text-orange-400';
    if (risk === 'Medium') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-green-500/20 text-green-400';
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Analyst Dashboard</h1>
            <p className="text-slate-400">
              Review flagged alerts, validate AI decisions and manage incidents.
            </p>
          </div>

          <Button
            onClick={loadAll}
            variant="outline"
            className="border-slate-700 text-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Review Queue"
          value={metrics.total}
          icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
        />
        <MetricCard
          title="Critical Alerts"
          value={metrics.critical}
          icon={<AlertTriangle className="w-5 h-5 text-orange-400" />}
        />
        <MetricCard
          title="Avg Risk Score"
          value={`${metrics.avg}%`}
          icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
        />
        <MetricCard
          title="Open Cases"
          value={metrics.openCases}
          icon={<Briefcase className="w-5 h-5 text-violet-400" />}
        />
      </div>

      {/* TABS */}
      <div className="flex gap-6 border-b border-slate-800">
        {[
          ['queue', 'Review Queue'],
          ['cases', 'Cases'],
          ['tools', 'Scanner Tools'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id as AnalystTab)}
            className={`pb-3 text-sm font-medium border-b-2 transition ${
              tab === id
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* QUEUE */}
      {tab === 'queue' && (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {/* FILTER BAR */}
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 grid md:grid-cols-3 gap-3">
                  <div className="relative md:col-span-2">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <Input
                      placeholder="Search sender / content / id..."
                      className="pl-9 bg-slate-950 border-slate-800"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="w-full h-10 rounded-md border border-slate-800 bg-slate-950 pl-9 text-sm"
                    >
                      <option value="all">All Risk</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* ALERT LIST */}
              {filteredNotifications.map((item) => (
                <Card
                  key={item.notification_id}
                  className="bg-slate-900 border-slate-800 hover:border-cyan-700 transition"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                        <span className="text-sm font-mono text-slate-400">
                          {item.notification_id}
                        </span>

                        <Badge className={badgeClass(item.severity || item.risk_level || 'unknown')}>
                          {item.severity || item.risk_level || 'unknown'} ({Math.round(item.risk_score * 100)}%)
                        </Badge>

                        <Badge variant="outline">{item.department || 'Unknown'}</Badge>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setSelected(item)}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </div>

                    <div className="text-sm text-slate-300">
                      <span className="text-slate-500">From:</span> {item.sender}
                    </div>

                    <p className="text-sm text-slate-400 line-clamp-2">
                      {item.content}
                    </p>

                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Clock3 className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredNotifications.length === 0 && (
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-10 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-3" />
                    <p className="text-white font-medium">No alerts in queue</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* SIDE PANEL */}
            <div>
              <NotificationsFeed />
            </div>
          </div>

          {/* REVIEW PANEL */}
          {selected && (
            <Card className="bg-slate-900 border-cyan-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileWarning className="w-5 h-5 text-cyan-400" />
                  Review Alert {selected.notification_id}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Sender:</span>{' '}
                    <span className="text-white">{selected.sender}</span>
                  </div>

                  <div>
                    <span className="text-slate-500">Receiver:</span>{' '}
                    <span className="text-white">{selected.receiver}</span>
                  </div>

                  <div>
                    <span className="text-slate-500">Source:</span>{' '}
                    <span className="text-white">{selected.source_app}</span>
                  </div>

                  <div>
                    <span className="text-slate-500">Department:</span>{' '}
                    <span className="text-white">{selected.department}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-4 text-sm text-slate-300 border border-slate-800">
                  {selected.content}
                </div>

                <Textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Analyst notes..."
                  className="bg-slate-950 border-slate-800"
                />

                <div className="grid md:grid-cols-3 gap-3">
                  <Button
                    disabled={submitting}
                    onClick={() => handleDecision('confirm')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Confirm Threat
                  </Button>

                  <Button
                    disabled={submitting}
                    onClick={() => handleDecision('false_positive')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Mark Safe
                  </Button>

                  <Button
                    disabled={submitting}
                    onClick={createCase}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Create Case
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* CASES */}
      {tab === 'cases' && (
        <div className="grid gap-4">
          {cases.map((c) => (
            <Card key={c.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-white">{c.id}</p>
                    <p className="text-sm text-slate-400">{c.title}</p>
                  </div>

                  <div className="flex gap-2">
                    <Badge>{c.priority}</Badge>
                    <Badge variant="outline">{c.status}</Badge>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-500">
                  Linked Alert: {c.notification_id}
                </div>
              </CardContent>
            </Card>
          ))}

          {cases.length === 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-10 text-center text-slate-400">
                No cases available
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TOOLS */}
      {tab === 'tools' && <ScannerTools />}
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
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          {icon}
          <Shield className="w-4 h-4 text-slate-600" />
        </div>

        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}