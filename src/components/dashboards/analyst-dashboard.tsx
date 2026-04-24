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

import { AnalyticsPanel } from '@/components/analytics-panel';
import { ScannerTools } from '@/components/scanner-tools';
import { useAuth } from '@/components/auth-provider';
import api from '@/lib/api';
import type { DatasetNotification } from '@/lib/types';

type AnalystTab = 'queue' | 'cases' | 'tools' | 'analytics';

// Updated interfaces aligned with new dataset
interface FraudCase extends DatasetNotification {
  case_id?: string;
  case_priority?: string;
  case_notes?: string;
  assigned_analyst?: string;
}

interface NotificationItem extends DatasetNotification {
  status?: string;
  ai_analysis?: {
    risk_score: number;
    label: string;
    ai_explanation: string;
    signals?: string[];
  };
}

interface AlertDetailResponse {
  alert: NotificationItem;
  evidence: string[];
  history: Array<{ timestamp: string; action: string; actor: string; detail: string }>;
}

interface CaseItem extends FraudCase {
  analyst_name?: string;
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
  const { user } = useAuth();
  const orgId = user?.orgId || 'ORG001';

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
  const [detailPayload, setDetailPayload] = useState<AlertDetailResponse | null>(null);
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
        status: statusFilter,
        page: currentPage.toString(),
        limit: '250'
      });

      if (threatFilter !== 'all') params.append('threat_category', threatFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);

      const data = await api.get<{ success: boolean; data: { cases: NotificationItem[]; pagination?: { pages: number } } }>(`/api/fraud-analyst/review-queue?${params}`);

      if (data.success) {
        setNotifications(Array.isArray(data.data?.cases) ? data.data.cases : []);
        setTotalPages(data.data?.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setNotifications([]);
    }
  };

  const fetchCases = async () => {
    try {
      const data = await api.get<{ success: boolean; data: { cases: CaseItem[] } }>(
        `/api/fraud-analyst/review-queue?status=Pending&page=1&limit=50`
      );
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
      const resp = await api.get<any>('/api/fraud-analyst/analytics');
      const data = resp?.data || resp;
      if (data?.summary) {
        const s = data.summary;
        setMetrics({
          totalCases: s.totalCases || 0,
          pendingCases: s.pendingCases || 0,
          criticalCases: s.highRiskCount || 0,
          avgReviewTime: 0,
          accuracyRate: 0,
          total: s.totalCases || 0,
          critical: s.highRiskCount || 0,
          avg: Math.round((s.avgRiskScore || 0) * 100),
          openCases: s.pendingCases || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  };

  const openReview = async (item: NotificationItem) => {
    try {
      const detail = await api.get<{ success: boolean; data: AlertDetailResponse }>(`/api/fraud-analyst/alert/${item.notification_id}`);
      if (detail.success) {
        setDetailPayload(detail.data);
        setSelected(detail.data.alert || item);
      } else {
        setSelected(item);
      }
    } catch {
      setSelected(item);
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
      const data = await api.post<{ success: boolean }>(
        `/api/fraud-analyst/cases/${selected.notification_id}/review`,
        { action, feedback: notes, escalationReason: action === 'escalate' ? notes : undefined }
      );
      if (data.success) {
        setNotifications((prev) => Array.isArray(prev) ? prev.filter((n) => n.notification_id !== selected.notification_id) : []);
        setSelected(null);
        setDetailPayload(null);
        setNotes('');
        setShowDetails(false);
        await Promise.all([fetchMetrics(), fetchNotifications()]);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
    setSubmitting(false);
  };

  const assignToMe = async (notification: NotificationItem) => {
    try {
      await api.post(`/api/fraud-analyst/cases/${notification.notification_id}/assign`, {
        analystId: user?.email || 'analyst@company.com',
        analystName: user?.name || 'Analyst',
      });
      await fetchNotifications();
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
            <h1 className="text-2xl font-bold text-white">Fraud Analyst Dashboard</h1>
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
          ['analytics', 'Analytics'],
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
                <CardContent className="p-4 grid md:grid-cols-4 gap-3">
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
                    <Select value={threatFilter} onValueChange={setThreatFilter}>
                      <SelectTrigger className="pl-9 bg-slate-950 border-slate-800">
                        <SelectValue placeholder="Threat Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Threats</SelectItem>
                        <SelectItem value="safe">Safe</SelectItem>
                        <SelectItem value="low_risk_suspicious">Low Risk</SelectItem>
                        <SelectItem value="suspicious">Suspicious</SelectItem>
                        <SelectItem value="high_risk_suspicious">High Risk</SelectItem>
                        <SelectItem value="bec">BEC</SelectItem>
                        <SelectItem value="ransomware">Ransomware</SelectItem>
                        <SelectItem value="phishing">Phishing</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative">
                    <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="pl-9 bg-slate-950 border-slate-800">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* ALERT LIST */}
              {(filteredNotifications ?? []).map((item) => (
                <Card
                  key={item?.notification_id}
                  className="bg-slate-900 border-slate-800 hover:border-cyan-700 transition"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                        <span className="text-sm font-mono text-slate-400">
                          {item?.notification_id ?? 'N/A'}
                        </span>

                        <Badge className={badgeClass(item?.threat_category ?? 'Safe')}>
                          {item?.threat_category ?? 'Safe'} ({Math.round((item?.risk_score ?? 0) * 100)}%)
                        </Badge>

                        <Badge variant="outline">{item?.department ?? 'Unknown'}</Badge>
                        <Badge variant="secondary">{item?.channel ?? 'N/A'}</Badge>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => openReview(item)}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </div>

                    <div className="text-sm text-slate-300">
                      <span className="text-slate-500">From:</span> {item?.sender ?? 'Unknown'}
                      <span className="text-slate-500 ml-4">To:</span> {item?.receiver ?? 'Unknown'}
                    </div>

                    <p className="text-sm text-slate-400 line-clamp-2">
                      {item?.content ?? 'No content available'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Clock3 className="w-3 h-3" />
                        {item?.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                      </div>
                      {item?.contains_url === 1 && (
                        <div className="flex items-center gap-1">
                          <Link className="w-3 h-3" />
                          URL
                        </div>
                      )}
                      {item?.attachment_type && item.attachment_type !== 'none' && (
                        <div className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          {item.attachment_type}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {item?.country ?? 'Unknown'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {item?.device_type ?? 'Unknown'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(filteredNotifications ?? []).length === 0 && (
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
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <h3 className="text-white font-medium mb-2">Recent Activity</h3>
                  <p className="text-slate-400 text-sm">Notifications feed will be updated</p>
                </CardContent>
              </Card>
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
                    <span className="text-slate-500">Channel:</span>{' '}
                    <span className="text-white">{selected.channel}</span>
                  </div>

                  <div>
                    <span className="text-slate-500">Department:</span>{' '}
                    <span className="text-white">{selected.department}</span>
                  </div>

                  <div>
                    <span className="text-slate-500">Priority:</span>{' '}
                    <span className="text-white">{selected.priority}</span>
                  </div>

                  <div>
                    <span className="text-slate-500">Risk Score:</span>{' '}
                    <span className="text-white">{Math.round(selected.risk_score * 100)}%</span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-4 text-sm text-slate-300 border border-slate-800">
                  {selected.content}
                </div>

                {/* AI EXPLANATION SECTION */}
                {selected.ai_analysis && (
                  <div className="space-y-3 p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/50">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
                      <Shield className="w-4 h-4" />
                      AI Decision Logic
                    </div>
                    
                    <p className="text-sm text-slate-200 leading-relaxed italic">
                      "{selected.ai_analysis.ai_explanation}"
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {selected.ai_analysis.signals && selected.ai_analysis.signals.map((signal, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-cyan-900/40 text-cyan-300 border-cyan-700/50 text-[10px] uppercase tracking-wider">
                          {signal}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-cyan-800/30">
                      <span className="text-xs text-cyan-500">ML Confidence</span>
                      <span className="text-sm font-mono text-cyan-400 font-bold">{selected.ai_analysis.risk_score}%</span>
                    </div>
                  </div>
                )}

                {detailPayload && Array.isArray(detailPayload.evidence) && detailPayload.evidence.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Evidence</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {detailPayload.evidence.map((entry, idx) => (
                        <li key={`${entry}-${idx}`}>• {entry}</li>
                      ))}
                    </ul>
                  </div>
                )}

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
                    onClick={() => handleReviewAction('reject')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Confirm Threat
                  </Button>

                  <Button
                    disabled={submitting}
                    onClick={() => handleReviewAction('approve')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Mark Safe
                  </Button>

                  <Button
                    disabled={submitting}
                    onClick={() => assignToMe(selected)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Assign to Me
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <Button
                    disabled={submitting}
                    onClick={() => handleReviewAction('escalate')}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Escalate
                  </Button>
                  <Button
                    disabled={submitting}
                    onClick={async () => {
                      if (!selected) return;
                      setSubmitting(true);
                      try {
                        await api.post('/api/fraud-analyst/create-case', {
                          notificationId: selected.notification_id,
                          severity: selected.priority || 'high',
                          notes,
                        });
                        await Promise.all([fetchCases(), fetchNotifications()]);
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="bg-violet-600 hover:bg-violet-700"
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
            <Card key={c.case_id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-white">{c.case_id}</p>
                    <p className="text-sm text-slate-400">{c.notification_id}</p>
                  </div>

                  <div className="flex gap-2">
                    <Badge>{c.case_priority}</Badge>
                    <Badge variant="outline">{c.review_status}</Badge>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-500">
                  Threat: {c.threat_category} | Risk Score: {Math.round(c.risk_score * 100)}%
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

      {/* ANALYTICS */}
      {tab === 'analytics' && (
        <AnalyticsPanel />
      )}

      {/* TOOLS */}
      {tab === 'tools' && (
        <ScannerTools />
      )}
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
