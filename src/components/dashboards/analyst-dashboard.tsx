'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useRole } from '@/components/role-provider';
import { SearchFilters, type SearchFilters as SearchFiltersType } from '@/components/search-filters';
import { AlertTriangle, CheckCircle, Eye, RefreshCw, Info, ListChecks, Mail, MessageSquare, Users, Building, DollarSign, Smartphone, Link, ShieldAlert, ShieldCheck, QrCode } from 'lucide-react';
import type { Notification, Explanation, SourceApp } from '@/lib/ml-service';
import type { LinkScanResult } from '@/lib/link-scanner';
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

interface LinkScanResponse {
  urls_found: number;
  results: LinkScanResult[];
  has_malicious: boolean;
  highest_risk: number;
}

export function AnalystDashboard() {
  const { orgId } = useRole();
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'scanners'>('review');

  useEffect(() => {
    fetchNotifications();
    fetchDepartments();
    fetchSourceApps();
  }, [orgId]);

  const fetchNotifications = async (filters?: SearchFiltersType) => {
    setLoading(true);
    const params = new URLSearchParams({ org_id: orgId, flagged_only: 'true' });
    if (filters?.search) params.set('search', filters.search);
    if (filters?.department && filters.department !== 'all') params.set('department', filters.department);
    if (filters?.risk_level && filters.risk_level !== 'all') params.set('risk_level', filters.risk_level);
    if (filters?.source_app && filters.source_app !== 'all') params.set('source_app', filters.source_app);
    
    const res = await fetch(`/api/notifications?${params}`);
    const data = await res.json();
    setNotifications(data.notifications);
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
        notification_id: selectedNotification.notification_id,
        decision,
        corrected_label: decision === 'confirm' ? 1 : 0,
        analyst_notes: notes
      })
    });
    setNotifications(prev => prev.filter(n => n.notification_id !== selectedNotification.notification_id));
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
    setSelectedIds(new Set());
    setBulkMode(false);
    setFeedbackSubmitting(false);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === notifications.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(notifications.map(n => n.notification_id)));
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
                onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
                className={bulkMode ? "bg-cyan-600" : ""}
              >
                <ListChecks className="w-4 h-4 mr-1" />
                Bulk Mode
              </Button>
              <Badge variant="outline" className="text-red-500 border-red-500">
                {notifications.length} Pending
              </Badge>
            </>
          )}
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
          <QrCode className="w-4 h-4" />
          Scanners
        </button>
      </div>

      {activeTab === 'scanners' && <ScannerTools />}

      {activeTab === 'review' && (
        <>
          <SearchFilters departments={departments} sourceApps={sourceApps} onSearch={fetchNotifications} />

          {bulkMode && selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
              <span className="text-foreground">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleBulkFeedback('confirm')} disabled={feedbackSubmitting} className="bg-red-600 hover:bg-red-700">
                  Confirm All Malicious
                </Button>
                <Button size="sm" onClick={() => handleBulkFeedback('false_positive')} disabled={feedbackSubmitting} className="bg-green-600 hover:bg-green-700">
                  Mark All Safe
                </Button>
              </div>
            </div>
          )}

          {bulkMode && notifications.length > 0 && (
            <div className="flex items-center gap-2 px-2">
              <Checkbox 
                checked={selectedIds.size === notifications.length && notifications.length > 0}
                onCheckedChange={selectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          )}

          {notifications.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-xl text-foreground">No flagged notifications pending review</p>
                <p className="text-muted-foreground mt-2">All caught up! Check back later for new alerts.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
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
                />
              ))}
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
}: NotificationCardProps) {
  return (
    <Card className="bg-card border-border hover:border-muted-foreground/30 transition-colors">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {bulkMode && (
            <Checkbox 
              checked={selectedIds.has(notification.notification_id)}
              onCheckedChange={() => toggleSelect(notification.notification_id)}
              className="mt-1"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-mono text-sm text-muted-foreground">{notification.notification_id}</span>
                <Badge className={`${sourceAppColors[notification.source_app]} flex items-center gap-1`}>
                  {sourceAppIcons[notification.source_app]}
                  {notification.source_app}
                </Badge>
                <Badge className={
                  notification.risk_level === 'High' ? 'bg-red-500/20 text-red-400' :
                  notification.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }>
                  {notification.risk_level} ({Math.round(notification.risk_score * 100)}%)
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">{notification.department}</Badge>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-cyan-500 text-cyan-500 hover:bg-cyan-500/10" onClick={() => onViewDetails(notification)}>
                    <Eye className="w-4 h-4 mr-1" /> Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-4xl">
                  <DialogHeader>
                    <DialogTitle className="text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Review Flagged Notification
                    </DialogTitle>
                  </DialogHeader>
                  
                  {selectedNotification && (
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">{selectedNotification.notification_id}</span>
                            <Badge className={`${sourceAppColors[selectedNotification.source_app]} flex items-center gap-1`}>
                              {sourceAppIcons[selectedNotification.source_app]}
                              {selectedNotification.source_app}
                            </Badge>
                          </div>
                          <Badge className="bg-red-500/20 text-red-400">
                            Risk: {Math.round(selectedNotification.risk_score * 100)}%
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <p><span className="text-muted-foreground">From:</span> <span className="text-foreground">{selectedNotification.sender}</span></p>
                          <p><span className="text-muted-foreground">To:</span> <span className="text-foreground">{selectedNotification.receiver}</span></p>
                          <p><span className="text-muted-foreground">Dept:</span> <span className="text-foreground">{selectedNotification.department}</span></p>
                          <p><span className="text-muted-foreground">Source:</span> <span className="text-foreground">{selectedNotification.source_app}</span></p>
                        </div>
                        <p className="text-foreground bg-background p-3 rounded">{selectedNotification.content}</p>
                      </div>

                      {linkScanLoading ? (
                        <div className="flex items-center justify-center py-4 bg-muted rounded-lg">
                          <RefreshCw className="w-5 h-5 animate-spin text-cyan-500 mr-2" />
                          <span className="text-muted-foreground">Scanning links...</span>
                        </div>
                      ) : linkScan && linkScan.urls_found > 0 ? (
                        <div className={`p-4 rounded-lg border ${linkScan.has_malicious ? 'bg-red-900/20 border-red-800' : 'bg-emerald-900/20 border-emerald-800'}`}>
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
                              <div key={idx} className="bg-background/50 p-3 rounded-lg">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {result.is_malicious ? (
                                      <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                                    ) : (
                                      <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                                    )}
                                    <span className="text-muted-foreground text-sm font-mono truncate">{result.url}</span>
                                  </div>
                                  <Badge className={
                                    result.risk_level === 'High' ? 'bg-red-500/20 text-red-400 flex-shrink-0' :
                                    result.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 flex-shrink-0' :
                                    'bg-green-500/20 text-green-400 flex-shrink-0'
                                  }>
                                    {result.risk_level} ({Math.round(result.risk_score * 100)}%)
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{result.explanation}</p>
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
                        <div className="bg-cyan-900/20 border border-cyan-800 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <Info className="w-5 h-5 text-cyan-400" />
                            <span className="font-semibold text-cyan-400">AI Explanation</span>
                          </div>
                          <p className="text-foreground mb-3">{explanation.explanation.explanation_text}</p>
                          <div className="space-y-2">
                            {explanation.explanation.top_features.map((feature, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{feature.feature.replace(/_/g, ' ')}</span>
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
                        className="bg-muted border-border text-foreground"
                      />

                      <div className="flex gap-3">
                        <Button onClick={() => handleFeedback('confirm')} disabled={feedbackSubmitting} className="flex-1 bg-red-600 hover:bg-red-700">
                          <AlertTriangle className="w-4 h-4 mr-2" /> Confirm Malicious
                        </Button>
                        <Button onClick={() => handleFeedback('false_positive')} disabled={feedbackSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" /> Mark Safe
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">From: </span><span className="text-foreground">{notification.sender}</span></div>
              <div><span className="text-muted-foreground">To: </span><span className="text-foreground">{notification.receiver}</span></div>
            </div>
            <p className="mt-2 text-foreground bg-muted p-3 rounded-lg text-sm line-clamp-2">{notification.content}</p>
            <p className="mt-2 text-xs text-muted-foreground">{notification.timestamp}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
