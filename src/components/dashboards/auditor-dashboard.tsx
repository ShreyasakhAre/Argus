'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/components/role-provider';
import { FileText, AlertTriangle, CheckCircle, Clock, RefreshCw, Eye, Mail, MessageSquare, Users, Building, DollarSign, Smartphone } from 'lucide-react';
import type { Notification, Feedback, SourceApp } from '@/lib/ml-service';

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
  const [activeTab, setActiveTab] = useState<'notifications' | 'feedback'>('notifications');

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    const [notifRes, feedbackRes] = await Promise.all([
      fetch(`/api/notifications?org_id=${orgId}`),
      fetch('/api/feedback')
    ]);
    const notifData = await notifRes.json();
    const feedbackData = await feedbackRes.json();
    setNotifications(notifData.notifications);
    setFeedback(feedbackData.feedback);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div>;
  }

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
                <p className="text-3xl font-bold text-red-500">
                  {notifications.filter(n => n.is_flagged).length}
                </p>
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
                <p className="text-3xl font-bold text-green-500">
                  {notifications.filter(n => !n.is_flagged).length}
                </p>
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
      </div>

      {activeTab === 'notifications' ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-500" />
              Notification Audit Log (Read-Only)
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
                  {notifications.map((notification) => (
                    <tr key={notification.notification_id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                      <td className="py-3 px-4 font-mono text-zinc-300">{notification.notification_id}</td>
                      <td className="py-3 px-4 text-zinc-400">{notification.timestamp}</td>
                      <td className="py-3 px-4">
                        <Badge className={`${sourceAppColors[notification.source_app]} flex items-center gap-1 w-fit`}>
                          {sourceAppIcons[notification.source_app]}
                          <span className="text-xs">{notification.source_app}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">{notification.org_id}</td>
                      <td className="py-3 px-4 text-zinc-300">{notification.department}</td>
                      <td className="py-3 px-4 text-zinc-300 max-w-[200px] truncate">{notification.sender}</td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${
                          notification.risk_level === 'High' ? 'text-red-400' :
                          notification.risk_level === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {Math.round(notification.risk_score * 100)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={notification.is_flagged ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                          {notification.is_flagged ? 'Flagged' : 'Safe'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
                    {feedback.map((fb, idx) => (
                      <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                        <td className="py-3 px-4 font-mono text-zinc-300">{fb.notification_id}</td>
                        <td className="py-3 px-4">
                          <Badge className={fb.decision === 'confirm' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                            {fb.decision === 'confirm' ? 'Confirmed Malicious' : 'Marked Safe'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {fb.corrected_label === 1 ? 'Malicious' : 'Benign'}
                        </td>
                        <td className="py-3 px-4 text-zinc-400 max-w-[200px] truncate">
                          {fb.analyst_notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-zinc-400">{fb.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
