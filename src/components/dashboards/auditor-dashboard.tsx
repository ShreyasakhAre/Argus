'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRole } from '@/components/role-provider';
import { FileText, AlertTriangle, CheckCircle, Clock, RefreshCw, Eye, Mail, MessageSquare, Users, Building, DollarSign, Smartphone, ChevronDown, ChevronUp, Download, User, TrendingUp, AlertCircle } from 'lucide-react';
import type { Notification, Feedback, SourceApp } from '@/lib/ml-service';
import { isNotSafe } from '@/components/notification-bulk-actions';
import { getAuditLogs, logNotificationDecision } from '@/lib/audit-log-store';
import { initSocketConnection } from '@/lib/socket';

const sourceAppIcons: Record<SourceApp, React.ReactNode> = {
  'Email': <Mail className="w-3 h-3" />,
  'Slack': <MessageSquare className="w-3 h-3" />,
  'Microsoft Teams': <Users className="w-3 h-3" />,
  'HR Portal': <Building className="w-3 h-3" />,
  'Finance System': <DollarSign className="w-3 h-3" />,
  'Internal Mobile App': <Smartphone className="w-3 h-3" />,
};

const sourceAppColors: Record<SourceApp, string> = {
  'Email': 'bg-blue-500/20 text-blue-400',
  'Slack': 'bg-purple-500/20 text-purple-400',
  'Microsoft Teams': 'bg-indigo-500/20 text-indigo-400',
  'HR Portal': 'bg-emerald-500/20 text-emerald-400',
  'Finance System': 'bg-amber-500/20 text-amber-400',
  'Internal Mobile App': 'bg-pink-500/20 text-pink-400',
};

