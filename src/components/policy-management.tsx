"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Shield, Play, Pause, Plus, Edit, Trash2, Settings, 
  Filter, Search, RefreshCw, AlertTriangle, CheckCircle,
  Clock, BarChart3, GitBranch, Zap, Eye, EyeOff
} from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Policy {
  _id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  category: string;
  conditions: {
    riskScore: {
      operator: string;
      value: number;
    };
    riskLevel?: string;
    department?: string;
    attackType?: string;
  };
  actions: Array<{
    type: string;
    parameters: any;
    delay: number;
  }>;
  executionStats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecuted: string;
  };
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

interface CreatePolicyData {
  name: string;
  description: string;
  priority: number;
  category: string;
  conditions: {
    riskScore: {
      operator: string;
      value: number;
    };
    riskLevel?: string;
    department?: string;
    attackType?: string;
  };
  actions: Array<{
    type: string;
    parameters: any;
    delay: number;
  }>;
}

export function PolicyManagement() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<boolean | undefined>(undefined);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, [enabledFilter, categoryFilter]);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (enabledFilter !== undefined) params.append('enabled', enabledFilter.toString());
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await fetch(`/api/policies?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies);
      }
    } catch (error) {
      console.error('Failed to fetch policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPolicy = async (policyData: CreatePolicyData) => {
    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyData)
      });

      if (res.ok) {
        fetchPolicies();
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Failed to create policy:', error);
    }
  };

  const updatePolicy = async (policyId: string, policyData: Partial<Policy>) => {
    try {
      const res = await fetch(`/api/policies/${policyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyData)
      });

      if (res.ok) {
        fetchPolicies();
        setEditingPolicy(null);
      }
    } catch (error) {
      console.error('Failed to update policy:', error);
    }
  };

  const deletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      const res = await fetch(`/api/policies/${policyId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchPolicies();
      }
    } catch (error) {
      console.error('Failed to delete policy:', error);
    }
  };

  const togglePolicy = async (policyId: string, enabled: boolean) => {
    await updatePolicy(policyId, { enabled } as any);
  };

  const simulatePolicy = async (scenario: string) => {
    setSimulating(true);
    try {
      const res = await fetch('/api/policies/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Simulation result:', data);
      }
    } catch (error) {
      console.error('Failed to simulate policy:', error);
    } finally {
      setSimulating(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      security: 'text-red-400 border-red-500/30 bg-red-500/10',
      compliance: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
      operational: 'text-green-400 border-green-500/30 bg-green-500/10',
      emergency: 'text-orange-400 border-orange-500/30 bg-orange-500/10'
    };
    return colors[category] || 'text-slate-400 border-slate-500/30 bg-slate-500/10';
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'block_sender': return <Shield className="w-4 h-4 text-red-400" />;
      case 'mute_domain': return <Shield className="w-4 h-4 text-orange-400" />;
      case 'create_incident': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'create_case': return <AlertTriangle className="w-4 h-4 text-purple-400" />;
      case 'notify_admin': return <Zap className="w-4 h-4 text-blue-400" />;
      case 'notify_analyst': return <Zap className="w-4 h-4 text-cyan-400" />;
      case 'mark_safe': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'archive': return <EyeOff className="w-4 h-4 text-slate-400" />;
      case 'escalate': return <GitBranch className="w-4 h-4 text-pink-400" />;
      default: return <Settings className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'block_sender': return 'Block Sender';
      case 'mute_domain': return 'Mute Domain';
      case 'create_incident': return 'Create Incident';
      case 'create_case': return 'Create Case';
      case 'notify_admin': return 'Notify Admin';
      case 'notify_analyst': return 'Notify Analyst';
      case 'mark_safe': return 'Mark Safe';
      case 'archive': return 'Archive';
      case 'escalate': return 'Escalate';
      default: return actionType;
    }
  };

  const getOperatorLabel = (operator: string) => {
    switch (operator) {
      case 'gt': return '>';
      case 'gte': return '>=';
      case 'lt': return '<';
      case 'lte': return '<=';
      case 'eq': return '=';
      case 'ne': return '!=';
      default: return operator;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.name.toLowerCase().includes(filter.toLowerCase()) ||
                         policy.description.toLowerCase().includes(filter.toLowerCase());
    return matchesSearch;
  });

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Policy Management
              <span className="text-sm text-slate-400">({policies.length} policies)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulatePolicy('high_risk_phishing')}
                disabled={simulating}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Play className="w-4 h-4 mr-2" />
                Test High Risk
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPolicies}
                className="border-slate-600 text-slate-300"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Policy
              </Button>
            </div>
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
                  placeholder="Search policies..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                />
              </div>
            </div>
            <select
              value={enabledFilter?.toString() || ''}
              onChange={(e) => setEnabledFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Status</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Categories</option>
              <option value="security">Security</option>
              <option value="compliance">Compliance</option>
              <option value="operational">Operational</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Policy List */}
      <div className="space-y-3">
        {filteredPolicies.length === 0 ? (
          <Alert className="border-slate-500/30 bg-slate-500/10">
            <Shield className="h-4 w-4 text-slate-400" />
            <AlertDescription className="text-slate-300">
              No policies found matching the current filters.
            </AlertDescription>
          </Alert>
        ) : (
          filteredPolicies.map((policy) => (
            <PremiumCard key={policy._id} className="border-slate-700">
              <PremiumCardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-white">{policy.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getCategoryColor(policy.category)}`}>
                        {policy.category}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        policy.enabled 
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        {policy.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className="text-xs text-slate-400">Priority: {policy.priority}</span>
                    </div>
                    
                    <p className="text-sm text-slate-300 mb-3">{policy.description}</p>
                    
                    {/* Conditions */}
                    <div className="space-y-2 mb-3">
                      <div className="text-sm font-medium text-slate-400">Conditions:</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                          Risk Score {getOperatorLabel(policy.conditions.riskScore.operator)} {policy.conditions.riskScore.value}
                        </span>
                        {policy.conditions.riskLevel && (
                          <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                            Level: {policy.conditions.riskLevel}
                          </span>
                        )}
                        {policy.conditions.department && (
                          <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                            Dept: {policy.conditions.department}
                          </span>
                        )}
                        {policy.conditions.attackType && (
                          <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                            Type: {policy.conditions.attackType}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="space-y-2 mb-3">
                      <div className="text-sm font-medium text-slate-400">Actions:</div>
                      <div className="flex flex-wrap gap-2">
                        {policy.actions.map((action, index) => (
                          <div key={index} className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                            {getActionIcon(action.type)}
                            <span>{getActionLabel(action.type)}</span>
                            {action.delay > 0 && <span className="text-slate-500">({action.delay}s)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Executions: {policy.executionStats.totalExecutions}</span>
                      <span>Success Rate: {policy.executionStats.totalExecutions > 0 
                        ? Math.round((policy.executionStats.successfulExecutions / policy.executionStats.totalExecutions) * 100)
                        : 0}%</span>
                      <span>Last: {policy.executionStats.lastExecuted 
                        ? formatTimestamp(policy.executionStats.lastExecuted)
                        : 'Never'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePolicy(policy._id, !policy.enabled)}
                      className={policy.enabled ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}
                    >
                      {policy.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingPolicy(policy)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePolicy(policy._id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </PremiumCardContent>
            </PremiumCard>
          ))
        )}
      </div>

      {/* Create/Edit Policy Modal */}
      {(showCreateForm || editingPolicy) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-white mb-4">
              {editingPolicy ? 'Edit Policy' : 'Create Policy'}
            </h3>
            
            <PolicyForm
              policy={editingPolicy}
              onSubmit={editingPolicy ? (data) => updatePolicy(editingPolicy._id, data) : createPolicy}
              onCancel={() => {
                setShowCreateForm(false);
                setEditingPolicy(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PolicyForm({ policy, onSubmit, onCancel }: {
  policy?: Policy | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: policy?.name || '',
    description: policy?.description || '',
    priority: policy?.priority || 50,
    category: policy?.category || 'security',
    enabled: policy?.enabled ?? true,
    conditions: policy?.conditions || {
      riskScore: { operator: 'gt', value: 70 }
    },
    actions: policy?.actions || [{ type: 'notify_admin', parameters: {}, delay: 0 }]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { type: 'notify_admin', parameters: {}, delay: 0 }]
    });
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  const updateAction = (index: number, field: string, value: any) => {
    const newActions = [...formData.actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setFormData({ ...formData, actions: newActions });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
          >
            <option value="security">Security</option>
            <option value="compliance">Compliance</option>
            <option value="operational">Operational</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Risk Score Condition</label>
        <div className="flex gap-2">
          <select
            value={formData.conditions.riskScore.operator}
            onChange={(e) => setFormData({
              ...formData,
              conditions: {
                ...formData.conditions,
                riskScore: { ...formData.conditions.riskScore, operator: e.target.value }
              }
            })}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
          >
            <option value="gt">Greater than (&gt;)</option>
            <option value="gte">Greater or equal (&gt;=)</option>
            <option value="lt">Less than (&lt;)</option>
            <option value="lte">Less or equal (&lt;=)</option>
            <option value="eq">Equal (=)</option>
            <option value="ne">Not equal (!=)</option>
          </select>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.conditions.riskScore.value}
            onChange={(e) => setFormData({
              ...formData,
              conditions: {
                ...formData.conditions,
                riskScore: { ...formData.conditions.riskScore, value: parseInt(e.target.value) }
              }
            })}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Actions</label>
        <div className="space-y-2">
          {formData.actions.map((action, index) => (
            <div key={index} className="flex gap-2">
              <select
                value={action.type}
                onChange={(e) => updateAction(index, 'type', e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              >
                <option value="block_sender">Block Sender</option>
                <option value="mute_domain">Mute Domain</option>
                <option value="create_incident">Create Incident</option>
                <option value="create_case">Create Case</option>
                <option value="notify_admin">Notify Admin</option>
                <option value="notify_analyst">Notify Analyst</option>
                <option value="mark_safe">Mark Safe</option>
                <option value="archive">Archive</option>
                <option value="escalate">Escalate</option>
              </select>
              <input
                type="number"
                min="0"
                placeholder="Delay (s)"
                value={action.delay}
                onChange={(e) => updateAction(index, 'delay', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAction(index)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAction}
            className="border-slate-600 text-slate-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Action
          </Button>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600">
          {policy ? 'Update' : 'Create'} Policy
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-slate-600 text-slate-300"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
