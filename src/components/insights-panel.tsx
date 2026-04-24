"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Brain, TrendingUp, AlertTriangle, Users, Target, 
  RefreshCw, Eye, Clock, BarChart3, Lightbulb,
  CheckCircle, XCircle, AlertCircle, Info
} from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSmartPolling } from '@/hooks/useSmartPolling';
import api from '@/lib/api';

interface Insight {
  type: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  metrics?: any;
  actions?: string[];
  estimatedImpact?: string;
  timeframe?: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: string;
  type: string;
  estimatedImpact?: string;
  urgency?: string;
}

interface DashboardData {
  riskMetrics: {
    overallScore: number;
    trendDirection: string;
    highRiskUsers: number;
    recentAlerts: number;
  };
  departmentRisks: Array<{
    name: string;
    riskScore: number;
    riskLevel: string;
    highRiskCount: number;
    totalEmployees: number;
  }>;
  topRecommendations: Recommendation[];
  behavioralInsights: Array<{
    behavior: string;
    count: number;
    avgImpact: number;
    isRisky: boolean;
  }>;
  threatPatterns: Array<{
    type: string;
    count: number;
    avgRiskScore: number;
    affectedDepartments: number;
  }>;
  urgentActions: Insight[];
  generatedAt: string;
}

export function InsightsPanel() {
  const [insights, setInsights] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);

  const fetchInsights = async () => {
    try {
      const response = await api.get<any>('/api/recommendations/dashboard');
      const data = response?.data || response || {};

      setInsights({
        riskMetrics: {
          overallScore: Number(data?.riskMetrics?.overallScore || 0),
          trendDirection: data?.riskMetrics?.trendDirection || 'stable',
          highRiskUsers: Number(data?.riskMetrics?.highRiskUsers || 0),
          recentAlerts: Number(data?.riskMetrics?.recentAlerts || 0),
        },
        departmentRisks: Array.isArray(data?.departmentRisks) ? data.departmentRisks : [],
        topRecommendations: Array.isArray(data?.topRecommendations) ? data.topRecommendations : [],
        behavioralInsights: Array.isArray(data?.behavioralInsights) ? data.behavioralInsights : [],
        threatPatterns: Array.isArray(data?.threatPatterns) ? data.threatPatterns : [],
        urgentActions: Array.isArray(data?.urgentActions) ? data.urgentActions : [],
        generatedAt: data?.generatedAt || new Date().toISOString(),
      });
    } catch (error) {
      // Silent fail - let smart polling handle retries
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Smart polling for insights
  useSmartPolling(fetchInsights, {
    interval: 30000, // 30 seconds
    enabled: true,
    respectCircuitBreaker: true,
    maxRetries: 3
  });

  const refreshInsights = async () => {
    setLoading(true);
    try {
      await api.post<any>('/api/recommendations/refresh', {});
      fetchInsights();
    } catch (error) {
      console.error('Failed to refresh insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'high': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'low': return 'text-green-400 border-green-500/30 bg-green-500/10';
      default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'decreasing': return <TrendingUp className="w-4 h-4 text-green-400 rotate-180" />;
      default: return <TrendingUp className="w-4 h-4 text-blue-400" />;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <PremiumCard>
        <PremiumCardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  if (!insights) {
    return (
      <PremiumCard>
        <PremiumCardContent className="pt-6">
          <Alert className="border-slate-500/30 bg-slate-500/10">
            <Brain className="h-4 w-4 text-slate-400" />
            <AlertDescription className="text-slate-300">
              Insights data not available. Please try refreshing.
            </AlertDescription>
          </Alert>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              AI Insights & Recommendations
              <span className="text-sm text-slate-400">Last updated: {formatTimestamp(insights.generatedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-slate-400 hover:text-white"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshInsights}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </PremiumCardTitle>
        </PremiumCardHeader>
      </PremiumCard>

      {/* Risk Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <PremiumCard>
          <PremiumCardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-white">{insights.riskMetrics.overallScore}</div>
            <div className="text-sm text-slate-400">Overall Risk Score</div>
            <div className="flex items-center justify-center mt-2">
              {getTrendIcon(insights.riskMetrics.trendDirection)}
              <span className="text-xs text-slate-400 ml-1">{insights.riskMetrics.trendDirection}</span>
            </div>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-red-400">{insights.riskMetrics.highRiskUsers}</div>
            <div className="text-sm text-slate-400">High Risk Users</div>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-yellow-400">{insights.riskMetrics.recentAlerts}</div>
            <div className="text-sm text-slate-400">Recent Alerts</div>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-cyan-400">{(insights.urgentActions ?? []).length}</div>
            <div className="text-sm text-slate-400">Urgent Actions</div>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      {/* Urgent Actions */}
      {(insights.urgentActions ?? []).length > 0 && (
        <PremiumCard>
          <PremiumCardHeader>
            <PremiumCardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Urgent Actions Required
            </PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="space-y-3">
              {(insights.urgentActions ?? []).slice(0, 3).map((action, index) => (
                <div key={index} className={`p-4 rounded-lg border ${getPriorityColor(action.priority)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getPriorityIcon(action.priority)}
                        <h4 className="font-medium text-white">{action.title}</h4>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{action.description}</p>
                      <p className="text-xs text-slate-400">
                        <strong>Recommendation:</strong> {action.recommendation}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white"
                    >
                      <Target className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </PremiumCardContent>
        </PremiumCard>
      )}

      {/* Department Risk Overview */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Department Risk Analysis
          </PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent>
          <div className="space-y-3">
            {(insights.departmentRisks ?? [])
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 5)
              .map((dept, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getRiskLevelColor(dept.riskLevel)}`}>
                        {dept.riskScore}
                      </div>
                      <div className="text-xs text-slate-400">{dept.riskLevel}</div>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{dept.name}</h4>
                      <p className="text-xs text-slate-400">
                        {dept.highRiskCount} high risk / {dept.totalEmployees} total
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Risk Level</div>
                    <div className={`text-sm font-medium ${getRiskLevelColor(dept.riskLevel)}`}>
                      {dept.riskLevel.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Top Recommendations */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-cyan-400" />
            Top Recommendations
          </PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent>
          <div className="space-y-3">
            {(insights.topRecommendations ?? []).slice(0, 5).map((rec, index) => (
              <div key={index} className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityIcon(rec.priority)}
                      <h4 className="font-medium text-white">{rec.title}</h4>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{rec.description}</p>
                    {rec.estimatedImpact && (
                      <p className="text-xs text-slate-400">
                        <strong>Expected Impact:</strong> {rec.estimatedImpact}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Type</div>
                    <div className="text-sm font-medium text-cyan-400 capitalize">
                      {rec.type}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Behavioral Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PremiumCard>
          <PremiumCardHeader>
            <PremiumCardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Behavioral Patterns
            </PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="space-y-3">
              {(insights.behavioralInsights ?? []).slice(0, 4).map((behavior, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      behavior.isRisky ? 'bg-red-400' : 'bg-green-400'
                    }`} />
                    <div>
                      <h4 className="text-sm font-medium text-white capitalize">
                        {behavior.behavior.replace('_', ' ')}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {behavior.count} occurrences
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      behavior.isRisky ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {behavior.isRisky ? '+' : ''}{behavior.avgImpact}
                    </div>
                    <div className="text-xs text-slate-400">avg impact</div>
                  </div>
                </div>
              ))}
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard>
          <PremiumCardHeader>
            <PremiumCardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-cyan-400" />
              Threat Patterns
            </PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="space-y-3">
              {(insights.threatPatterns ?? []).slice(0, 4).map((threat, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <div>
                      <h4 className="text-sm font-medium text-white capitalize">
                        {threat.type || 'Unknown'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {threat.count} occurrences
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-orange-400">
                      {threat.avgRiskScore}
                    </div>
                    <div className="text-xs text-slate-400">avg risk</div>
                  </div>
                </div>
              ))}
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <PremiumCard>
          <PremiumCardHeader>
            <PremiumCardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              Detailed Analysis
            </PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="space-y-6">
              {/* System Health */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">System Health</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-lg font-bold text-green-400">85%</div>
                    <div className="text-xs text-slate-400">Alert Response Rate</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-lg font-bold text-blue-400">2.3s</div>
                    <div className="text-xs text-slate-400">Avg Response Time</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-lg font-bold text-cyan-400">99.9%</div>
                    <div className="text-xs text-slate-400">System Uptime</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-lg font-bold text-purple-400">12</div>
                    <div className="text-xs text-slate-400">Active Policies</div>
                  </div>
                </div>
              </div>

              {/* Trend Analysis */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Trend Analysis</h4>
                <Alert className="border-blue-500/30 bg-blue-500/10">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-300">
                    Risk levels are trending downward by 8% over the past week. Current security measures are proving effective.
                  </AlertDescription>
                </Alert>
              </div>

              {/* Action Plan */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Recommended Action Plan</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white">Continue current security policies and training programs</p>
                      <p className="text-xs text-slate-400">Timeline: Ongoing</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white">Schedule targeted training for high-risk departments</p>
                      <p className="text-xs text-slate-400">Timeline: Next 2-4 weeks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white">Implement additional automated response policies</p>
                      <p className="text-xs text-slate-400">Timeline: Next 1-3 weeks</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>
      )}
    </div>
  );
}
