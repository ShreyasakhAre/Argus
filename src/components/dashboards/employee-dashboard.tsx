'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/components/role-provider';
import { Mail, AlertTriangle, CheckCircle, Info, RefreshCw, Shield, MessageSquare, Users, Building, DollarSign, Smartphone, QrCode, Eye } from 'lucide-react';
import type { Notification, Explanation, SourceApp } from '@/lib/ml-service';
import { ScannerTools } from '@/components/scanner-tools';

const sourceAppIcons: Record<SourceApp, React.ReactNode> = {
  'Email': <Mail className="w-4 h-4" />,
  'Slack': <MessageSquare className="w-4 h-4" />,
  'Microsoft Teams': <Users className="w-4 h-4" />,
  'HR Portal': <Building className="w-4 h-4" />,
  'Finance System': <DollarSign className="w-4 h-4" />,
  'Internal Mobile App': <Smartphone className="w-4 h-4" />,
};

const sourceAppColors: Record<SourceApp, string> = {
  'Email': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Slack': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Microsoft Teams': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'HR Portal': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Finance System': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Internal Mobile App': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

export function EmployeeDashboard() {
  const { orgId } = useRole();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExplanation, setSelectedExplanation] = useState<{ [key: string]: Explanation }>({});
  const [activeTab, setActiveTab] = useState<'notifications' | 'scanners'>('notifications');

  useEffect(() => {
    fetchNotifications();
  }, [orgId]);

  const fetchNotifications = async () => {
    setLoading(true);
    const res = await fetch(`/api/notifications?org_id=${orgId}`);
    const data = await res.json();
    setNotifications(data.notifications.slice(0, 10));
    setLoading(false);
  };

  const fetchExplanation = async (notificationId: string) => {
    if (selectedExplanation[notificationId]) return;
    
    const res = await fetch(`/api/explain/${notificationId}`);
    const data = await res.json();
    setSelectedExplanation(prev => ({ ...prev, [notificationId]: data }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div>;
  }

  const flaggedCount = notifications.filter(n => n.is_flagged).length;
  const safeCount = notifications.filter(n => !n.is_flagged).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Notifications</h2>
        <p className="text-muted-foreground">View your notifications and their security analysis</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'notifications' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eye className="w-4 h-4" />
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('scanners')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'scanners' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Scanners
        </button>
      </div>

      {activeTab === 'scanners' && <ScannerTools />}

      {activeTab === 'notifications' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Notifications</p>
                    <p className="text-3xl font-bold text-foreground">{notifications.length}</p>
                  </div>
                  <Mail className="w-10 h-10 text-cyan-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Safe</p>
                    <p className="text-3xl font-bold text-green-500">{safeCount}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Flagged</p>
                    <p className="text-3xl font-bold text-red-500">{flaggedCount}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card 
                key={notification.notification_id} 
                className={`bg-card border-border ${notification.is_flagged ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}`}
              >
                <CardContent className="py-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        {notification.is_flagged ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        <span className="font-mono text-sm text-muted-foreground">{notification.notification_id}</span>
                        <Badge className={`${sourceAppColors[notification.source_app]} flex items-center gap-1`}>
                          {sourceAppIcons[notification.source_app]}
                          {notification.source_app}
                        </Badge>
                        <Badge className={notification.is_flagged ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                          {notification.is_flagged ? 'Potentially Malicious' : 'Safe'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${
                          notification.risk_level === 'High' ? 'text-red-500' :
                          notification.risk_level === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                        }`} />
                        <span className={`text-sm font-medium ${
                          notification.risk_level === 'High' ? 'text-red-500' :
                          notification.risk_level === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {Math.round(notification.risk_score * 100)}% Risk
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">From: </span>
                        <span className="text-foreground">{notification.sender}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Department: </span>
                        <span className="text-foreground">{notification.department}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Source: </span>
                        <span className="text-foreground">{notification.source_app}</span>
                      </div>
                    </div>

                    <p className="text-foreground bg-muted p-3 rounded-lg text-sm">
                      {notification.content}
                    </p>

                    {notification.is_flagged && (
                      <div className="mt-3">
                        <button
                          onClick={() => fetchExplanation(notification.notification_id)}
                          className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
                        >
                          <Info className="w-4 h-4" />
                          Why was this flagged?
                        </button>
                        
                        {selectedExplanation[notification.notification_id] && (
                          <div className="mt-3 bg-cyan-900/20 border border-cyan-800 p-4 rounded-lg">
                            <p className="text-foreground text-sm mb-2">
                              {selectedExplanation[notification.notification_id].explanation.explanation_text}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedExplanation[notification.notification_id].explanation.top_features.map((feature, idx) => (
                                <Badge key={idx} className="bg-cyan-500/20 text-cyan-400 text-xs">
                                  {feature.feature.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
