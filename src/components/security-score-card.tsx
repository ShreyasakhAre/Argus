"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  Clock, History, Info, BarChart3, User, RefreshCw
} from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SecurityScoreData {
  user: {
    id: string;
    name: string;
    email: string;
    department: string;
    riskScore: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    lastRiskUpdate: string;
  };
  recentBehavior: Array<{
    action: string;
    scoreChange: number;
    newScore: number;
    timestamp: string;
    details: any;
  }>;
  behaviorStats: {
    totalActions: number;
    actionCounts: Record<string, number>;
    lastActions: Record<string, string>;
    riskTrend: Array<{
      date: string;
      score: number;
      action: string;
    }>;
  };
}

export function SecurityScoreCard({ userId }: { userId?: string }) {
  const [scoreData, setScoreData] = useState<SecurityScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchSecurityScore();
    }
  }, [userId]);

  const fetchSecurityScore = async () => {
    try {
      const res = await fetch(`/api/risk/profile/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setScoreData(data);
      }
    } catch (error) {
      console.error('Failed to fetch security score:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string, score: number) => {
    if (level === 'High' || score >= 70) return 'text-red-400 border-red-500/30 bg-red-500/10';
    if (level === 'Medium' || score >= 40) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-green-400 border-green-500/30 bg-green-500/10';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'clicked_suspicious_link':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'ignored_warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'reported_phishing':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'marked_safe_correctly':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'clicked_suspicious_link': return 'Clicked Suspicious Link';
      case 'ignored_warning': return 'Ignored Warning';
      case 'reported_phishing': return 'Reported Phishing';
      case 'marked_safe_correctly': return 'Marked Safe Correctly';
      default: return action;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  if (!scoreData) {
    return (
      <PremiumCard>
        <PremiumCardContent className="pt-6">
          <Alert className="border-slate-500/30 bg-slate-500/10">
            <Shield className="h-4 w-4 text-slate-400" />
            <AlertDescription className="text-slate-300">
              Security score data not available.
            </AlertDescription>
          </Alert>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  const { user, recentBehavior, behaviorStats } = scoreData;
  const riskColorClass = getRiskColor(user.riskLevel, user.riskScore);

  return (
    <div className="space-y-4">
      {/* Main Score Card */}
      <PremiumCard className={`border-2 ${riskColorClass}`}>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Score
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-slate-400 hover:text-white"
            >
              <Info className="w-4 h-4" />
            </Button>
          </PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent className="space-y-4">
          {/* Score Display */}
          <div className="text-center">
            <div className={`text-5xl font-bold mb-2 ${getScoreColor(user.riskScore)}`}>
              {user.riskScore}
            </div>
            <div className={`text-lg font-medium mb-1 ${riskColorClass}`}>
              {user.riskLevel} Risk
            </div>
            <p className="text-sm text-slate-400">
              Last updated: {formatTimestamp(user.lastRiskUpdate)}
            </p>
          </div>

          {/* Risk Level Description */}
          <Alert className={`border-current/30 bg-current/10 ${riskColorClass}`}>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {user.riskLevel === 'Low' && 'Excellent security behavior! Keep up the good work.'}
              {user.riskLevel === 'Medium' && 'Some security concerns. Be more cautious with suspicious emails.'}
              {user.riskLevel === 'High' && 'High risk behavior detected. Additional security training recommended.'}
            </AlertDescription>
          </Alert>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-2xl font-bold text-white">{behaviorStats.totalActions}</div>
              <div className="text-xs text-slate-400">Total Actions</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-2xl font-bold text-white">{recentBehavior.length}</div>
              <div className="text-xs text-slate-400">Recent Events</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSecurityScore}
              className="flex-1 border-slate-600 text-slate-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex-1 border-slate-600 text-slate-300"
            >
              <History className="w-4 h-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Detailed View */}
      {showDetails && (
        <PremiumCard>
          <PremiumCardHeader>
            <PremiumCardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              Recent Security Behavior
            </PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent className="space-y-4">
            {/* Action Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">Action Breakdown</h4>
              <div className="space-y-2">
                {Object.entries(behaviorStats.actionCounts).map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      {getActionIcon(action)}
                      <span className="text-sm text-slate-300">{getActionLabel(action)}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Events */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">Recent Events</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentBehavior.slice(0, 10).map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-3">
                      {getActionIcon(event.action)}
                      <div>
                        <p className="text-sm text-white">{getActionLabel(event.action)}</p>
                        <p className="text-xs text-slate-400">{formatTimestamp(event.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium flex items-center gap-1 ${
                        event.scoreChange > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {event.scoreChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {event.scoreChange > 0 ? '+' : ''}{event.scoreChange}
                      </div>
                      <div className="text-xs text-slate-400">Score: {event.newScore}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Trend */}
            {behaviorStats.riskTrend.length > 1 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-300">Score Trend</h4>
                <div className="space-y-1">
                  {behaviorStats.riskTrend.slice(-5).map((point, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{formatTimestamp(point.date)}</span>
                      <span className={`font-medium ${getScoreColor(point.score)}`}>{point.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </PremiumCardContent>
        </PremiumCard>
      )}
    </div>
  );
}
