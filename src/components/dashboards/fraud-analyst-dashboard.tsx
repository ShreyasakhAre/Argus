'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRole } from '@/components/role-provider';
import { 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Shield,
  Clock,
  User,
  Mail,
  MessageSquare,
  ShieldAlert,
  Zap,
  VolumeX,
  ArrowUpRight,
} from 'lucide-react';
import type { Notification } from '@/lib/ml-service';
import { 
  useNotificationBulkSelect, 
  SelectAllNotSafeBar, 
  BulkActionBar, 
  BulkFeedbackToast,
  NotificationCheckbox,
  isNotSafe
} from '@/components/notification-bulk-actions';
import { ThreatPatterns } from '@/components/threat-patterns';

interface AnalystCase {
  id: string;
  notification_id: string;
  status: 'pending' | 'reviewed' | 'safe' | 'malicious' | 'incident';
  assigned_analyst?: string;
  reviewed_at?: string;
  notes?: string;
}

export function FraudAnalystDashboard() {
  const { orgId } = useRole();
  const [suspiciousNotifications, setSuspiciousNotifications] = useState<any[]>([]);
  const [cases, setCases] = useState<AnalystCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [activeView, setActiveView] = useState<'queue' | 'intelligence'>('queue');

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
  } = useNotificationBulkSelect(suspiciousNotifications as any);

  useEffect(() => {
    fetchSuspiciousQueue();
    fetchCases();
  }, [orgId]);

  const fetchSuspiciousQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?org_id=${orgId}&flagged_only=true&limit=150`);
      const data = await res.json();
      setSuspiciousNotifications(data.notifications || []);
      console.log('[Fraud Analyst] Suspicious queue loaded:', data.notifications?.length);
    } catch (error) {
      console.error('[Fraud Analyst] Error fetching suspicious queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    // Initialize empty cases - they will be created when analysts review notifications
    setCases([]);
  };

  const handleReview = async (notification: any, action: 'safe' | 'malicious' | 'incident') => {
    try {
      const notifId = notification.id || notification.notification_id;
      
      // Post feedback to backend
      await fetch('/api/analyst-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notifId,
          action: action === 'safe' ? 'MARK_SAFE' : action === 'malicious' ? 'MARK_MALICIOUS' : 'OVERRIDE',
          analyst: 'Fraud Analyst'
        })
      });

      console.log(`[Fraud Analyst] Marking ${notifId} as ${action}`);
      
      // Update local state
      setSuspiciousNotifications(prev => 
        prev.filter(n => (n.id || n.notification_id) !== notifId)
      );
      
      // Update cases
      setCases(prev => {
        const existingCase = prev.find(c => c.notification_id === notification.id);
        if (!existingCase) {
          return [
            ...prev,
            {
              id: `case_${notification.id}`,
              notification_id: notification.id,
              status: action,
              reviewed_at: new Date().toISOString(),
              notes: `Marked as ${action}`,
            },
          ];
        }

        return prev.map(c =>
          c.notification_id === notification.id
            ? { ...c, status: action, reviewed_at: new Date().toISOString(), notes: `Marked as ${action}` }
            : c
        );
      });
      
      setShowDetailModal(false);
      setSelectedNotification(null);
    } catch (error) {
      console.error('[Fraud Analyst] Error updating notification:', error);
    }
  };

  const generateExplanation = (notification: any) => {
    const reasons = [];
    
    if (notification.severity === 'high') {
      reasons.push('High severity threat detected');
      if (notification.source === 'Email') reasons.push('Suspicious sender domain or content');
    } else if (notification.severity === 'medium') {
      reasons.push('Medium severity activity patterns');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Standard suspicious patterns detected';
  };

  const filteredNotifications = suspiciousNotifications.filter(notif => {
    const matchesSearch = !searchTerm || 
      notif.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.receiver?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'pending' && !cases.find(c => c.notification_id === notif.id && c.status !== 'pending')) ||
      (filterStatus === 'reviewed' && cases.find(c => c.notification_id === notif.id && c.status !== 'pending'));
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    pending: suspiciousNotifications.filter(n => !cases.find(c => c.notification_id === n.id && c.status !== 'pending')).length,
    reviewed: suspiciousNotifications.filter(n => cases.find(c => c.notification_id === n.id && c.status !== 'pending')).length,
    safe: cases.filter(c => c.status === 'safe').length,
    malicious: cases.filter(c => c.status === 'malicious').length,
    incident: cases.filter(c => c.status === 'incident').length
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
          <h2 className="text-2xl font-bold text-white">Fraud Analysis Dashboard</h2>
          <p className="text-zinc-400">Review and investigate suspicious notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setActiveView(activeView === 'queue' ? 'intelligence' : 'queue')} 
            variant="outline" 
            className={`border-zinc-700 ${activeView === 'intelligence' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-300'}`}
          >
            {activeView === 'queue' ? <ShieldAlert className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {activeView === 'queue' ? 'Threat Intel' : 'Back to Queue'}
          </Button>
          <Button onClick={fetchSuspiciousQueue} variant="outline" className="border-zinc-700 text-zinc-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Queue
          </Button>
        </div>
      </div>

      {activeView === 'intelligence' ? (
        <div className="space-y-6">
          <ThreatPatterns />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Reviewed</p>
                <p className="text-3xl font-bold text-blue-500">{stats.reviewed}</p>
              </div>
              <Eye className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Marked Safe</p>
                <p className="text-3xl font-bold text-green-500">{stats.safe}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Marked Malicious</p>
                <p className="text-3xl font-bold text-red-500">{stats.malicious}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Incidents</p>
                <p className="text-3xl font-bold text-orange-500">{stats.incident}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        >
          <option value="pending">Pending Only</option>
          <option value="reviewed">Reviewed Only</option>
          <option value="all">All Items</option>
        </select>
      </div>

      <BulkFeedbackToast message={bulkFeedback} />
      
      {someSelected && (
        <div className="space-y-2">
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
        </div>
      )}

      {/* Suspicious Queue */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Suspicious Queue ({filteredNotifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredNotifications.map((notification, idx) => {
              const case_ = cases.find(c => c.notification_id === notification.id);
              const isPending = !case_ || case_.status === 'pending';
              
              return (
                <div
                  key={`${notification.id || notification.notification_id}-${idx}`}
                  className={`bg-zinc-800 border rounded-lg p-4 transition-all duration-300 ${
                    selectedIds.has(notification.id || notification.notification_id) 
                      ? 'border-red-500/50 bg-red-950/10' 
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 mr-3 mt-1">
                      <NotificationCheckbox 
                        notification={notification}
                        isSelected={selectedIds.has(notification.id || notification.notification_id)}
                        onToggle={(id) => toggleSelect(id)}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-zinc-400">{notification.id}</span>
                        <Badge className={
                          notification.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                          notification.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }>
                          {notification.severity?.toUpperCase() || 'LOW'}
                        </Badge>
                        <Badge variant="outline" className="text-zinc-400">
                          {notification.department}
                        </Badge>
                        <Badge className={isPending ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}>
                          {isPending ? 'Pending' : 'Reviewed'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div><span className="text-zinc-400">From: </span><span className="text-white">{notification.sender}</span></div>
                        <div><span className="text-zinc-400">To: </span><span className="text-white">{notification.receiver}</span></div>
                      </div>
                      
                      <p className="text-zinc-300 text-sm mb-2 line-clamp-2">{notification.message}</p>
                      
                      <div className="text-xs text-zinc-400 mb-3">
                        <strong>AI Analysis:</strong> {generateExplanation(notification)}
                      </div>
                      
                      <div className="text-xs text-zinc-500">
                        {notification.timestamp ? new Date(notification.timestamp).toLocaleString() : 'Recent'} • Risk Score: {notification.risk || Math.round((notification.confidence || 0) * 100)}%
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const notifId = notification.id || notification.notification_id;
                          setSelectedNotification(notification);
                          setShowDetailModal(true);
                          
                          // Fetch real AI explanation
                          try {
                            const res = await fetch(`/api/explain/${notifId}`);
                            const data = await res.json();
                            if (data.explanation) {
                              setSelectedNotification((prev: any) => ({
                                ...prev,
                                explanation_text: data.explanation.explanation_text
                              }));
                            }
                          } catch (err) {
                            console.error("Explain error:", err);
                          }
                        }}
                        className="border-zinc-600 text-zinc-300"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleReview(notification, 'safe')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Safe
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReview(notification, 'malicious')}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Malicious
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReview(notification, 'incident')}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Incident
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredNotifications.length === 0 && (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 mx-auto text-zinc-500 mb-3" />
                <p className="text-zinc-400">No suspicious notifications found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Review Notification</h3>
              <Button
                variant="ghost"
                onClick={() => setShowDetailModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-zinc-400 text-sm">Notification ID:</span>
                  <p className="text-white font-mono">{selectedNotification.id}</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-sm">Severity:</span>
                  <p className="text-white">{selectedNotification.severity?.toUpperCase() || 'LOW'}</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-sm">Department:</span>
                  <p className="text-white">{selectedNotification.department}</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-sm">Risk Score:</span>
                  <p className="text-white">
                    {selectedNotification.risk || Math.round((selectedNotification.confidence || 0) * 100)}%
                  </p>
                </div>
              </div>
              
              <div>
                <span className="text-zinc-400 text-sm">From:</span>
                <p className="text-white">{selectedNotification.sender}</p>
              </div>
              
              <div>
                <span className="text-zinc-400 text-sm">To:</span>
                <p className="text-white">{selectedNotification.receiver}</p>
              </div>
              
              <div>
                <span className="text-zinc-400 text-sm">Message:</span>
                <p className="text-white bg-zinc-800 p-3 rounded">{selectedNotification.message}</p>
              </div>
              
              <div>
                <span className="text-zinc-400 text-sm">AI Analysis & Explanation:</span>
                <p className="text-zinc-300 bg-zinc-800/50 p-3 rounded-lg border border-zinc-700 mt-1">
                  {selectedNotification.explanation_text || generateExplanation(selectedNotification)}
                </p>
              </div>
              
              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={() => handleReview(selectedNotification, 'safe')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Safe
                </Button>
                <Button
                  onClick={() => handleReview(selectedNotification, 'malicious')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark as Malicious
                </Button>
                <Button
                  onClick={() => handleReview(selectedNotification, 'incident')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Mark Incident
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDetailModal(false)}
                  className="border-zinc-600 text-zinc-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
