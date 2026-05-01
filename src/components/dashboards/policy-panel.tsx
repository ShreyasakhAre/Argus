'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRole } from '@/components/role-provider';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  Lock,
  Unlock,
  FileText,
  AlertCircle
} from 'lucide-react';

interface Policy {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'url' | 'attachment' | 'content' | 'behavior';
  status: 'active' | 'inactive' | 'draft';
  severity: 'low' | 'medium' | 'high' | 'critical';
  violations: number;
  last_triggered: string | null;
  created_at: string;
  updated_at: string;
}

interface PolicyViolation {
  id: string;
  policy_id: string;
  policy_name: string;
  notification_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  status: 'open' | 'resolved' | 'false_positive';
}

export function PolicyPanel() {
  const { orgId } = useRole();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'policies' | 'violations'>('policies');

  useEffect(() => {
    fetchPolicies();
    fetchViolations();
  }, [orgId]);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      // Mock policies data - in production would come from API
      const mockPolicies: Policy[] = [
        {
          id: 'pol_001',
          name: 'External Domain Blocking',
          description: 'Block emails from external domains not in whitelist',
          type: 'email',
          status: 'active',
          severity: 'high',
          violations: 145,
          last_triggered: '2024-01-15T14:30:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-10T12:15:00Z'
        },
        {
          id: 'pol_002',
          name: 'URL Link Scanning',
          description: 'Scan all embedded URLs for malicious content',
          type: 'url',
          status: 'active',
          severity: 'critical',
          violations: 89,
          last_triggered: '2024-01-15T16:45:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-12T09:30:00Z'
        },
        {
          id: 'pol_003',
          name: 'Attachment Type Control',
          description: 'Restrict executable and script file attachments',
          type: 'attachment',
          status: 'active',
          severity: 'medium',
          violations: 34,
          last_triggered: '2024-01-15T11:20:00Z',
          created_at: '2024-01-02T08:00:00Z',
          updated_at: '2024-01-08T14:45:00Z'
        },
        {
          id: 'pol_004',
          name: 'Executive Impersonation Detection',
          description: 'Detect emails claiming to be from executives',
          type: 'content',
          status: 'active',
          severity: 'critical',
          violations: 67,
          last_triggered: '2024-01-15T13:10:00Z',
          created_at: '2024-01-03T10:30:00Z',
          updated_at: '2024-01-11T16:20:00Z'
        },
        {
          id: 'pol_005',
          name: 'Urgency Keyword Detection',
          description: 'Flag emails with urgency and pressure keywords',
          type: 'content',
          status: 'inactive',
          severity: 'low',
          violations: 12,
          last_triggered: '2024-01-14T09:15:00Z',
          created_at: '2024-01-05T13:45:00Z',
          updated_at: '2024-01-13T11:30:00Z'
        },
        {
          id: 'pol_006',
          name: 'Behavioral Analysis',
          description: 'Analyze sender behavior patterns',
          type: 'behavior',
          status: 'draft',
          severity: 'medium',
          violations: 0,
          last_triggered: null,
          created_at: '2024-01-14T15:00:00Z',
          updated_at: '2024-01-14T15:00:00Z'
        }
      ];
      setPolicies(mockPolicies);
    } catch (error) {
      console.error('[Policy Panel] Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchViolations = async () => {
    try {
      // Mock violations data - in production would come from API
      const mockViolations: PolicyViolation[] = [
        {
          id: 'vio_001',
          policy_id: 'pol_001',
          policy_name: 'External Domain Blocking',
          notification_id: 'notif_12345',
          severity: 'high',
          description: 'Email from suspicious external domain detected',
          timestamp: '2024-01-15T14:30:00Z',
          status: 'open'
        },
        {
          id: 'vio_002',
          policy_id: 'pol_002',
          policy_name: 'URL Link Scanning',
          notification_id: 'notif_12346',
          severity: 'critical',
          description: 'Malicious URL found in email content',
          timestamp: '2024-01-15T16:45:00Z',
          status: 'open'
        },
        {
          id: 'vio_003',
          policy_id: 'pol_004',
          policy_name: 'Executive Impersonation Detection',
          notification_id: 'notif_12347',
          severity: 'critical',
          description: 'Email claiming to be from CEO detected',
          timestamp: '2024-01-15T13:10:00Z',
          status: 'resolved'
        }
      ];
      setViolations(mockViolations);
    } catch (error) {
      console.error('[Policy Panel] Error fetching violations:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'inactive': return 'bg-gray-500/20 text-gray-400';
      case 'draft': return 'bg-yellow-500/20 text-yellow-400';
      case 'open': return 'bg-red-500/20 text-red-400';
      case 'resolved': return 'bg-green-500/20 text-green-400';
      case 'false_positive': return 'bg-blue-500/20 text-blue-400';
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
      case 'email': return <FileText className="w-4 h-4" />;
      case 'url': return <Eye className="w-4 h-4" />;
      case 'attachment': return <AlertCircle className="w-4 h-4" />;
      case 'content': return <FileText className="w-4 h-4" />;
      case 'behavior': return <AlertTriangle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
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
          <h2 className="text-2xl font-bold text-white">Policies</h2>
          <p className="text-zinc-400">Manage security policies and violations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchPolicies} variant="outline" className="border-zinc-700 text-zinc-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Active Policies</p>
                <p className="text-3xl font-bold text-green-500">{policies.filter(p => p.status === 'active').length}</p>
              </div>
              <Shield className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Violations</p>
                <p className="text-3xl font-bold text-red-500">{violations.filter(v => v.status === 'open').length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Critical Policies</p>
                <p className="text-3xl font-bold text-orange-500">{policies.filter(p => p.severity === 'critical').length}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Draft Policies</p>
                <p className="text-3xl font-bold text-yellow-500">{policies.filter(p => p.status === 'draft').length}</p>
              </div>
              <Settings className="w-10 h-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('policies')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'policies'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Policies ({policies.length})
          </button>
          <button
            onClick={() => setActiveTab('violations')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'violations'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Violations ({violations.filter(v => v.status === 'open').length})
          </button>
        </div>
      </div>

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          {policies.map((policy) => (
            <Card key={policy.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(policy.type)}
                        <span className="font-semibold text-white">{policy.name}</span>
                      </div>
                      <Badge className={getStatusColor(policy.status)}>
                        {policy.status}
                      </Badge>
                      <Badge className={getSeverityColor(policy.severity)}>
                        {policy.severity}
                      </Badge>
                    </div>
                    
                    <p className="text-zinc-300 mb-3">{policy.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-400">Type:</span>
                        <span className="text-white ml-2 capitalize">{policy.type}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Violations:</span>
                        <span className="text-white ml-2">{policy.violations}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Last Triggered:</span>
                        <span className="text-white ml-2">
                          {policy.last_triggered ? new Date(policy.last_triggered).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Created:</span>
                        <span className="text-white ml-2">{new Date(policy.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300">
                      {policy.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Violations Tab */}
      {activeTab === 'violations' && (
        <div className="space-y-4">
          {violations.map((violation) => (
            <Card key={violation.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono text-sm text-zinc-400">{violation.notification_id}</span>
                      <Badge className={getSeverityColor(violation.severity)}>
                        {violation.severity}
                      </Badge>
                      <Badge className={getStatusColor(violation.status)}>
                        {violation.status}
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <p className="font-semibold text-white mb-1">{violation.policy_name}</p>
                      <p className="text-zinc-300">{violation.description}</p>
                    </div>
                    
                    <div className="text-sm text-zinc-400">
                      <span>Time: {new Date(violation.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300">
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                    {violation.status === 'open' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                    )}
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
