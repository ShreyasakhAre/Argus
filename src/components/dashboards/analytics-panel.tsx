'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRole } from '@/components/role-provider';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  BarChart3, 
  PieChart as PieChartIcon,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  Target,
  Users,
  Globe,
  Clock
} from 'lucide-react';

interface AnalyticsData {
  timeTrends: Array<{
    date: string;
    total: number;
    flagged: number;
    safe: number;
    risk: number;
  }>;
  departmentStats: Array<{
    department: string;
    total: number;
    flagged: number;
    risk: number;
    users: number;
  }>;
  threatTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  sourceAnalysis: Array<{
    source: string;
    internal: number;
    external: number;
    risk: number;
  }>;
  channelMetrics: Array<{
    channel: string;
    volume: number;
    risk: number;
    blocked: number;
  }>;
}

export function AnalyticsPanel() {
  const { orgId } = useRole();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [orgId, dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Mock analytics data - in production would come from API
      const mockData: AnalyticsData = {
        timeTrends: [
          { date: 'Jan 10', total: 145, flagged: 23, safe: 122, risk: 15.8 },
          { date: 'Jan 11', total: 162, flagged: 31, safe: 131, risk: 19.1 },
          { date: 'Jan 12', total: 138, flagged: 18, safe: 120, risk: 13.0 },
          { date: 'Jan 13', total: 171, flagged: 29, safe: 142, risk: 16.9 },
          { date: 'Jan 14', total: 155, flagged: 25, safe: 130, risk: 16.1 },
          { date: 'Jan 15', total: 189, flagged: 34, safe: 155, risk: 17.9 },
        ],
        departmentStats: [
          { department: 'Finance', total: 89, flagged: 15, risk: 16.8, users: 12 },
          { department: 'IT', total: 156, flagged: 28, risk: 17.9, users: 25 },
          { department: 'HR', total: 67, flagged: 8, risk: 11.9, users: 8 },
          { department: 'Sales', total: 234, flagged: 41, risk: 17.5, users: 45 },
          { department: 'Marketing', total: 98, flagged: 12, risk: 12.2, users: 15 },
          { department: 'Operations', total: 112, flagged: 19, risk: 16.9, users: 18 },
        ],
        threatTypes: [
          { type: 'Phishing', count: 67, percentage: 35.4 },
          { type: 'BEC', count: 45, percentage: 23.8 },
          { type: 'Malware', count: 38, percentage: 20.1 },
          { type: 'Credential Theft', count: 28, percentage: 14.8 },
          { type: 'Ransomware', count: 11, percentage: 5.9 },
        ],
        sourceAnalysis: [
          { source: 'Internal', internal: 423, external: 0, risk: 8.2 },
          { source: 'External', internal: 0, external: 267, risk: 24.6 },
          { source: 'Partner', internal: 89, external: 134, risk: 15.3 },
        ],
        channelMetrics: [
          { channel: 'Email', volume: 567, risk: 18.4, blocked: 89 },
          { channel: 'Web', volume: 234, risk: 12.7, blocked: 34 },
          { channel: 'API', volume: 123, risk: 9.8, blocked: 12 },
          { channel: 'Mobile', volume: 89, risk: 14.2, blocked: 18 },
        ]
      };
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('[Analytics Panel] Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    // In production, this would export the actual data
    console.log(`Exporting analytics data as ${format}`);
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#06b6d4', '#3b82f6', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics</h2>
          <p className="text-zinc-400">Security metrics and trend analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm text-zinc-300"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <Button onClick={fetchAnalyticsData} variant="outline" className="border-zinc-700 text-zinc-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => handleExport('csv')} variant="outline" className="border-zinc-700 text-zinc-300">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Volume</p>
                <p className="text-3xl font-bold text-cyan-500">
                  {analyticsData.timeTrends.reduce((sum, day) => sum + day.total, 0).toLocaleString()}
                </p>
              </div>
              <Activity className="w-10 h-10 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Flagged Alerts</p>
                <p className="text-3xl font-bold text-red-500">
                  {analyticsData.timeTrends.reduce((sum, day) => sum + day.flagged, 0).toLocaleString()}
                </p>
              </div>
              <Target className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Avg Risk Score</p>
                <p className="text-3xl font-bold text-orange-500">
                  {(analyticsData.timeTrends.reduce((sum, day) => sum + day.risk, 0) / analyticsData.timeTrends.length).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Departments</p>
                <p className="text-3xl font-bold text-purple-500">{analyticsData.departmentStats.length}</p>
              </div>
              <Users className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Trends Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
            Security Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.timeTrends}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorFlagged" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 41, 0.8)',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Area type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total" />
              <Area type="monotone" dataKey="flagged" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFlagged)" name="Flagged" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Department Risk Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Department Risk Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData.departmentStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="department" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 41, 0.8)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="flagged" fill="#ef4444" name="Flagged" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Threat Type Distribution */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-orange-500" />
              Threat Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analyticsData.threatTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {analyticsData.threatTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 41, 0.8)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {analyticsData.threatTypes.map((type, idx) => (
                <div key={type.type} className="flex items-center justify-between p-2 rounded bg-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-sm text-zinc-300">{type.type}</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-400">{type.count} ({type.percentage}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source and Channel Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-500" />
              Source Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analyticsData.sourceAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="source" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 41, 0.8)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="internal" fill="#22c55e" name="Internal" radius={[4, 4, 0, 0]} />
                <Bar dataKey="external" fill="#ef4444" name="External" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Channel Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analyticsData.channelMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="channel" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 41, 0.8)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Line type="monotone" dataKey="volume" stroke="#06b6d4" strokeWidth={2} name="Volume" />
                <Line type="monotone" dataKey="risk" stroke="#f97316" strokeWidth={2} name="Risk %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Department Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Department Detailed Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left p-3 text-zinc-400">Department</th>
                  <th className="text-left p-3 text-zinc-400">Total Alerts</th>
                  <th className="text-left p-3 text-zinc-400">Flagged</th>
                  <th className="text-left p-3 text-zinc-400">Risk %</th>
                  <th className="text-left p-3 text-zinc-400">Users</th>
                  <th className="text-left p-3 text-zinc-400">Alerts/User</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.departmentStats.map((dept) => (
                  <tr key={dept.department} className="border-b border-zinc-800">
                    <td className="p-3 text-white font-medium">{dept.department}</td>
                    <td className="p-3 text-zinc-300">{dept.total}</td>
                    <td className="p-3 text-zinc-300">{dept.flagged}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        dept.risk > 15 ? 'bg-red-500/20 text-red-400' :
                        dept.risk > 10 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {dept.risk}%
                      </span>
                    </td>
                    <td className="p-3 text-zinc-300">{dept.users}</td>
                    <td className="p-3 text-zinc-300">{(dept.total / dept.users).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
