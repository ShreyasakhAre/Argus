'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRole } from '@/components/role-provider';
import { 
  AlertTriangle, 
  Shield, 
  Target, 
  Activity,
  RefreshCw,
  Eye,
  MapPin,
  Globe,
  Zap,
  TrendingUp,
  Calendar,
  Clock,
  Filter,
  Search
} from 'lucide-react';

interface Threat {
  id: string;
  type: 'phishing' | 'malware' | 'ransomware' | 'bec' | 'credential_theft' | 'data_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  title: string;
  description: string;
  source: string;
  target: string;
  confidence: number;
  first_seen: string;
  last_seen: string;
  affected_users: number;
  indicators: string[];
  mitigation_status: string;
}

interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  type: 'phishing_cluster' | 'repeat_domain' | 'campaign' | 'attack_vector';
  threat_count: number;
  confidence: number;
  first_seen: string;
  last_seen: string;
  indicators: string[];
  status: 'active' | 'inactive';
}

export function ThreatsPanel() {
  const { orgId } = useRole();
  const [threats, setThreats] = useState<Threat[]>([]);
  const [patterns, setPatterns] = useState<ThreatPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'threats' | 'patterns'>('threats');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  useEffect(() => {
    fetchThreats();
    fetchPatterns();
  }, [orgId]);

  const fetchThreats = async () => {
    setLoading(true);
    try {
      // Mock threats data - in production would come from API
      const mockThreats: Threat[] = [
        {
          id: 'thr_001',
          type: 'phishing',
          severity: 'critical',
          status: 'active',
          title: 'CEO Fraud Campaign',
          description: 'Sophisticated BEC attack targeting finance department with executive impersonation',
          source: 'external@malicious-domain.com',
          target: 'finance@company.com',
          confidence: 94,
          first_seen: '2024-01-15T08:30:00Z',
          last_seen: '2024-01-15T16:45:00Z',
          affected_users: 12,
          indicators: ['external@malicious-domain.com', 'urgent transfer request', 'executive impersonation'],
          mitigation_status: 'Investigation in progress'
        },
        {
          id: 'thr_002',
          type: 'malware',
          severity: 'high',
          status: 'investigating',
          title: 'Malicious Attachment Delivery',
          description: 'Excel macro malware delivered via email with invoice theme',
          source: 'billing@suspicious-sender.net',
          target: 'multiple@company.com',
          confidence: 87,
          first_seen: '2024-01-15T10:15:00Z',
          last_seen: '2024-01-15T14:20:00Z',
          affected_users: 8,
          indicators: ['macro-enabled excel', 'invoice theme', 'suspicious sender domain'],
          mitigation_status: 'Blocked and quarantined'
        },
        {
          id: 'thr_003',
          type: 'credential_theft',
          severity: 'medium',
          status: 'resolved',
          title: 'Credential Harvesting Attempt',
          description: 'Fake login page attempting to harvest employee credentials',
          source: 'internal-phishing@company.com',
          target: 'all-users@company.com',
          confidence: 76,
          first_seen: '2024-01-14T09:45:00Z',
          last_seen: '2024-01-14T11:30:00Z',
          affected_users: 5,
          indicators: ['fake login page', 'credential request', 'internal spoofing'],
          mitigation_status: 'Resolved and blocked'
        },
        {
          id: 'thr_004',
          type: 'ransomware',
          severity: 'critical',
          status: 'active',
          title: 'Ransomware Delivery Attempt',
          description: 'Ransomware payload disguised as software update',
          source: 'it-support@fake-it-dept.com',
          target: 'it-department@company.com',
          confidence: 91,
          first_seen: '2024-01-15T12:00:00Z',
          last_seen: '2024-01-15T15:30:00Z',
          affected_users: 3,
          indicators: ['fake IT support', 'software update theme', 'executable attachment'],
          mitigation_status: 'Emergency response activated'
        },
        {
          id: 'thr_005',
          type: 'bec',
          severity: 'high',
          status: 'investigating',
          title: 'Vendor Payment Diversion',
          description: 'BEC attack attempting to divert vendor payments to malicious accounts',
          source: 'vendor@legitimate-vendor.com',
          target: 'accounts-payable@company.com',
          confidence: 83,
          first_seen: '2024-01-15T07:20:00Z',
          last_seen: '2024-01-15T13:45:00Z',
          affected_users: 4,
          indicators: ['vendor impersonation', 'payment diversion', 'account change request'],
          mitigation_status: 'Under investigation'
        }
      ];
      setThreats(mockThreats);
    } catch (error) {
      console.error('[Threats Panel] Error fetching threats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatterns = async () => {
    try {
      // Mock threat patterns data - in production would come from API
      const mockPatterns: ThreatPattern[] = [
        {
          id: 'pat_001',
          name: 'Phishing Cluster - Office 365 Theme',
          description: 'Multiple phishing attempts using Office 365 login page templates',
          type: 'phishing_cluster',
          threat_count: 23,
          confidence: 89,
          first_seen: '2024-01-10T00:00:00Z',
          last_seen: '2024-01-15T23:59:59Z',
          indicators: ['office365-theme', 'login-page', 'credential-harvest'],
          status: 'active'
        },
        {
          id: 'pat_002',
          name: 'Repeat Domain - Fake IT Support',
          description: 'Repeated attacks from domains impersonating IT departments',
          type: 'repeat_domain',
          threat_count: 15,
          confidence: 92,
          first_seen: '2024-01-08T00:00:00Z',
          last_seen: '2024-01-15T18:30:00Z',
          indicators: ['it-support-spoof', 'technical-theme', 'urgent-action'],
          status: 'active'
        },
        {
          id: 'pat_003',
          name: 'Campaign - Executive Impersonation',
          description: 'Coordinated campaign targeting executives and finance departments',
          type: 'campaign',
          threat_count: 8,
          confidence: 95,
          first_seen: '2024-01-12T00:00:00Z',
          last_seen: '2024-01-15T16:45:00Z',
          indicators: ['executive-impersonation', 'finance-target', 'payment-request'],
          status: 'active'
        },
        {
          id: 'pat_004',
          name: 'Attack Vector - Macro Attachments',
          description: 'Consistent use of malicious macro-enabled documents',
          type: 'attack_vector',
          threat_count: 12,
          confidence: 86,
          first_seen: '2024-01-05T00:00:00Z',
          last_seen: '2024-01-14T22:15:00Z',
          indicators: ['macro-enabled', 'office-documents', 'malicious-code'],
          status: 'inactive'
        }
      ];
      setPatterns(mockPatterns);
    } catch (error) {
      console.error('[Threats Panel] Error fetching patterns:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-500/20 text-red-400';
      case 'investigating': return 'bg-yellow-500/20 text-yellow-400';
      case 'resolved': return 'bg-green-500/20 text-green-400';
      case 'false_positive': return 'bg-blue-500/20 text-blue-400';
      case 'inactive': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-500/20 text-blue-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'critical': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'phishing': return <Target className="w-4 h-4" />;
      case 'malware': return <AlertTriangle className="w-4 h-4" />;
      case 'ransomware': return <Shield className="w-4 h-4" />;
      case 'bec': return <Globe className="w-4 h-4" />;
      case 'credential_theft': return <Zap className="w-4 h-4" />;
      case 'data_breach': return <Activity className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredThreats = selectedSeverity === 'all' 
    ? threats 
    : threats.filter(t => t.severity === selectedSeverity);

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
          <h2 className="text-2xl font-bold text-white">Threat Intelligence</h2>
          <p className="text-zinc-400">Monitor and analyze security threats and patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchThreats} variant="outline" className="border-zinc-700 text-zinc-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <Search className="w-4 h-4 mr-2" />
            Search Threats
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Active Threats</p>
                <p className="text-3xl font-bold text-red-500">{threats.filter(t => t.status === 'active').length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Critical Severity</p>
                <p className="text-3xl font-bold text-orange-500">{threats.filter(t => t.severity === 'critical').length}</p>
              </div>
              <Shield className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Affected Users</p>
                <p className="text-3xl font-bold text-yellow-500">
                  {threats.reduce((sum, t) => sum + t.affected_users, 0)}
                </p>
              </div>
              <Activity className="w-10 h-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Threat Patterns</p>
                <p className="text-3xl font-bold text-purple-500">{patterns.filter(p => p.status === 'active').length}</p>
              </div>
              <Target className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('threats')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'threats'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Threats ({threats.length})
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'patterns'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Threat Patterns ({patterns.length})
            </button>
          </div>
          
          {activeTab === 'threats' && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select 
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm text-zinc-300"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Threats Tab */}
      {activeTab === 'threats' && (
        <div className="space-y-4">
          {filteredThreats.map((threat) => (
            <Card key={threat.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(threat.type)}
                        <span className="font-semibold text-white">{threat.title}</span>
                      </div>
                      <Badge className={getSeverityColor(threat.severity)}>
                        {threat.severity}
                      </Badge>
                      <Badge className={getStatusColor(threat.status)}>
                        {threat.status}
                      </Badge>
                      <Badge variant="outline" className="text-zinc-400">
                        {threat.confidence}% confidence
                      </Badge>
                    </div>
                    
                    <p className="text-zinc-300 mb-3">{threat.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-zinc-400">Type:</span>
                        <span className="text-white ml-2 capitalize">{threat.type.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Source:</span>
                        <span className="text-white ml-2 font-mono text-xs">{threat.source}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Target:</span>
                        <span className="text-white ml-2 font-mono text-xs">{threat.target}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Affected Users:</span>
                        <span className="text-white ml-2">{threat.affected_users}</span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-zinc-400 text-sm">Indicators: </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {threat.indicators.map((indicator, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-zinc-400">
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>First: {new Date(threat.first_seen).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Last: {new Date(threat.last_seen).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <span className="text-zinc-400 text-sm">Mitigation: </span>
                      <span className="text-zinc-300">{threat.mitigation_status}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300">
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                    {threat.status === 'active' && (
                      <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Investigate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="space-y-4">
          {patterns.map((pattern) => (
            <Card key={pattern.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-cyan-400" />
                        <span className="font-semibold text-white">{pattern.name}</span>
                      </div>
                      <Badge className={
                        pattern.type === 'phishing_cluster' ? 'bg-blue-500/20 text-blue-400' :
                        pattern.type === 'repeat_domain' ? 'bg-purple-500/20 text-purple-400' :
                        pattern.type === 'campaign' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-green-500/20 text-green-400'
                      }>
                        {pattern.type.replace('_', ' ')}
                      </Badge>
                      <Badge className={getStatusColor(pattern.status)}>
                        {pattern.status}
                      </Badge>
                      <Badge variant="outline" className="text-zinc-400">
                        {pattern.confidence}% confidence
                      </Badge>
                    </div>
                    
                    <p className="text-zinc-300 mb-3">{pattern.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-zinc-400">Threat Count:</span>
                        <span className="text-white ml-2">{pattern.threat_count}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Type:</span>
                        <span className="text-white ml-2 capitalize">{pattern.type.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Status:</span>
                        <span className="text-white ml-2">{pattern.status}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Confidence:</span>
                        <span className="text-white ml-2">{pattern.confidence}%</span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-zinc-400 text-sm">Indicators: </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {pattern.indicators.map((indicator, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-zinc-400">
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>First: {new Date(pattern.first_seen).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Last: {new Date(pattern.last_seen).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300">
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                    <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                      <Target className="w-4 h-4 mr-1" />
                      Analyze
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
