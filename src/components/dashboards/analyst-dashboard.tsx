'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/auth-provider';
import { useRole } from '@/components/role-provider';
import { SearchFilters, type SearchFilters as SearchFiltersType } from '@/components/search-filters';
import {
  AlertTriangle, CheckCircle, Eye, RefreshCw, Info, ListChecks, Mail, MessageSquare, Users, Building, DollarSign, Smartphone, Link, ShieldAlert, ShieldCheck, QrCode, ChevronDown, ChevronUp, TrendingUp, Activity
} from 'lucide-react';
import type { Notification, Explanation, SourceApp } from '@/lib/ml-service';
import type { LinkScanResult } from '@/lib/link-scanner';
import { ScannerTools } from '@/components/scanner-tools';
import { detectThreatPatterns, getPatternBadge } from '@/lib/threat-patterns';
import { createCase, getAllCases, updateCaseStatus, addCaseNote, type IncidentCase } from '@/lib/case-store';
import { logNotificationDecision, logCaseCreation } from '@/lib/audit-log-store';
import { getDomainReputation, getDomainRiskBadge } from '@/lib/domain-reputation';
import { shouldShowEscalationBanner } from '@/lib/escalation-engine';
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

interface LinkScanResponse {
  urls_found: number;
  results: LinkScanResult[];
  has_malicious: boolean;
  highest_risk: number;
}

