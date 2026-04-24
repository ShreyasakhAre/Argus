"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Activity, Shield, AlertTriangle, CheckCircle, Archive, 
  Clock, Filter, RefreshCw, Eye, Search, Calendar
} from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface AgentActivity {
  id: string;
  timestamp: string;
  notificationId: string;
  message: string;
  riskScore: number;
  actions: Array<{
    type: string;
    value?: string;
    reason: string;
    timestamp: string;
    success: boolean;
  }>;
  autoActionTaken: boolean;
}

interface ActivityLogResponse {
  activities: AgentActivity[];
  total: number;
  page: number;
  totalPages: number;
}

export function AgentActivityLog() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>('');
  const [actionType, setActionType] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchActivityLog();
  }, [page, filter, actionType]);

  const fetchActivityLog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (filter) params.append('search', filter);
      if (actionType) params.append('actionType', actionType);

      const data = await api.get<any>(`/api/agent/activity?${params}`);
      setActivities(Array.isArray(data?.data?.activities) ? data.data.activities : []);
      setTotal(Number(data?.data?.total || 0));
      setTotalPages(Number(data?.data?.totalPages || 1));
    } catch (error) {
      console.error('Failed to fetch activity log:', error);
      setActivities([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'sender_block':
      case 'domain_mute':
        return <Shield className="w-4 h-4 text-red-400" />;
      case 'create_incident':
      case 'create_case':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'mark_safe':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-blue-400" />;
      case 'notify_admin':
      case 'notify_analyst':
        return <Activity className="w-4 h-4 text-purple-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'sender_block':
      case 'domain_mute':
        return 'border-red-500/30 bg-red-500/10';
      case 'create_incident':
      case 'create_case':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'mark_safe':
        return 'border-green-500/30 bg-green-500/10';
      case 'archive':
        return 'border-blue-500/30 bg-blue-500/10';
      case 'notify_admin':
      case 'notify_analyst':
        return 'border-purple-500/30 bg-purple-500/10';
      default:
        return 'border-slate-500/30 bg-slate-500/10';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-blue-400';
    return 'text-green-400';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'sender_block': return 'Blocked Sender';
      case 'domain_mute': return 'Muted Domain';
      case 'create_incident': return 'Created Incident';
      case 'create_case': return 'Created Case';
      case 'mark_safe': return 'Marked Safe';
      case 'archive': return 'Archived';
      case 'notify_admin': return 'Notified Admin';
      case 'notify_analyst': return 'Notified Analyst';
      default: return actionType;
    }
  };

  return (
    <div className="space-y-4">
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Agent Activity Log
              <span className="text-sm text-slate-400">({total} activities)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchActivityLog}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                />
              </div>
            </div>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Actions</option>
              <option value="sender_block">Block Sender</option>
              <option value="domain_mute">Mute Domain</option>
              <option value="create_incident">Create Incident</option>
              <option value="create_case">Create Case</option>
              <option value="mark_safe">Mark Safe</option>
              <option value="archive">Archive</option>
              <option value="notify_admin">Notify Admin</option>
              <option value="notify_analyst">Notify Analyst</option>
            </select>
          </div>

          {/* Activity List */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : activities.length === 0 ? (
            <Alert className="border-slate-500/30 bg-slate-500/10">
              <Activity className="h-4 w-4 text-slate-400" />
              <AlertDescription className="text-slate-300">
                No agent activities found. Enable autonomous mode and wait for notifications to be processed.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border border-slate-700 rounded-lg overflow-hidden"
                >
                  <div className="p-4 bg-slate-900/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-sm font-medium ${getRiskScoreColor(activity.riskScore)}`}>
                            Risk Score: {activity.riskScore}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatTimestamp(activity.timestamp)}
                          </span>
                          {activity.autoActionTaken && (
                            <span className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-300 rounded-full">
                              Auto Action
                            </span>
                          )}
                        </div>
                        <p className="text-white text-sm mb-2 line-clamp-2">
                          {activity.message}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            ID: {activity.notificationId}
                          </span>
                          {(Array.isArray(activity.actions) ? activity.actions : []).length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(activity.id)}
                              className="text-xs text-cyan-400 hover:text-cyan-300 p-1 h-auto"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              {expandedItems.has(activity.id) ? 'Hide' : 'Show'} Actions ({(Array.isArray(activity.actions) ? activity.actions : []).length})
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Actions */}
                    {expandedItems.has(activity.id) && (Array.isArray(activity.actions) ? activity.actions : []).length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                        {(Array.isArray(activity.actions) ? activity.actions : []).map((action, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${getActionColor(action.type)}`}
                          >
                            {getActionIcon(action.type)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white">
                                  {getActionTypeLabel(action.type)}
                                </span>
                                {action.value && (
                                  <span className="text-xs text-slate-400">
                                    ({action.value})
                                  </span>
                                )}
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  action.success 
                                    ? 'bg-green-500/20 text-green-300' 
                                    : 'bg-red-500/20 text-red-300'
                                }`}>
                                  {action.success ? 'Success' : 'Failed'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300">{action.reason}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatTimestamp(action.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
                Showing {activities.length} of {total} activities
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="border-slate-600 text-slate-300"
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="border-slate-600 text-slate-300"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}
