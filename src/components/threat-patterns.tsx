'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Eye, Activity, RefreshCw, Globe, Users } from 'lucide-react';

interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Active' | 'Monitoring' | 'Resolved';
  indicators: string[];
  detectedCount: number;
}

interface Campaign {
  id: string;
  type: string;
  domain: string;
  senderCount: number;
  totalAlerts: number;
  highRiskAlerts: number;
  departments: string[];
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Active' | 'Monitoring';
  description: string;
}

const severityColors: Record<string, string> = {
  Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  High:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Low:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusDot: Record<string, string> = {
  Active:     'bg-red-500 animate-pulse',
  Monitoring: 'bg-yellow-500',
  Resolved:   'bg-green-500',
};

export function ThreatPatterns() {
  const [patterns, setPatterns]   = useState<ThreatPattern[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'patterns' | 'campaigns'>('campaigns');
  const [investigatedIds, setInvestigatedIds] = useState<Set<string>>(new Set());
  const [blockedDomains, setBlockedDomains]   = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/threats');
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { /* ignore */ }

      setPatterns(Array.isArray(data.patterns)  ? data.patterns  : []);
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    } catch (err) {
      console.error('[ThreatPatterns] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvestigate = (id: string) => {
    setInvestigatedIds(prev => new Set(prev).add(id));
  };

  const handleBlockDomain = (domain: string, campaignId: string) => {
    setBlockedDomains(prev => new Set(prev).add(domain));
    setInvestigatedIds(prev => new Set(prev).add(campaignId));
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-500" />
            Threat Intelligence
          </CardTitle>
          <button
            onClick={load}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-3">
          {(['campaigns', 'patterns'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {tab === 'campaigns' ? `🎯 Campaigns (${campaigns.length})` : `🛡 Patterns (${patterns.length})`}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
          </div>
        ) : activeTab === 'campaigns' ? (
          campaigns.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No campaigns detected</div>
          ) : (
            campaigns.map(campaign => {
              const isBlocked     = blockedDomains.has(campaign.domain);
              const isInvestigated = investigatedIds.has(campaign.id);
              return (
                <div
                  key={campaign.id}
                  className={`p-4 rounded-lg border transition-all ${severityColors[campaign.severity]} ${
                    isBlocked ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Globe className="w-4 h-4 flex-shrink-0" />
                        <span className="font-semibold text-sm truncate">{campaign.domain}</span>
                        <Badge className={severityColors[campaign.severity]}>
                          {campaign.severity}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${statusDot[campaign.status]}`} />
                          <span className="text-xs text-zinc-400">{isBlocked ? 'Blocked' : campaign.status}</span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-400 mb-2">{campaign.description}</p>

                      <div className="flex flex-wrap gap-2 text-xs mb-3">
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 flex items-center gap-1">
                          <Activity className="w-3 h-3" /> {campaign.totalAlerts} alerts
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-red-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {campaign.highRiskAlerts} high-risk
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {campaign.senderCount} senders
                        </span>
                      </div>

                      {campaign.departments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {campaign.departments.slice(0, 4).map(d => (
                            <span key={d} className="text-[10px] px-1.5 py-0.5 bg-zinc-800/80 rounded text-zinc-400">{d}</span>
                          ))}
                          {campaign.departments.length > 4 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800/80 rounded text-zinc-500">
                              +{campaign.departments.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleInvestigate(campaign.id)}
                          disabled={isInvestigated}
                          className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                            isInvestigated
                              ? 'bg-zinc-700 text-zinc-500 cursor-default'
                              : 'bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          {isInvestigated ? 'Investigated' : 'Investigate'}
                        </button>
                        <button
                          onClick={() => handleBlockDomain(campaign.domain, campaign.id)}
                          disabled={isBlocked}
                          className="flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 transition-colors"
                        >
                          <Shield className="w-3 h-3" />
                          Block Domain
                        </button>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-white">{campaign.totalAlerts}</div>
                      <div className="text-[10px] text-zinc-500">total alerts</div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          // ── Category Patterns tab ─────────────────────────────────────
          patterns.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No patterns detected</div>
          ) : (
            patterns.map(pattern => (
              <div
                key={pattern.id}
                className={`p-4 rounded-lg border ${severityColors[pattern.severity]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-semibold text-sm">{pattern.name}</span>
                      <Badge className={severityColors[pattern.severity]}>{pattern.severity}</Badge>
                      {pattern.status && (
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${statusDot[pattern.status] || 'bg-zinc-500'}`} />
                          <span className="text-xs text-zinc-400">{pattern.status}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mb-2">{pattern.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {pattern.indicators.map((ind, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">{ind}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-white">
                      <Eye className="w-4 h-4" />
                      <span className="font-bold text-lg">{pattern.detectedCount}</span>
                    </div>
                    <span className="text-xs text-zinc-500">detections</span>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </CardContent>
    </Card>
  );
}