export function AnalystDashboard() {
  const { orgId } = useRole();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [sourceApps, setSourceApps] = useState<SourceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [linkScan, setLinkScan] = useState<LinkScanResponse | null>(null);
  const [linkScanLoading, setLinkScanLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'scanners' | 'cases'>('review');
  const [safeSectionCollapsed, setSafeSectionCollapsed] = useState(true);
  const [cases, setCases] = useState<IncidentCase[]>([]);

  const handleCreateCase = async () => {
    if (!selectedNotification) return;
    
    if (!user) return;
    
    const newCase = createCase(selectedNotification, user.email || 'analyst');
    setCases(prev => [newCase, ...prev]);
    
    logCaseCreation(user.email || 'analyst', 'fraud_analyst', newCase.id, selectedNotification.notification_id);
    
    alert(`Incident Case Created: ${newCase.id}`);
    
    setNotifications(prev => prev.map(n => 
      n.notification_id === selectedNotification.notification_id 
        ? { ...n, status: 'investigating' }
        : n
    ));
  };

  // Calculate threat patterns from current notifications
  const threatPatterns = detectThreatPatterns(notifications);

  const {
    selectedIds,
    notSafeCount,
    allNotSafeSelected,
    someSelected,
    toggleSelect,
    selectAllNotSafe,
    deselectAll,
    handleBulkAction,
    feedback,
  } = useNotificationBulkSelect(notifications);

  useEffect(() => {
    fetchNotifications();
    fetchDepartments();
    fetchSourceApps();
    loadCases();
  }, [orgId]);

  const loadCases = () => {
    const allCases = getAllCases();
    const userCases = allCases.filter(c => c.created_by === 'current_user' || c.assigned_to === 'current_user');
    setCases(userCases);
  };

  const fetchNotifications = async (filters?: SearchFiltersType) => {
    setLoading(true);
    const params = new URLSearchParams({ org_id: orgId, flagged_only: 'true' });
    if (filters?.search) params.set('search', filters.search);
    if (filters?.department && filters.department !== 'all') params.set('department', filters.department);
    if (filters?.risk_level && filters.risk_level !== 'all') params.set('risk_level', filters.risk_level);
    if (filters?.source_app && filters.source_app !== 'all') params.set('source_app', filters.source_app);
    
    const res = await fetch(`/api/notifications?${params}`);
    const data = await res.json();
    
    // Debug: Log the raw notification data
    console.log('Raw notifications data:', data.notifications);
    if (data.notifications && data.notifications.length > 0) {
      console.log('First notification object:', data.notifications[0]);
      console.log('Available fields:', Object.keys(data.notifications[0]));
    }
    
    // Normalize notification data before setting state
    const normalizedNotifications = data.notifications.map((n: any) => ({
      notification_id: n.notification_id ?? n.id ?? '',
      sender: n.sender ?? n.from ?? 'Unknown Sender',
      receiver: n.receiver ?? n.to ?? 'Unknown Recipient',
      content: n.content ?? n.message ?? '',
      timestamp: n.timestamp,
      risk_score: n.risk_score ?? 0,
      risk_level: n.risk_level ?? 'Unknown',
      is_flagged: n.is_flagged ?? false,
      source_app: n.source_app ?? 'Unknown',
      department: n.department ?? 'Unknown',
      status: n.status ?? 'open'
    }));
    
    console.log('Normalized notifications:', normalizedNotifications);
    setNotifications(normalizedNotifications);
    setLoading(false);
  };

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const data = await res.json();
    setDepartments(data.departments);
  };

  const fetchSourceApps = async () => {
    const res = await fetch('/api/source-apps');
    const data = await res.json();
    setSourceApps(data.source_apps);
  };

  const fetchExplanation = async (notificationId: string) => {
    const res = await fetch(`/api/explain/${notificationId}`);
    const data = await res.json();
    setExplanation(data);
  };

  const scanLinks = async (content: string) => {
    setLinkScanLoading(true);
    try {
      const res = await fetch('/api/scan-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      });
      const data = await res.json();
      setLinkScan(data);
    } catch {
      setLinkScan(null);
    }
    setLinkScanLoading(false);
  };

  const handleViewDetails = async (notification: Notification) => {
    setSelectedNotification(notification);
    setExplanation(null);
    setLinkScan(null);
    setNotes('');
    await Promise.all([
      fetchExplanation(notification.notification_id),
      scanLinks(notification.content)
    ]);
  };

  const handleFeedback = async (decision: 'confirm' | 'false_positive') => {
    if (!selectedNotification) return;
    setFeedbackSubmitting(true);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notification_id: selectedNotification?.notification_id,
        decision,
        corrected_label: decision === 'confirm' ? 1 : 0,
        analyst_notes: notes
      })
    });
    setNotifications(prev => prev.filter(n => n.notification_id !== selectedNotification?.notification_id));
    setSelectedNotification(null);
    setFeedbackSubmitting(false);
  };

  const handleBulkFeedback = async (decision: 'confirm' | 'false_positive') => {
    if (selectedIds.size === 0) return;
    setFeedbackSubmitting(true);
    
    const feedbackList = Array.from(selectedIds).map(id => ({
      notification_id: id,
      decision,
      corrected_label: decision === 'confirm' ? 1 : 0
    }));
    
    await fetch('/api/bulk-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackList })
    });
    
    setNotifications(prev => prev.filter(n => !selectedIds.has(n.notification_id)));
    deselectAll();
    setBulkMode(false);
    setFeedbackSubmitting(false);
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    deselectAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Fraud Analyst Dashboard</h2>
          <p className="text-muted-foreground">Review and provide feedback on flagged notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'review' && (
            <>
              <Button
                variant={bulkMode ? "default" : "outline"}
                size="sm"
                onClick={toggleBulkMode}
                className={bulkMode ? "bg-cyan-600" : ""}
              >
                <ListChecks className="w-4 h-4 mr-1" />
                Bulk Mode
              </Button>
              <Badge variant="outline" className="text-red-500 border-red-500">
                {notSafeCount} Not Safe
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Auto-Escalation Banner */}
      {shouldShowEscalationBanner(notifications, user?.email || '') && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 mb-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">
              🚨 Auto-Escalated: Critical Risk Detected - High-risk notification automatically escalated for investigation
            </span>
          </div>
        </div>
      )}

      {/* Analyst Performance Insights */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-foreground">Analyst Performance Insights</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          {(() => {
            // Calculate metrics from existing notifications
            const totalReviewed = notifications.length;
            const avgRisk = notifications.length > 0 
              ? notifications.reduce((sum, n) => sum + (n.risk_score || 0), 0) / notifications.length 
              : 0;
            
            // For demo purposes, calculate mock metrics based on available data
            // In production, these would come from actual decision tracking
            const flaggedCount = notifications.filter(n => n.is_flagged).length;
            const overrideRate = totalReviewed > 0 ? (flaggedCount * 15) / totalReviewed : 0; // Mock calculation
            const escalationRate = totalReviewed > 0 ? (flaggedCount * 8) / totalReviewed : 0; // Mock calculation
            
            return [
              {
                label: 'Total Reviewed',
                value: totalReviewed.toString(),
                color: 'text-cyan-400'
              },
              {
                label: 'Avg Risk Score',
                value: `${Math.round(avgRisk * 100)}%`,
                color: 'text-orange-400'
              },
              {
                label: 'Override Rate',
                value: `${Math.round(overrideRate)}%`,
                color: overrideRate > 20 ? 'text-red-400' : 'text-green-400'
              },
              {
                label: 'Escalation Rate',
                value: `${Math.round(escalationRate)}%`,
                color: escalationRate > 10 ? 'text-yellow-400' : 'text-blue-400'
              }
            ];
          })().map((metric, idx) => (
            <div key={idx} className="text-center">
              <p className="text-muted-foreground text-xs mb-1">{metric.label}</p>
              <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'review' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eye className="w-4 h-4" />
          Review Queue
        </button>
        <button
          onClick={() => setActiveTab('scanners')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'scanners' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-4 h-4" />
          Scanner Tools
        </button>
        <button
          onClick={() => setActiveTab('cases')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'cases' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Info className="w-4 h-4" />
          Cases ({cases.length})
        </button>
      </div>

      {activeTab === 'scanners' && <ScannerTools />}
      
      {activeTab === 'cases' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Incident Cases</h3>
              <p className="text-muted-foreground">Manage and track security incidents</p>
            </div>
            <Button onClick={loadCases} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
          
          {cases.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Info className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Cases Created</h3>
                <p className="text-muted-foreground">Create incident cases from flagged notifications to track investigations.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {cases.map((caseItem) => (
                <Card key={caseItem.id} className="bg-card border-border">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">{caseItem.id}</span>
                        <Badge className={
                          caseItem.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                          caseItem.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                          caseItem.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }>
                          {caseItem.priority}
                        </Badge>
                      </div>
                      <Badge className={
                          caseItem.status === 'Open' ? 'bg-gray-500/20 text-gray-400' :
                          caseItem.status === 'Investigating' ? 'bg-blue-500/20 text-blue-400' :
                          caseItem.status === 'Escalated' ? 'bg-red-500/20 text-red-400' :
                          'bg-green-500/20 text-green-400'
                        }>
                          {caseItem.status}
                        </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Notification ID:</span>
                        <span className="text-foreground font-mono">{caseItem.notification_id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <span className="text-foreground">{new Date(caseItem.created_at).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Assigned To:</span>
                        <span className="text-foreground">{caseItem.assigned_to || 'Unassigned'}</span>
                      </div>
                      {caseItem.notes.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Notes:</span>
                          <div className="mt-1 space-y-1">
                            {caseItem.notes.map((note, idx) => (
                              <div key={idx} className="text-xs bg-muted p-2 rounded">
                                {note}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline">
                        Assign
                      </Button>
                      <Button size="sm" variant="outline">
                        Add Note
                      </Button>
                      <Button size="sm" variant="outline">
                        Change Status
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'review' && (
        <>
          <SearchFilters departments={departments} sourceApps={sourceApps} onSearch={fetchNotifications} />

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
                role="fraud_analyst"
                onAction={handleBulkAction}
                onClear={deselectAll}
              />
            </>
          )}

          {notifications.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-xl text-foreground">No notifications pending review</p>
                <p className="text-muted-foreground mt-2">All caught up! Check back later for new alerts.</p>
              </CardContent>
            </Card>
          ) : (
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
                    {notifications.filter(isNotSafe).slice(0, 200).map((notification) => (
                      <NotificationCard 
                        key={notification.notification_id}
                        notification={notification}
                        bulkMode={bulkMode}
                        selectedIds={selectedIds}
                        toggleSelect={toggleSelect}
                        sourceAppIcons={sourceAppIcons}
                        sourceAppColors={sourceAppColors}
                        onViewDetails={handleViewDetails}
                        selectedNotification={selectedNotification}
                        linkScanLoading={linkScanLoading}
                        linkScan={linkScan}
                        explanation={explanation}
                        notes={notes}
                        setNotes={setNotes}
                        feedbackSubmitting={feedbackSubmitting}
                        handleFeedback={handleFeedback}
                        handleCreateCase={handleCreateCase}
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
                    {notifications.filter(n => !isNotSafe(n)).slice(0, 200).map((notification) => (
                      <NotificationCard 
                        key={notification.notification_id}
                        notification={notification}
                        bulkMode={false}
                        selectedIds={new Set()}
                        toggleSelect={() => {}}
                        sourceAppIcons={sourceAppIcons}
                        sourceAppColors={sourceAppColors}
                        onViewDetails={handleViewDetails}
                        selectedNotification={selectedNotification}
                        linkScanLoading={linkScanLoading}
                        linkScan={linkScan}
                        explanation={explanation}
                        notes={notes}
                        setNotes={setNotes}
                        feedbackSubmitting={feedbackSubmitting}
                        handleFeedback={handleFeedback}
                        handleCreateCase={handleCreateCase}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
  onViewDetails: (notification: Notification) => void;
  selectedNotification: Notification | null;
  linkScanLoading: boolean;
  linkScan: LinkScanResponse | null;
  explanation: Explanation | null;
  notes: string;
  setNotes: (notes: string) => void;
  feedbackSubmitting: boolean;
  handleFeedback: (decision: 'confirm' | 'false_positive') => void;
  handleCreateCase: () => Promise<void>;
}

function NotificationCard({
  notification,
  bulkMode,
  selectedIds,
  toggleSelect,
  sourceAppIcons,
  sourceAppColors,
  onViewDetails,
  selectedNotification,
  linkScanLoading,
  linkScan,
  explanation,
  notes,
  setNotes,
  feedbackSubmitting,
  handleFeedback,
  handleCreateCase,
}: NotificationCardProps) {
  return (
    <Card className="bg-card border-border hover:border-muted-foreground/30 transition-colors">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {bulkMode && (
            <NotificationCheckbox
              notification={notification}
              isSelected={selectedIds.has(notification.notification_id)}
              onToggle={toggleSelect}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <span className="font-mono text-sm text-muted-foreground">{notification.notification_id}</span>
                <Badge className={`${sourceAppColors[notification.source_app]} flex items-center gap-1`}>
                  {sourceAppIcons[notification.source_app]}
                  {notification.source_app}
                </Badge>
                <Badge className={
                  (notification.risk_level as string) === 'Critical' ? 'bg-red-500/20 text-red-400' :
                  (notification.risk_level as string) === 'Suspicious' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }>
                  {notification.risk_level} ({Math.round(notification.risk_score * 100)}%)
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">{notification.department}</Badge>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 shrink-0" onClick={() => onViewDetails(notification)}>
                    <Eye className="w-4 h-4 mr-1" /> Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Review Flagged Notification
                    </DialogTitle>
                  </DialogHeader>
                  
                  {selectedNotification && (
                    <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-120px)] px-1">
                      <div className="bg-muted p-4 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">{selectedNotification?.notification_id ?? ""}</span>
                            <Badge className={`${sourceAppColors[selectedNotification?.source_app ?? 'Email']} flex items-center gap-1`}>
                              {sourceAppIcons[selectedNotification?.source_app ?? 'Email']}
                              {selectedNotification?.source_app ?? "Unknown"}
                            </Badge>
                          </div>
                          <Badge className="bg-red-500/20 text-red-400">
                            Risk: {Math.round((selectedNotification?.risk_score ?? 0) * 100)}%
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <p><span className="text-muted-foreground">From:</span> <span className="text-foreground">{selectedNotification.sender}</span></p>
                          <p><span className="text-muted-foreground">To:</span> <span className="text-foreground">{selectedNotification.receiver}</span></p>
                          <p><span className="text-muted-foreground">Dept:</span> <span className="text-foreground">{selectedNotification.department}</span></p>
                          <p><span className="text-muted-foreground">Source:</span> <span className="text-foreground">{selectedNotification.source_app}</span></p>
                        </div>
                        
                        {/* Domain Reputation Badge */}
                        {(() => {
                          if (selectedNotification.sender) {
                            const domainReputation = getDomainReputation(selectedNotification.sender);
                            const riskBadge = getDomainRiskBadge(domainReputation);
                            
                            return (
                              <div className="mt-2">
                                <span className="text-muted-foreground text-xs">Sender Domain Risk:</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs border rounded ${riskBadge.className}`}>
                                  {riskBadge.score > 0 && `+${riskBadge.score}`}
                                  {riskBadge.text}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        <p className="text-foreground bg-background p-3 rounded wrap-break-word">{selectedNotification.content}</p>
                      </div>

                      {/* Decision Confidence Indicator */}
                      <div className="bg-muted p-4 rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400" />
                          <span className="font-semibold text-foreground">AI vs Human Decision</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">AI Risk Score</p>
                            <p className="text-lg font-bold text-foreground">
                              {Math.round((selectedNotification?.risk_score ?? 0) * 100)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">AI Classification</p>
                            <Badge className={selectedNotification?.is_flagged ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                              {selectedNotification?.is_flagged ? 'Malicious' : 'Safe'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-border">
                          <p className="text-muted-foreground text-sm mb-2">Confidence Gap Analysis</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground">Alignment Score</span>
                            {(() => {
                              const aiRisk = (selectedNotification?.risk_score ?? 0) * 100;
                              const aiFlagged = selectedNotification?.is_flagged ?? false;
                              const decisionThreshold = 50;
                              const confidenceGap = Math.abs(aiRisk - decisionThreshold);
                              
                              return (
                                <Badge className={
                                  confidenceGap <= 25 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-red-500/20 text-red-400'
                                }>
                                  {confidenceGap <= 25 ? '✓ Aligned' : `⚠ Gap: ${Math.round(confidenceGap)}%`}
                                </Badge>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {linkScanLoading ? (
                        <div className="flex items-center justify-center py-4 bg-muted rounded-lg">
                          <RefreshCw className="w-5 h-5 animate-spin text-cyan-500 mr-2" />
                          <span className="text-muted-foreground">Scanning links...</span>
                        </div>
                      ) : linkScan && linkScan.urls_found > 0 ? (
                        <div className={`p-4 rounded-lg border overflow-hidden ${linkScan.has_malicious ? 'bg-red-900/20 border-red-800' : 'bg-emerald-900/20 border-emerald-800'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Link className={`w-5 h-5 ${linkScan.has_malicious ? 'text-red-400' : 'text-emerald-400'}`} />
                            <span className={`font-semibold ${linkScan.has_malicious ? 'text-red-400' : 'text-emerald-400'}`}>
                              Link Analysis ({linkScan.urls_found} URL{linkScan.urls_found > 1 ? 's' : ''} found)
                            </span>
                            {linkScan.has_malicious && (
                              <Badge className="bg-red-500/20 text-red-400 ml-auto">
                                <ShieldAlert className="w-3 h-3 mr-1" />
                                Malicious Links Detected
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-3">
                            {linkScan.results.map((result, idx) => (
                              <div key={idx} className="bg-background/50 p-3 rounded-lg overflow-hidden">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {result.is_malicious ? (
                                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                                    ) : (
                                      <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                                    )}
                                    <span className="text-muted-foreground text-sm font-mono wrap-break-word">{result.url}</span>
                                  </div>
                                  <Badge className={
                  (result.risk_level as string) === 'Critical' ? 'bg-red-500/20 text-red-400 shrink-0' :
                  (result.risk_level as string) === 'Suspicious' ? 'bg-yellow-500/20 text-yellow-400 shrink-0' :
                  'bg-green-500/20 text-green-400 shrink-0'
                }>
                                    {result.risk_level} ({(() => {
                                      const score = result.risk_score;
                                      const percentage = score < 1 ? Math.round(score * 100) : Math.min(Math.round(score), 100);
                                      return `${percentage}%`;
                                    })()})
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2 wrap-break-word">{result.explanation}</p>
                                <div className="flex flex-wrap gap-1">
                                  {result.feature_breakdown.filter(f => f.risk_impact === 'positive').slice(0, 4).map((f, i) => (
                                    <Badge key={i} className="bg-red-500/10 text-red-300 text-xs">
                                      {f.feature.replace(/_/g, ' ')}
                                    </Badge>
                                  ))}
                                  {result.feature_breakdown.filter(f => f.risk_impact === 'negative').slice(0, 2).map((f, i) => (
                                    <Badge key={i} className="bg-green-500/10 text-green-300 text-xs">
                                      {f.feature.replace(/_/g, ' ')}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {explanation ? (
                        <div className="bg-cyan-900/20 border border-cyan-800 p-4 rounded-lg overflow-hidden">
                          <div className="flex items-center gap-2 mb-3">
                            <Info className="w-5 h-5 text-cyan-400" />
                            <span className="font-semibold text-cyan-400">AI Explanation</span>
                          </div>
                          <p className="text-foreground mb-3 wrap-break-word">{explanation.explanation.explanation_text}</p>
                          <div className="space-y-2">
                            {explanation.explanation.top_features.map((feature, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground wrap-break-word">{feature.feature.replace(/_/g, ' ')}</span>
                                <Badge className={feature.direction === 'increases' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                                  {feature.direction === 'increases' ? '+' : '-'}{Math.round(Math.abs(feature.impact) * 100)}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
                        </div>
                      )}

                      <Textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about your decision..."
                        className="bg-muted border-border text-foreground resize-none"
                        rows={3}
                      />

                      <div className="flex gap-3">
                        <Button onClick={() => handleFeedback('confirm')} disabled={feedbackSubmitting} className="flex-1 bg-red-600 hover:bg-red-700">
                          <AlertTriangle className="w-4 h-4 mr-2" /> Confirm Malicious
                        </Button>
                        <Button onClick={() => handleFeedback('false_positive')} disabled={feedbackSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" /> Mark Safe
                        </Button>
                        <Button onClick={handleCreateCase} disabled={feedbackSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                          <Info className="w-4 h-4 mr-2" /> Create Incident Case
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
            
            {selectedNotification && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div><span className="text-muted-foreground">From: </span><span className="text-foreground">{selectedNotification.sender}</span></div>
                  <div><span className="text-muted-foreground">To: </span><span className="text-foreground">{selectedNotification.receiver}</span></div>
                </div>
                <p className="text-foreground bg-muted p-3 rounded-lg text-sm line-clamp-2 mb-2">{selectedNotification.content}</p>
                <p className="text-xs text-muted-foreground">{selectedNotification.timestamp ?? ""}</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