export function AuditorDashboard() {
  const { orgId } = useRole();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notifications' | 'feedback' | 'governance'>('notifications');
  const [safeSectionCollapsed, setSafeSectionCollapsed] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Real-time socket listener for audit updates
    const socket = initSocketConnection();
    const handleAuditUpdate = (newFeedback: any) => {
      console.log("📈 Auditor received update:", newFeedback);
      setFeedback(prev => [newFeedback, ...prev]);
    };

    socket.on("audit_update", handleAuditUpdate);

    return () => {
      socket.off("audit_update", handleAuditUpdate);
    };
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notifRes, feedbackRes] = await Promise.all([
        fetch(`/api/notifications?org_id=${orgId}&limit=300`),
        fetch('/api/analyst-feedback')
      ]);

      // Safe parse notifications
      let notifData: any = {};
      try { notifData = JSON.parse(await notifRes.text()); } catch { /* ignore */ }

      // Safe parse feedback
      let feedbackData: any = {};
      try { feedbackData = JSON.parse(await feedbackRes.text()); } catch { /* ignore */ }

      setNotifications(Array.isArray(notifData.notifications) ? notifData.notifications : []);
      setFeedback(Array.isArray(feedbackData.feedback) ? feedbackData.feedback : []);
    } catch (err) {
      console.error('[Auditor] fetchData error:', err);
      setNotifications([]);
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div>;
  }

  const notSafeCount = notifications.filter(isNotSafe).length;
  const safeCount = notifications.length - notSafeCount;

  // Calculate governance metrics
  const governanceMetrics = {
    overrideRate: feedback.length > 0 ? 
      Math.round((feedback.filter(f => f.action === 'OVERRIDE' || f.action === 'MARK_SAFE').length / feedback.length) * 100) : 0,
    falsePositiveRate: feedback.length > 0 ?
      Math.round((feedback.filter(f => f.action === 'OVERRIDE' || f.action === 'MARK_SAFE').length / feedback.length) * 100) : 0,
    avgReviewTime: 12
  };

  const exportComplianceReport = () => {
    const csvContent = [
      ['Notification ID', 'Risk Score', 'AI Decision', 'Analyst Decision', 'Timestamp', 'Department'],
      ...notifications.map(n => {
        const feedbackRecord = feedback.find(f => f.notification_id === n.notification_id);
        return [
          n.notification_id,
          ((n.risk_score ) > 1 ? Math.round(n.risk_score ) : Math.round((n.risk_score ) * 100)) + '%',
          n.is_flagged ? 'Malicious' : 'Safe',
          feedbackRecord?.decision ?? 'N/A',
          n.timestamp,
          n.department
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${orgId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Auditor Dashboard</h2>
        <p className="text-zinc-400">Read-only access to notification logs and audit trails</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Records</p>
                <p className="text-3xl font-bold text-white">{notifications.length}</p>
              </div>
              <FileText className="w-10 h-10 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Flagged</p>
                <p className="text-3xl font-bold text-red-500">{notSafeCount}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Safe</p>
                <p className="text-3xl font-bold text-green-500">{safeCount}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Feedback Records</p>
                <p className="text-3xl font-bold text-purple-500">{feedback.length}</p>
              </div>
              <Clock className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'notifications' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Notification Logs
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'feedback' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Audit Trail
        </button>
        <button
          onClick={() => setActiveTab('governance')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'governance' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Governance
        </button>
      </div>

      {activeTab === 'notifications' ? (
        <div className="space-y-6">
          {/* Not Safe Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Not Safe Notifications ({notSafeCount})
              </h3>
            </div>
            
            {notifications.filter(isNotSafe).length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-zinc-300">No not-safe notifications</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-cyan-500" />
                    Not Safe Notifications (Read-Only)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">ID</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Timestamp</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Source</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Org</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Department</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Sender</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Risk</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(notifications ?? []).filter(isNotSafe).slice(0, 200).map((notification: any, idx: number) => {
                          // Support both new schema (id, source, message, severity, confidence) and legacy
                          const notifId = notification.id || notification.notification_id || `row-${idx}`;
                          const source  = notification.source || notification.source_app || notification.channel || '—';
                          const orgId_  = notification.org   || notification.org_id || '—';
                          const sender_ = notification.sender || '—';
                          const ts      = notification.timestamp ? new Date(notification.timestamp).toLocaleString() : '—';
                          const riskLevel = notification.risk_level || (notification.severity === 'high' ? 'High' : notification.severity === 'medium' ? 'Medium' : 'Low');
                          const riskPct   = Math.round(((notification.confidence ?? notification.risk_score ?? 0)) * 100);
                          return (
                          <tr key={`${notifId}-${idx}`} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                            <td className="py-3 px-4 font-mono text-zinc-300">{notifId}</td>
                            <td className="py-3 px-4 text-zinc-400">{ts}</td>
                            <td className="py-3 px-4">
                              <Badge className={`${(sourceAppColors as any)[source] || 'bg-zinc-700/50 text-zinc-300'} flex items-center gap-1 w-fit`}>
                                {(sourceAppIcons as any)[source] || null}
                                <span className="text-xs">{source}</span>
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-zinc-300">{orgId_}</td>
                            <td className="py-3 px-4 text-zinc-300">{notification.department || '—'}</td>
                            <td className="py-3 px-4 text-zinc-300 max-w-[200px] truncate">{sender_}</td>
                            <td className="py-3 px-4">
                              <span className={`font-medium ${
                                riskLevel === 'High'   ? 'text-red-400' :
                                riskLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                              }`}>{riskPct}%</span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className="bg-red-500/20 text-red-400">Not Safe</Badge>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Safe Section */}
          <div className="space-y-3">
            <button
              onClick={() => setSafeSectionCollapsed(!safeSectionCollapsed)}
              className="flex items-center justify-between w-full text-left group"
            >
              <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Safe Notifications ({safeCount})
              </h3>
              {safeSectionCollapsed ? (
                <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300" />
              ) : (
                <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300" />
              )}
            </button>
            
            {!safeSectionCollapsed && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-cyan-500" />
                    Safe Notifications (Read-Only)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">ID</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Timestamp</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Source</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Org</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Department</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Sender</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Risk</th>
                          <th className="text-left py-3 px-4 text-zinc-400 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(notifications ?? []).filter((n: any) => !isNotSafe(n)).slice(0, 200).map((notification: any, idx: number) => {
                          const notifId  = notification.id || notification.notification_id || `safe-${idx}`;
                          const source   = notification.source || notification.source_app || notification.channel || '—';
                          const orgId_   = notification.org   || notification.org_id || '—';
                          const sender_  = notification.sender || '—';
                          const ts       = notification.timestamp ? new Date(notification.timestamp).toLocaleString() : '—';
                          const riskLevel = notification.risk_level || (notification.severity === 'high' ? 'High' : notification.severity === 'medium' ? 'Medium' : 'Low');
                          const riskPct   = Math.round(((notification.confidence ?? notification.risk_score ?? 0)) * 100);
                          return (
                          <tr key={`${notifId}-${idx}`} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                            <td className="py-3 px-4 font-mono text-zinc-300">{notifId}</td>
                            <td className="py-3 px-4 text-zinc-400">{ts}</td>
                            <td className="py-3 px-4">
                              <Badge className={`${(sourceAppColors as any)[source] || 'bg-zinc-700/50 text-zinc-300'} flex items-center gap-1 w-fit`}>
                                {(sourceAppIcons as any)[source] || null}
                                <span className="text-xs">{source}</span>
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-zinc-300">{orgId_}</td>
                            <td className="py-3 px-4 text-zinc-300">{notification.department || '—'}</td>
                            <td className="py-3 px-4 text-zinc-300 max-w-[200px] truncate">{sender_}</td>
                            <td className="py-3 px-4">
                              <span className={`font-medium ${
                                riskLevel === 'High'   ? 'text-red-400' :
                                riskLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                              }`}>{riskPct}%</span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className="bg-green-500/20 text-green-400">Safe</Badge>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Analyst Feedback Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedback.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">No feedback records yet</p>
                <p className="text-zinc-500 text-sm">Analyst decisions will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Notification ID</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Decision</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Corrected Label</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Notes</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(feedback) ? feedback : []).map((fb, idx) => (
                      <tr key={`${fb.notification_id}-${idx}`} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                        <td className="py-3 px-4 font-mono text-zinc-300">{fb.notification_id}</td>
                        <td className="py-3 px-4">
                          <Badge className={fb.action === 'BLOCK' || fb.action === 'MARK_MALICIOUS' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                            {fb.action}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {fb.analyst || 'System'}
                        </td>
                        <td className="py-3 px-4 text-zinc-400 max-w-[200px] truncate">
                          Action performed by security analyst
                        </td>
                        <td className="py-3 px-4 text-zinc-400">{new Date(fb.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'governance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Analyst Override Rate</p>
                    <p className="text-3xl font-bold text-amber-500">{governanceMetrics.overrideRate}%</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">False Positive Rate</p>
                    <p className="text-3xl font-bold text-red-500">{governanceMetrics.falsePositiveRate}%</p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Avg Review Time</p>
                    <p className="text-3xl font-bold text-cyan-500">{governanceMetrics.avgReviewTime}m</p>
                  </div>
                  <Clock className="w-10 h-10 text-cyan-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-500" />
                  Compliance Report
                </div>
                <Button onClick={exportComplianceReport} className="bg-cyan-600 hover:bg-cyan-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">AI vs Human Comparison</h4>
                  <div className="space-y-2">
                    {(Array.isArray(notifications) ? notifications : []).slice(0, 10).map((notification, idx) => {
                      const feedbackRecord = feedback.find(f => f.notification_id === notification.notification_id);
                      const isOverridden = feedbackRecord && 
                        (notification.is_flagged && (feedbackRecord?.decision ?? 'pending') === 'false_positive') ||
                        (!notification.is_flagged && (feedbackRecord?.decision ?? 'pending') === 'confirm');
                      
                      return isOverridden && feedbackRecord ? (
                        <div key={`${notification.notification_id}-${idx}`} className="bg-amber-900/20 border border-amber-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 font-medium">Decision Overridden</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div><span className="text-zinc-400">AI: </span>
                              <span className={notification.is_flagged ? 'text-red-400' : 'text-green-400'}>
                                {notification.is_flagged ? 'Malicious' : 'Safe'}
                              </span>
                            </div>
                            <div><span className="text-zinc-400">Analyst: </span>
                              <span className={(feedbackRecord?.decision ?? 'pending') === 'confirm' ? 'text-red-400' : 'text-green-400'}>
                                {(feedbackRecord?.decision ?? 'pending') === 'confirm' ? 'Confirmed Malicious' : 'Marked Safe'}
                              </span>
                            </div>
                            <div><span className="text-zinc-400">Risk: </span>
                              <span className="text-white">{((notification.risk_score ) > 1 ? Math.round(notification.risk_score ) : Math.round((notification.risk_score ) * 100))}%</span>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">Audit Log Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-zinc-800 rounded">
                      <span className="text-zinc-400">Total Audited</span>
                      <span className="text-white font-medium">{feedback.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-zinc-800 rounded">
                      <span className="text-zinc-400">Confirmed Malicious</span>
                      <span className="text-red-400 font-medium">
                        {(Array.isArray(feedback) ? feedback : []).filter(f => (f?.decision ?? 'pending') === 'confirm').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-zinc-800 rounded">
                      <span className="text-zinc-400">Marked Safe</span>
                      <span className="text-green-400 font-medium">
                        {(Array.isArray(feedback) ? feedback : []).filter(f => (f?.decision ?? 'pending') === 'false_positive').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-zinc-800 rounded">
                      <span className="text-zinc-400">Override Rate</span>
                      <span className="text-amber-400 font-medium">{governanceMetrics.overrideRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-500" />
            System Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-white mb-3">Recent Audit Trail</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Action</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Target</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {getAuditLogs(20).map((log, idx) => (
                    <tr key={`${log.target_id}-${idx}`} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                      <td className="py-3 px-4 text-zinc-300">{log.user}</td>
                      <td className="py-3 px-4 text-zinc-300">{log.role}</td>
                      <td className="py-3 px-4 text-zinc-300">{log.action}</td>
                      <td className="py-3 px-4 text-zinc-300 font-mono">{log.target_id}</td>
                      <td className="py-3 px-4 text-zinc-300">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
