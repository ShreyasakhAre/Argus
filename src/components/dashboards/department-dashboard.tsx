'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/components/role-provider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2, AlertTriangle, Shield, TrendingUp, RefreshCw } from 'lucide-react';
import type { HeatmapData } from '@/lib/ml-service';

const getRiskColor = (score: number) => {
  if (score >= 0.7) return '#ef4444';
  if (score >= 0.4) return '#f59e0b';
  return '#22c55e';
};

const getRiskLevel = (score: number) => {
  if (score >= 0.7) return 'High';
  if (score >= 0.4) return 'Medium';
  return 'Low';
};

export function DepartmentHeadDashboard() {
  const { orgId } = useRole();
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeatmap();
  }, [orgId]);

  const fetchHeatmap = async () => {
    setLoading(true);
    const res = await fetch(`/api/heatmap?org_id=${orgId}`);
    const data = await res.json();
    setHeatmapData(data.heatmap);
    setLoading(false);
  };

  if (loading || !heatmapData) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div>;
  }

  const chartData = Object.entries(heatmapData).map(([dept, data]) => ({
    department: dept,
    avgRisk: Math.round(data.avg_risk_score * 100),
    flagged: data.flagged,
    total: data.total,
    highRisk: data.high_risk,
    mediumRisk: data.medium_risk,
    lowRisk: data.low_risk,
  })).sort((a, b) => b.avgRisk - a.avgRisk);

  const totalFlagged = Object.values(heatmapData).reduce((sum, d) => sum + d.flagged, 0);
  const totalNotifications = Object.values(heatmapData).reduce((sum, d) => sum + d.total, 0);
  const avgRisk = Object.values(heatmapData).reduce((sum, d) => sum + d.avg_risk_score, 0) / Object.keys(heatmapData).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Department Head Dashboard</h2>
        <p className="text-zinc-400">Department-wise risk analysis and heatmap for {orgId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Departments</p>
                <p className="text-3xl font-bold text-white">{Object.keys(heatmapData).length}</p>
              </div>
              <Building2 className="w-10 h-10 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Notifications</p>
                <p className="text-3xl font-bold text-white">{totalNotifications}</p>
              </div>
              <Shield className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Flagged Alerts</p>
                <p className="text-3xl font-bold text-red-500">{totalFlagged}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Avg Risk Score</p>
                <p className="text-3xl font-bold" style={{ color: getRiskColor(avgRisk) }}>
                  {Math.round(avgRisk * 100)}%
                </p>
              </div>
              <TrendingUp className="w-10 h-10" style={{ color: getRiskColor(avgRisk) }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Department Risk Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {chartData.map((dept) => (
              <div 
                key={dept.department}
                className="relative p-4 rounded-lg border border-zinc-700 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${getRiskColor(dept.avgRisk / 100)}20 0%, transparent 100%)`
                }}
              >
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{ backgroundColor: getRiskColor(dept.avgRisk / 100) }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{dept.department}</span>
                    <Badge 
                      className="text-xs"
                      style={{ 
                        backgroundColor: `${getRiskColor(dept.avgRisk / 100)}30`,
                        color: getRiskColor(dept.avgRisk / 100)
                      }}
                    >
                      {getRiskLevel(dept.avgRisk / 100)}
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-2" style={{ color: getRiskColor(dept.avgRisk / 100) }}>
                    {dept.avgRisk}%
                  </div>
                  <div className="text-xs text-zinc-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="text-white">{dept.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flagged:</span>
                      <span className="text-red-400">{dept.flagged}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Risk Distribution by Department</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="department" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={(value: number) => [`${value}%`, 'Avg Risk']}
              />
              <Bar dataKey="avgRisk" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getRiskColor(entry.avgRisk / 100)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Detailed Department Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Department</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-medium">Total</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-medium">High Risk</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-medium">Medium Risk</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-medium">Low Risk</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-medium">Flagged</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-medium">Avg Risk</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((dept) => (
                  <tr key={dept.department} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-3 px-4 text-white font-medium">{dept.department}</td>
                    <td className="text-center py-3 px-4 text-zinc-300">{dept.total}</td>
                    <td className="text-center py-3 px-4">
                      <Badge className="bg-red-500/20 text-red-400">{dept.highRisk}</Badge>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge className="bg-yellow-500/20 text-yellow-400">{dept.mediumRisk}</Badge>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge className="bg-green-500/20 text-green-400">{dept.lowRisk}</Badge>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge className="bg-red-500/20 text-red-400">{dept.flagged}</Badge>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span style={{ color: getRiskColor(dept.avgRisk / 100) }} className="font-bold">
                        {dept.avgRisk}%
                      </span>
                    </td>
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
