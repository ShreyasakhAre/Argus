"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Shield, ShieldOff, Play, Pause, Settings, Activity, 
  AlertTriangle, CheckCircle, Clock, Zap, BarChart3,
  RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface AgentConfig {
  enabled: boolean;
  riskThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  maxAutoActions: number;
  cooldownMinutes: number;
}

interface AgentStats {
  totalProcessed: number;
  actionsTaken: number;
  threatsBlocked: number;
  lastActionTime: string | null;
  hourlyActionCount: number;
  config: AgentConfig;
  uptime: number;
}

export function AutonomousAgentPanel() {
  const [config, setConfig] = useState<AgentConfig>({
    enabled: false,
    riskThresholds: {
      critical: 90,
      high: 70,
      medium: 30
    },
    maxAutoActions: 100,
    cooldownMinutes: 5
  });

  const [stats, setStats] = useState<AgentStats | null>(null);
  const [processingStats, setProcessingStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAgentStats();
    fetchProcessingStats();
    const interval = setInterval(() => {
      fetchAgentStats();
      fetchProcessingStats();
    }, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchProcessingStats = async () => {
    try {
      const data = await api.get<any>('/api/agent/processing/stats');
      setProcessingStats(data?.data || {});
      setIsProcessing(Boolean(data?.data?.isRunning));
    } catch (error) {
      console.error('Failed to fetch processing stats:', error);
      setProcessingStats({});
      setIsProcessing(false);
    }
  };

  const fetchAgentStats = async () => {
    try {
      const data = await api.get<any>('/api/agent/stats');
      setStats(data?.data || null);
      setConfig(data?.data?.config || {
        enabled: false,
        riskThresholds: { critical: 90, high: 70, medium: 30 },
        maxAutoActions: 100,
        cooldownMinutes: 5,
      });
    } catch (error) {
      console.error('Failed to fetch agent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutonomousMode = async (enabled: boolean) => {
    setToggling(true);
    try {
      const endpoint = enabled ? '/api/agent/enable' : '/api/agent/disable';
      const data = await api.post<any>(endpoint, {});
      setConfig(data?.config || config);
      setStats(prev => prev ? { ...prev, config: data?.config || prev.config } : prev);
    } catch (error) {
      console.error('Failed to toggle autonomous mode:', error);
    } finally {
      setToggling(false);
    }
  };

  const testAgent = async (testType: 'high_risk' | 'medium_risk' | 'low_risk') => {
    setTesting(true);
    try {
      const data = await api.post<any>('/api/agent/test', { testType });
      console.log('Test result:', data);
    } catch (error) {
      console.error('Failed to test agent:', error);
    } finally {
      setTesting(false);
    }
  };

  const updateConfig = async (newConfig: Partial<AgentConfig>) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('argus-token') : null;
      const res = await fetch('/api/agent/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newConfig)
      });
      
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setStats(prev => prev ? { ...prev, config: data.config } : null);
      }
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const startProcessingLoop = async () => {
    try {
      await api.post<any>('/api/agent/processing/start', {});
      setIsProcessing(true);
      fetchProcessingStats();
    } catch (error) {
      console.error('Failed to start processing loop:', error);
    }
  };

  const stopProcessingLoop = async () => {
    try {
      await api.post<any>('/api/agent/processing/stop', {});
      setIsProcessing(false);
      fetchProcessingStats();
    } catch (error) {
      console.error('Failed to stop processing loop:', error);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatLastAction = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Control Panel */}
      <PremiumCard className="border-cyan-500/20">
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Autonomous Security Agent
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              className="text-slate-400 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent className="space-y-6">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="font-medium text-white">
                  {config.enabled ? 'Autonomous Mode Active' : 'Autonomous Mode Inactive'}
                </p>
                <p className="text-sm text-slate-400">
                  {config.enabled 
                    ? 'Agent is automatically processing and responding to threats'
                    : 'Agent is monitoring but not taking automatic actions'
                  }
                </p>
              </div>
            </div>
            <Button
              onClick={() => toggleAutonomousMode(!config.enabled)}
              disabled={toggling}
              variant={config.enabled ? "destructive" : "default"}
              className="min-w-32"
            >
              {toggling ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : config.enabled ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Disable
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Enable
                </>
              )}
            </Button>
          </div>

          {/* Processing Loop Controls */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`} />
              <div>
                <p className="font-medium text-white">
                  {isProcessing ? 'Processing Loop Active' : 'Processing Loop Inactive'}
                </p>
                <p className="text-sm text-slate-400">
                  {isProcessing 
                    ? `Processing notifications every 2 seconds (${processingStats?.totalProcessed || 0} processed)`
                    : 'Continuous processing is paused'
                  }
                </p>
              </div>
            </div>
            <Button
              onClick={isProcessing ? stopProcessingLoop : startProcessingLoop}
              variant={isProcessing ? "destructive" : "default"}
              className="min-w-32"
            >
              {isProcessing ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Loop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Loop
                </>
              )}
            </Button>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <p className="text-sm text-slate-400">Processed</p>
                </div>
                <p className="text-2xl font-bold text-white">{stats.totalProcessed}</p>
                <p className="text-xs text-slate-500">Total notifications</p>
              </div>
              
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <p className="text-sm text-slate-400">Actions Taken</p>
                </div>
                <p className="text-2xl font-bold text-white">{stats.actionsTaken}</p>
                <p className="text-xs text-slate-500">Automated responses</p>
              </div>
              
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <p className="text-sm text-slate-400">Threats Blocked</p>
                </div>
                <p className="text-2xl font-bold text-white">{stats.threatsBlocked}</p>
                <p className="text-xs text-slate-500">Senders/domains</p>
              </div>
              
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <p className="text-sm text-slate-400">Last Action</p>
                </div>
                <p className="text-lg font-bold text-white">
                  {formatLastAction(stats.lastActionTime)}
                </p>
                <p className="text-xs text-slate-500">
                  Uptime: {formatUptime(stats.uptime)}
                </p>
              </div>
            </div>
          )}

          {/* Test Controls */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">Test Agent</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testAgent('high_risk')}
                disabled={testing || !config.enabled}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                High Risk Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testAgent('medium_risk')}
                disabled={testing || !config.enabled}
                className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Medium Risk Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testAgent('low_risk')}
                disabled={testing || !config.enabled}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Low Risk Test
              </Button>
            </div>
          </div>

          {/* Configuration Panel */}
          {showConfig && (
            <div className="space-y-4 p-4 rounded-lg border border-slate-700 bg-slate-900/30">
              <h4 className="font-medium text-white">Configuration</h4>
              
              {/* Risk Thresholds */}
              <div className="space-y-3">
                <p className="text-sm text-slate-400">Risk Thresholds</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Critical (≥)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={config.riskThresholds.critical}
                      onChange={(e) => updateConfig({
                        riskThresholds: {
                          ...config.riskThresholds,
                          critical: parseInt(e.target.value) || 90
                        }
                      })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                      disabled={!config.enabled}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">High (≥)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={config.riskThresholds.high}
                      onChange={(e) => updateConfig({
                        riskThresholds: {
                          ...config.riskThresholds,
                          high: parseInt(e.target.value) || 70
                        }
                      })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                      disabled={!config.enabled}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Medium (≥)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={config.riskThresholds.medium}
                      onChange={(e) => updateConfig({
                        riskThresholds: {
                          ...config.riskThresholds,
                          medium: parseInt(e.target.value) || 30
                        }
                      })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                      disabled={!config.enabled}
                    />
                  </div>
                </div>
              </div>

              {/* Action Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Max Actions/Hour</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={config.maxAutoActions}
                    onChange={(e) => updateConfig({
                      maxAutoActions: parseInt(e.target.value) || 100
                    })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                    disabled={!config.enabled}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Cooldown (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={config.cooldownMinutes}
                    onChange={(e) => updateConfig({
                      cooldownMinutes: parseInt(e.target.value) || 5
                    })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                    disabled={!config.enabled}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status Alert */}
          {!config.enabled && (
            <Alert className="border-yellow-500/30 bg-yellow-500/10">
              <EyeOff className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">
                Autonomous mode is disabled. The agent will monitor threats but will not take automatic actions.
                Enable autonomous mode to activate automated threat response.
              </AlertDescription>
            </Alert>
          )}

          {config.enabled && (
            <Alert className="border-green-500/30 bg-green-500/10">
              <Eye className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300">
                Autonomous mode is active. The agent will automatically detect, evaluate, and respond to threats
                based on the configured risk thresholds.
              </AlertDescription>
            </Alert>
          )}
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}
