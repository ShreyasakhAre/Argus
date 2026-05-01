'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/components/role-provider';
import { Mail, AlertTriangle, CheckCircle, Info, RefreshCw, Shield, MessageSquare, Users, Building, DollarSign, Smartphone, QrCode, Eye, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import type { Notification, Explanation, SourceApp } from '@/lib/ml-service';
import { ScannerTools } from '@/components/scanner-tools';
import { calculateSecurityScore, formatSecurityScore } from '@/lib/security-score';
import { 
  useNotificationBulkSelect, 
  SelectAllNotSafeBar, 
  BulkActionBar, 
  BulkFeedbackToast,
  NotificationCheckbox,
  isNotSafe
} from '@/components/notification-bulk-actions';

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
  const [userFeedback, setUserFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExplanation, setSelectedExplanation] = useState<{ [key: string]: Explanation }>({});
  const [activeTab, setActiveTab] = useState<'notifications' | 'scanners'>('notifications');
  const [bulkMode, setBulkMode] = useState(false);
  const [safeSectionCollapsed, setSafeSectionCollapsed] = useState(true);

  // Calculate security score
  const securityScore = calculateSecurityScore(notifications, userFeedback);
  const formattedScore = formatSecurityScore(securityScore.score);

  const {
    selectedIds,
    notSafeCount,
    allNotSafeSelected,
    someSelected,
    toggleSelect,
    selectAllNotSafe,
    deselectAll,
    handleBulkAction,
    feedback: bulkFeedback,
  } = useNotificationBulkSelect(notifications);

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    deselectAll();
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Notifications</h2>
          <p className="text-muted-foreground">View your notifications and their security analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'notifications' && (
            <>
              <button
                onClick={toggleBulkMode}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  bulkMode 
                    ? 'bg-cyan-600 text-white' 
                    : 'border border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:bg-cyan-500/10'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Bulk Mode
              </button>
              <Badge variant="outline" className="text-red-500 border-red-500">
                {notSafeCount} Not Safe
              </Badge>
            </>
          )}
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <p className="text-3xl font-bold text-green-500">{notifications.length - notSafeCount}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Not Safe</p>
                    <p className="text-3xl font-bold text-red-500">{notSafeCount}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-card border-border ${formattedScore.bgColor} ${formattedScore.borderColor}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Security Score</p>
                    <p className={`text-3xl font-bold ${formattedScore.color}`}>
                      {formattedScore.display}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-muted-foreground">
                        {securityScore.grade === 'excellent' ? 'Excellent' : 
                         securityScore.grade === 'good' ? 'Good' : 'Needs Improvement'}
                      </span>
                    </div>
                  </div>
                  <Shield className={`w-10 h-10 ${formattedScore.color}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          <BulkFeedbackToast message={bulkFeedback} />
          
          {bulkMode && (
            <>
              <SelectAllNotSafeBar 
                allNotSafeSelected={allNotSafeSelected}
                notSafeCount={notSafeCount}
                onToggle={selectAllNotSafe}
              />
              <BulkActionBar 
                selectedCount={selectedIds.size}
                role="employee"
                onAction={handleBulkAction}
                onClear={deselectAll}
              />
            </>
          )}

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
                <Card className="bg-card border-border">
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                    <p className="text-foreground">No not-safe notifications</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {(Array.isArray(notifications) ? notifications.filter(isNotSafe) : []).slice(0, 200).map((notification, idx) => (
                    <NotificationCard 
                      key={`${notification.notification_id}-${idx}`}
                      notification={notification}
                      bulkMode={bulkMode}
                      selectedIds={selectedIds}
                      toggleSelect={toggleSelect}
                      sourceAppIcons={sourceAppIcons}
                      sourceAppColors={sourceAppColors}
                      selectedExplanation={selectedExplanation}
                      fetchExplanation={fetchExplanation}
                    />
                  ))}
                </div>
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
                  Safe Notifications ({notifications.length - notSafeCount})
                </h3>
                {safeSectionCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                )}
              </button>
              
              {!safeSectionCollapsed && (
                <div className="flex flex-col gap-3">
                  {notifications.filter(n => !isNotSafe(n)).slice(0, 200).map((notification, idx) => (
                    <NotificationCard 
                      key={`${notification.notification_id}-${idx}`}
                      notification={notification}
                      bulkMode={false}
                      selectedIds={new Set()}
                      toggleSelect={() => {}}
                      sourceAppIcons={sourceAppIcons}
                      sourceAppColors={sourceAppColors}
                      selectedExplanation={selectedExplanation}
                      fetchExplanation={fetchExplanation}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
  bulkMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  sourceAppIcons: Record<SourceApp, React.ReactNode>;
  sourceAppColors: Record<SourceApp, string>;
  selectedExplanation: { [key: string]: Explanation };
  fetchExplanation: (id: string) => void;
}

function NotificationCard({
  notification,
  bulkMode,
  selectedIds,
  toggleSelect,
  sourceAppIcons,
  sourceAppColors,
  selectedExplanation,
  fetchExplanation,
}: NotificationCardProps) {
    const notSafe = (notification as any).risk >= 70 || (notification as any).confidence >= 0.7 || (notification as any).is_flagged;
    const notifId = (notification as any).id || (notification as any).notification_id || '';
    const source = (notification as any).source || (notification as any).source_app || 'System';
    const messageText = (notification as any).message || (notification as any).content || '';
    const riskLevel = (notification as any).risk_level || ((notification as any).severity === 'high' ? 'High' : (notification as any).severity === 'medium' ? 'Medium' : 'Low');
    const riskPct = Math.round(((notification as any).confidence ?? (notification as any).risk_score ?? 0) * 100);

  return (
    <div className={`bg-card border border-border hover:border-muted-foreground/30 transition-colors p-4 rounded-lg ${
      notSafe ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'
    }`}>
      <div className="flex items-start gap-3">
        {bulkMode && (
          <NotificationCheckbox
            notification={notification}
            isSelected={selectedIds.has(notifId)}
            onToggle={toggleSelect}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              {notSafe ? (
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
              <span className="font-mono text-sm text-muted-foreground">{notifId}</span>
              <Badge className={`${sourceAppColors[source as SourceApp] || 'bg-zinc-700'} flex items-center gap-1`}>
                {sourceAppIcons[source as SourceApp] || null}
                {source}
              </Badge>
              <Badge className={
                riskLevel === 'High' ? 'bg-red-500/20 text-red-400' :
                riskLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }>
                {riskLevel} ({riskPct}%)
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">{notification.department}</Badge>
              {notSafe && (
                <Badge className="bg-red-500/20 text-red-400">
                  Not Safe
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 ${
                riskLevel === 'High' ? 'text-red-500' :
                riskLevel === 'Medium' ? 'text-yellow-500' : 'text-green-500'
              }`} />
              <span className={`text-sm font-medium ${
                riskLevel === 'High' ? 'text-red-500' :
                riskLevel === 'Medium' ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {riskPct}% Risk
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <span className="text-muted-foreground">From: </span>
              <span className="text-foreground">{notification.sender || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Department: </span>
              <span className="text-foreground">{notification.department}</span>
            </div>
          </div>
          <p className="text-foreground bg-muted p-3 rounded-lg text-sm line-clamp-2 mb-2">{messageText}</p>
          
          {notSafe && (
            <div className="mt-3">
              <button
                onClick={() => fetchExplanation(notifId)}
                className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
              >
                <Info className="w-4 h-4" />
                Why was this flagged?
              </button>
              
              {selectedExplanation[notifId] && (
                <div className="mt-3 bg-cyan-900/20 border border-cyan-800 p-4 rounded-lg">
                  <p className="text-foreground text-sm mb-2">
                    {selectedExplanation[notifId].explanation.explanation_text}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedExplanation[notifId].explanation.top_features.map((feature, fIdx) => (
                      <Badge key={`${feature.feature}-${fIdx}`} className="bg-cyan-500/20 text-cyan-400 text-xs">
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
      </div>
    </div>
  );
}
