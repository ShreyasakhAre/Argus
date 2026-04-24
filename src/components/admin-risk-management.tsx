"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  Users, BarChart3, Filter, Search, RefreshCw, Download,
  UserCheck, UserX, Eye, EyeOff, Play, Pause, Clock
} from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface UserRiskData {
  id: string;
  name: string;
  email: string;
  department: string;
  employeeId: string;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  lastRiskUpdate: string;
  behaviorCount: number;
  recentBehavior: Array<{
    action: string;
    scoreChange: number;
    newScore: number;
    timestamp: string;
  }>;
}

interface DepartmentRiskData {
  name: string;
  avgRiskScore: number;
  maxRiskScore: number;
  minRiskScore: number;
  employeeCount: number;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export function AdminRiskManagement() {
  const [users, setUsers] = useState<UserRiskData[]>([]);
  const [departments, setDepartments] = useState<DepartmentRiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortBy, setSortBy] = useState('riskScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDetails, setShowDetails] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, [page, filter, riskLevelFilter, departmentFilter, sortBy, sortOrder]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder
      });

      if (filter) params.append('search', filter);
      if (riskLevelFilter) params.append('riskLevel', riskLevelFilter);
      if (departmentFilter) params.append('department', departmentFilter);

      const data = await api.get<any>(`/api/risk/users?${params}`);
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setTotal(Number(data?.total || 0));
      setTotalPages(Number(data?.totalPages || 1));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await api.get<any>('/api/risk/department-summary');
      setDepartments(Array.isArray(data?.departments) ? data.departments : []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const simulateBehavior = async (userId: string, behaviorType: string) => {
    setSimulating(true);
    try {
      await api.post<any>('/api/risk/simulate', {
          userId,
          behaviorType,
          count: 1
        });

      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Failed to simulate behavior:', error);
    } finally {
      setSimulating(false);
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const exportData = () => {
    const csvContent = [
      ['Name', 'Email', 'Department', 'Risk Score', 'Risk Level', 'Last Update'],
      ...users.map(user => [
        user.name,
        user.email,
        user.department,
        user.riskScore,
        user.riskLevel,
        formatTimestamp(user.lastRiskUpdate)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Department Overview */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Department Risk Overview
          </PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept, index) => (
              <div key={index} className="p-4 rounded-lg border border-slate-700 bg-slate-900/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white">{dept.name}</h4>
                  <span className={`text-lg font-bold ${getScoreColor(dept.avgRiskScore)}`}>
                    {dept.avgRiskScore}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Employees:</span>
                    <span className="text-white">{dept.employeeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Risk Range:</span>
                    <span className="text-white">{dept.minRiskScore} - {dept.maxRiskScore}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1 text-center p-1 bg-green-500/20 rounded">
                      <div className="text-green-400 text-xs">{dept.riskDistribution.low}</div>
                      <div className="text-green-300 text-xs">Low</div>
                    </div>
                    <div className="flex-1 text-center p-1 bg-yellow-500/20 rounded">
                      <div className="text-yellow-400 text-xs">{dept.riskDistribution.medium}</div>
                      <div className="text-yellow-300 text-xs">Med</div>
                    </div>
                    <div className="flex-1 text-center p-1 bg-red-500/20 rounded">
                      <div className="text-red-400 text-xs">{dept.riskDistribution.high}</div>
                      <div className="text-red-300 text-xs">High</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* User Risk Management */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              User Risk Management
              <span className="text-sm text-slate-400">({total} employees)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchUsers}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportData}
                className="text-slate-400 hover:text-white"
              >
                <Download className="w-4 h-4" />
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
                  placeholder="Search employees..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                />
              </div>
            </div>
            <select
              value={riskLevelFilter}
              onChange={(e) => setRiskLevelFilter(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Risk Levels</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.name} value={dept.name}>{dept.name}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
            >
              <option value="riskScore">Risk Score</option>
              <option value="name">Name</option>
              <option value="department">Department</option>
              <option value="lastRiskUpdate">Last Update</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
            >
              <option value="desc">Highest First</option>
              <option value="asc">Lowest First</option>
            </select>
          </div>

          {/* User List */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
          ) : users.length === 0 ? (
            <Alert className="border-slate-500/30 bg-slate-500/10">
              <Users className="h-4 w-4 text-slate-400" />
              <AlertDescription className="text-slate-300">
                No users found matching the current filters.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 rounded-lg border ${getRiskColor(user.riskLevel, user.riskScore)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(user.riskScore)}`}>
                          {user.riskScore}
                        </div>
                        <div className="text-xs text-slate-400">{user.riskLevel}</div>
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{user.name}</h4>
                        <p className="text-sm text-slate-400">{user.email}</p>
                        <p className="text-xs text-slate-500">{user.department} • {user.employeeId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <div className="text-slate-400">Last activity</div>
                        <div className="text-white">{formatTimestamp(user.lastRiskUpdate)}</div>
                        <div className="text-slate-400">{user.behaviorCount} actions</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => simulateBehavior(user.id, 'clicked_suspicious_link')}
                          disabled={simulating}
                          className="text-red-400 hover:text-red-300"
                          title="Simulate risky behavior"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => simulateBehavior(user.id, 'reported_phishing')}
                          disabled={simulating}
                          className="text-green-400 hover:text-green-300"
                          title="Simulate good behavior"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Recent Behavior */}
                  {(Array.isArray(user.recentBehavior) ? user.recentBehavior : []).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <Clock className="w-3 h-3" />
                        Recent Activity
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {(Array.isArray(user.recentBehavior) ? user.recentBehavior : []).slice(0, 3).map((action, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 text-xs rounded-full ${
                              action.scoreChange > 0
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-green-500/20 text-green-300'
                            }`}
                          >
                            {action.action.replace('_', ' ')} ({action.scoreChange > 0 ? '+' : ''}{action.scoreChange})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
                Showing {users.length} of {total} employees
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
