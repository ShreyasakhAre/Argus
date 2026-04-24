'use client';

import { useEffect, useState, useMemo } from 'react';
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
  UserCheck,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowUpRight,
  MessageSquare,
  FileText,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useRole } from '@/components/role-provider';
import { useAuth } from '@/components/auth-provider';
import { DatasetNotification, FraudCase, Priority, ReviewStatus, NotificationSeverity } from '@/lib/types';

interface ReviewQueueItem extends DatasetNotification {
  case_id?: string;
  assigned_analyst_id?: string;
  assigned_analyst_name?: string;
  time_in_queue?: number;
}

interface CaseDetails extends FraudCase {
  action_history?: Array<{
    action: string;
    performed_by_name: string;
    timestamp: string;
    comments?: string;
  }>;
  similar_cases?: ReviewQueueItem[];
  sender_domain?: string;
  contains_url?: number;
  url?: string;
  attachment_type?: string;
  ai_explanation?: string;
  signals?: string[];
  detailed_analysis?: any;
}

interface AnalystWorkload {
  _id: string;
  analyst_name: string;
  pending_count: number;
  in_review_count: number;
  total_assigned: number;
  avg_time_to_review: number;
}

interface AnalyticsData {
  summary: {
    totalCases: number;
    pendingCases: number;
    approvedCases: number;
    rejectedCases: number;
    escalatedCases: number;
    avgTimeToReview: number;
    avgTimeToResolution: number;
    avgRiskScore: number;
  };
  threatBreakdown: Array<{
    _id: string;
    count: number;
    avgRiskScore: number;
    maliciousCount: number;
  }>;
  departmentBreakdown: Array<{
    _id: string;
    count: number;
    avgRiskScore: number;
    maliciousCount: number;
  }>;
  timeline: Array<{

    const formatRiskPercent = (score: number) => {
      const normalized = score > 1 ? score : score * 100;
      return Math.round(normalized);
    };

    const riskBandLabel = (score: number) => {
      const normalized = score > 1 ? score / 100 : score;
      if (normalized >= 0.7) return 'High Risk';
      if (normalized >= 0.4) return 'Suspicious';
      return 'Safe';
    };
    _id: string;
    count: number;
    avgRiskScore: number;
    maliciousCount: number;
  }>;
}

export function FraudAnalystReview() {
  const { orgId } = useRole();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'queue' | 'my-cases' | 'analytics'>('queue');
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<ReviewQueueItem | null>(null);
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Queue filters
  const [search, setSearch] = useState('');
  const [threatFilter, setThreatFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Review form
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'escalate' | null>(null);

  // Data state
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [myCases, setMyCases] = useState<FraudCase[]>([]);
  const [workload, setWorkload] = useState<AnalystWorkload[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadData();
  }, [orgId, currentPage, statusFilter, threatFilter, priorityFilter, departmentFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchReviewQueue(),
        fetchMyCases(),
        fetchWorkload(),
        fetchAnalytics()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewQueue = async () => {
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: currentPage.toString(),
        limit: '1000'
      });

      if (threatFilter !== 'all') params.append('threat_category', threatFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);

      const res = await fetch(`/api/fraud-analyst/review-queue?${params}`);
      const data = await res.json();

      if (data.success) {
        setReviewQueue(data.data?.cases || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
    }
  };

  const fetchMyCases = async () => {
    try {
      const res = await fetch(`/api/fraud-analyst/review-queue?assigned_analyst_id=${user?.email}&page=1&limit=50`);
      const data = await res.json();

      if (data.success) {
        setMyCases(data.data?.cases || []);
      }
    } catch (error) {
      console.error('Failed to fetch my cases:', error);
    }
  };

  const fetchWorkload = async () => {
    try {
      const res = await fetch(`/api/fraud-analyst/workload`);
      const data = await res.json();

      if (data.success) {
        setWorkload(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch workload:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/fraud-analyst/analytics?timeframe=24`);
      const data = await res.json();

      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchCaseDetails = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/fraud-analyst/cases/${notificationId}`);
      const data = await res.json();

      if (data.success) {
        setCaseDetails(data.data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Failed to fetch case details:', error);
    }
  };

  const assignToMe = async (item: ReviewQueueItem) => {
    try {
      const res = await fetch(`/api/fraud-analyst/cases/${item.notification_id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analystId: user?.email || 'analyst@company.com',
          analystName: user?.name || 'Analyst'
        }),
      });

      if (res.ok) {
        await fetchReviewQueue();
        await fetchMyCases();
      }
    } catch (error) {
      console.error('Failed to assign case:', error);
    }
  };

  const submitReview = async () => {
    if (!selectedCase || !selectedAction) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/fraud-analyst/cases/${selectedCase.notification_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          feedback: reviewNotes,
          escalationReason: selectedAction === 'escalate' ? reviewNotes : undefined
        }),
      });

      if (res.ok) {
        await fetchReviewQueue();
        await fetchMyCases();
        await fetchAnalytics();
        setSelectedCase(null);
        setSelectedAction(null);
        setReviewNotes('');
        setShowDetails(false);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQueue = useMemo(() => {
    return reviewQueue.filter((item) => {
      const searchMatch = 
        search === '' ||
        item.sender.toLowerCase().includes(search.toLowerCase()) ||
        item.content.toLowerCase().includes(search.toLowerCase()) ||
        item.notification_id.toLowerCase().includes(search.toLowerCase()) ||
        item.receiver.toLowerCase().includes(search.toLowerCase());

      const threatMatch = threatFilter === 'all' || item.threat_category === threatFilter;
      const priorityMatch = priorityFilter === 'all' || item.priority === priorityFilter;
      const departmentMatch = departmentFilter === 'all' || item.department === departmentFilter;

      return searchMatch && threatMatch && priorityMatch && departmentMatch;
    });
  }, [reviewQueue, search, threatFilter, priorityFilter, departmentFilter]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const getThreatColor = (threat: string) => {
    switch (threat) {
      case 'critical': return 'bg-red-500';
      case 'ransomware': return 'bg-red-600';
      case 'phishing': return 'bg-orange-500';
      case 'bec': return 'bg-purple-500';
      case 'high_risk_suspicious': return 'bg-orange-600';
      case 'suspicious': return 'bg-yellow-600';
      case 'low_risk_suspicious': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
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
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Fraud Analyst Review</h1>
            <p className="text-slate-400">
              Review and analyze suspicious notifications for fraud detection
            </p>
          </div>
          <Button onClick={loadData} variant="outline" className="border-slate-700 text-slate-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Cases</p>
                  <p className="text-2xl font-bold text-white">{analytics.summary.totalCases}</p>
                </div>
                <Briefcase className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Pending Review</p>
                  <p className="text-2xl font-bold text-orange-400">{analytics.summary.pendingCases}</p>
                </div>
                <Clock3 className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg Review Time</p>
                  <p className="text-2xl font-bold text-green-400">{Math.round(analytics.summary.avgTimeToReview)}m</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg Risk Score</p>
                  <p className="text-2xl font-bold text-red-400">{Math.round(analytics.summary.avgRiskScore * 100)}%</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="my-cases">My Cases</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Review Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          {/* Filters */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-5 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <Input
                    placeholder="Search..."
                    className="pl-9 bg-slate-950 border-slate-800"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={threatFilter} onValueChange={setThreatFilter}>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
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
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
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
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Procurement">Procurement</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Review">In Review</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Queue Items */}
          <div className="space-y-3">
            {filteredQueue.map((item) => (
              <Card key={item.notification_id} className="bg-slate-900 border-slate-800 hover:border-cyan-700 transition">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-mono text-slate-400">{item.notification_id}</span>
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <div className={`px-2 py-1 rounded text-xs text-white ${getThreatColor(item.threat_category)}`}>
                          {item.threat_category}
                        </div>
                        <Badge variant="outline">{item.department}</Badge>
                        <Badge variant="secondary">{item.channel}</Badge>
                      </div>
                      
                      <div className="text-sm text-slate-300">
                        <span className="text-slate-500">From:</span> {item.sender}
                        <span className="text-slate-500 ml-4">To:</span> {item.receiver}
                      </div>
                      
                      <p className="text-sm text-slate-400 line-clamp-2">{item.content}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock3 className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Risk: {riskBandLabel(Number(item.ai_analysis?.risk_score ?? item.risk_score ?? 0))} ({formatRiskPercent(Number(item.ai_analysis?.risk_score ?? item.risk_score ?? 0))}%)
                        </div>
                        {item.contains_url === 1 && (
                          <div className="flex items-center gap-1">
                            <Link className="w-3 h-3" />
                            Contains URL
                          </div>
                        )}
                        {item.attachment_type !== 'none' && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            {item.attachment_type}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => fetchCaseDetails(item.notification_id)}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Details
                      </Button>
                      
                      {!item.assigned_analyst_id && (
                        <Button
                          size="sm"
                          onClick={() => assignToMe(item)}
                          variant="outline"
                          className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Assign to Me
                        </Button>
                      )}
                      
                      {item.assigned_analyst_id === user?.email && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedCase(item);
                            setSelectedAction(null);
                            setReviewNotes('');
                            fetchCaseDetails(item.notification_id);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredQueue.length === 0 && (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-10 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-3" />
                  <p className="text-white font-medium">No cases in review queue</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* My Cases Tab */}
        <TabsContent value="my-cases" className="space-y-4">
          <div className="space-y-3">
            {myCases.map((caseItem) => (
              <Card key={caseItem.case_id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-slate-400">{caseItem.case_id}</span>
                        <Badge className={getPriorityColor(caseItem.case_priority)}>
                          {caseItem.case_priority}
                        </Badge>
                        <Badge variant={caseItem.review_status === 'Approved' ? 'default' : 'secondary'}>
                          {caseItem.review_status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-slate-500">Notification:</span> {caseItem.notification_id}
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-slate-500">Threat:</span> {caseItem.threat_category} | 
                        <span className="text-slate-500">Risk:</span> {riskBandLabel(Number(caseItem.ai_analysis?.risk_score ?? caseItem.risk_score ?? 0))} ({formatRiskPercent(Number(caseItem.ai_analysis?.risk_score ?? caseItem.risk_score ?? 0))}%)
                      </div>
                      
                      {caseItem.analyst_feedback && (
                        <div className="text-sm">
                          <span className="text-slate-500">Feedback:</span> {caseItem.analyst_feedback}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => fetchCaseDetails(caseItem.notification_id)}
                      variant="outline"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {myCases.length === 0 && (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-10 text-center text-slate-400">
                  No cases assigned to you
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              {/* Threat Breakdown */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Threat Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.threatBreakdown.map((threat) => (
                      <div key={threat._id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getThreatColor(threat._id)}`} />
                          <span className="text-white">{threat._id}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">{threat.count}</div>
                          <div className="text-slate-400 text-sm">
                            {Math.round(threat.avgRiskScore * 100)}% avg risk
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Department Breakdown */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Department Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.departmentBreakdown.map((dept) => (
                      <div key={dept._id} className="flex items-center justify-between">
                        <span className="text-white">{dept._id}</span>
                        <div className="text-right">
                          <div className="text-white font-medium">{dept.count}</div>
                          <div className="text-slate-400 text-sm">
                            {Math.round(dept.avgRiskScore * 100)}% avg risk
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Team Workload */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Team Workload</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Analyst</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>In Review</TableHead>
                        <TableHead>Total Assigned</TableHead>
                        <TableHead>Avg Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workload.map((analyst) => (
                        <TableRow key={analyst._id}>
                          <TableCell className="text-white">{analyst.analyst_name}</TableCell>
                          <TableCell>{analyst.pending_count}</TableCell>
                          <TableCell>{analyst.in_review_count}</TableCell>
                          <TableCell>{analyst.total_assigned}</TableCell>
                          <TableCell>{Math.round(analyst.avg_time_to_review)}m</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Case Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-cyan-400" />
              Case Details - {caseDetails?.notification_id}
            </DialogTitle>
          </DialogHeader>
          
          {caseDetails && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-950 border border-slate-800">
                <TabsTrigger value="details">Notification Details</TabsTrigger>
                <TabsTrigger value="ai" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-400">
                  <ShieldAlert className="w-4 h-4 mr-2" /> AI Analysis
                </TabsTrigger>
                <TabsTrigger value="history">Action History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-500">Case ID:</span>
                      <div className="text-white font-mono">{caseDetails.case_id || 'Unassigned'}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Notification ID:</span>
                      <div className="text-white font-mono">{caseDetails.notification_id}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Department:</span>
                      <div className="text-white">{caseDetails.department}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Channel:</span>
                      <div className="text-white">{caseDetails.channel}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-500">Threat Category:</span>
                      <div className="text-white flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getThreatColor(caseDetails.threat_category)}`} />
                        {caseDetails.threat_category}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Risk Score:</span>
                      <div className={`text-lg font-bold ${
                        caseDetails.risk_score >= 0.7 ? 'text-red-400' :
                        caseDetails.risk_score >= 0.4 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {riskBandLabel(Number(caseDetails.ai_analysis?.risk_score ?? caseDetails.risk_score ?? 0))} ({formatRiskPercent(Number(caseDetails.ai_analysis?.risk_score ?? caseDetails.risk_score ?? 0))}%)
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span>
                      <div className="text-white">{caseDetails.review_status}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-2">Content:</span>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-300">
                    {caseDetails.content}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500">Sender:</span>
                    <div className="text-white">{caseDetails.sender}</div>
                    <div className="text-slate-400 text-sm">{caseDetails.sender_domain}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Receiver:</span>
                    <div className="text-white">{caseDetails.receiver}</div>
                  </div>
                </div>

                {(caseDetails.contains_url === 1 || caseDetails.attachment_type !== 'none') && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {caseDetails.contains_url === 1 && (
                      <div>
                        <span className="text-slate-500">URL:</span>
                        <div className="text-white text-blue-400">{caseDetails.url}</div>
                      </div>
                    )}
                    {caseDetails.attachment_type !== 'none' && (
                      <div>
                        <span className="text-slate-500">Attachment:</span>
                        <div className="text-white">{caseDetails.attachment_type}</div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ai" className="space-y-6">
                <div className={`p-4 rounded-lg border ${
                  caseDetails.risk_score >= 0.7 ? 'bg-red-500/10 border-red-500/30' :
                  caseDetails.risk_score >= 0.4 ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-green-500/10 border-green-500/30'
                }`}>
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5" /> AI Decision Reason
                  </h3>
                  <p className="text-slate-300">
                    {caseDetails.ai_explanation || "No detailed reasoning available."}
                  </p>
                </div>

                {caseDetails.signals && caseDetails.signals.length > 0 && (
                  <div>
                    <span className="text-slate-400 block mb-2 font-semibold">Detected Signals:</span>
                    <div className="flex flex-wrap gap-2">
                      {caseDetails.signals.map((signal, idx) => (
                        <Badge key={idx} variant="outline" className="border-slate-700 bg-slate-900">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {caseDetails.action_history && caseDetails.action_history.length > 0 ? (
                  <div className="space-y-2">
                    {caseDetails.action_history.map((action, index) => (
                      <div key={index} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-white font-medium">{action.action}</div>
                            <div className="text-slate-400 text-sm">by {action.performed_by_name}</div>
                            {action.comments && (
                              <div className="text-slate-300 text-sm mt-1">{action.comments}</div>
                            )}
                          </div>
                          <div className="text-slate-500 text-sm">
                            {new Date(action.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No action history recorded yet.
                  </div>
                )}
              </TabsContent>

              {/* Fixed Bottom Review Actions for Assigned Cases */}
              {selectedCase && selectedCase.assigned_analyst_id === user?.email && (
                <div className="mt-8 pt-4 border-t border-slate-800 space-y-4">
                  <div>
                    <span className="text-slate-500 block mb-2 font-medium">Investigative Actions:</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button
                        onClick={() => setSelectedAction('reject')}
                        variant={selectedAction === 'reject' ? 'default' : 'outline'}
                        className={selectedAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600/50 text-red-400 hover:bg-red-600/10'}
                      >
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        Mark Malicious
                      </Button>
                      <Button
                        onClick={() => setSelectedAction('approve')}
                        variant={selectedAction === 'approve' ? 'default' : 'outline'}
                        className={selectedAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600/50 text-green-400 hover:bg-green-600/10'}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Safe
                      </Button>
                      <Button
                        onClick={() => setSelectedAction('escalate')}
                        variant={selectedAction === 'escalate' ? 'default' : 'outline'}
                        className={selectedAction === 'escalate' ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-600/50 text-orange-400 hover:bg-orange-600/10'}
                      >
                        <ArrowUpRight className="w-4 h-4 mr-2" />
                        Create Case
                      </Button>
                      <Button
                        onClick={() => setSelectedAction('escalate')}
                        variant="outline"
                        className="border-slate-600 text-slate-400 hover:bg-slate-800"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Req. Manual
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Textarea
                      rows={3}
                      placeholder="Enter investigation notes, reasoning, or escalation details..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setShowDetails(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={submitReview}
                      disabled={!selectedAction || submitting}
                      className="bg-cyan-600 hover:bg-cyan-700 min-w-[150px]"
                    >
                      {submitting ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Submit Verdict
                    </Button>
                  </div>
                </div>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
