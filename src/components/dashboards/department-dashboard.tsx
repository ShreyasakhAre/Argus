'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRole } from '@/components/role-provider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2, AlertTriangle, Shield, TrendingUp, RefreshCw, ChevronDown, ChevronUp, CheckCircle, Mail, MessageSquare, Users, Building, DollarSign, Smartphone } from 'lucide-react';
import type { HeatmapData, Notification } from '@/lib/ml-service';
import { calculateDepartmentSecurityScore, formatSecurityScore } from '@/lib/security-score';
import { calculateThreatVelocity } from '@/lib/threat-velocity';
import { 
  useNotificationBulkSelect, 
  SelectAllNotSafeBar, 
  BulkActionBar, 
  BulkFeedbackToast,
  NotificationCheckbox,
  isNotSafe
} from '@/components/notification-bulk-actions';

const sourceAppIcons: Record<string, React.ReactNode> = {
  'Email': <Mail className="w-4 h-4" />,
  'Slack': <MessageSquare className="w-4 h-4" />,
  'Microsoft Teams': <Users className="w-4 h-4" />,
  'HR Portal': <Building className="w-4 h-4" />,
  'Finance System': <DollarSign className="w-4 h-4" />,
  'Internal Mobile App': <Smartphone className="w-4 h-4" />,
};

const sourceAppColors: Record<string, string> = {
  'Email': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Slack': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Microsoft Teams': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'HR Portal': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Finance System': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Internal Mobile App': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'notifications' | 'heatmap'>('overview');
  const [bulkMode, setBulkMode] = useState(false);
  const [safeSectionCollapsed, setSafeSectionCollapsed] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [showDepartmentsModal, setShowDepartmentsModal] = useState(false);

  const {
    selectedIds,
    notSafeCount,
    allNotSafeSelected,
    someSelected,
    toggleSelect,
    selectAllNotSafe,
    deselectAll,
    handleBulkAction,
    feedback: bulkFeedback,
  } = useNotificationBulkSelect(notifications);

  // Calculate department security scores
  const departmentSecurityScores = heatmapData ? Object.keys(heatmapData).map(dept => {
    const deptNotifications = notifications.filter(n => n.department === dept);
    const score = calculateDepartmentSecurityScore(deptNotifications, [], dept);
    return {
      department: dept,
      score: score.score,
      formatted: formatSecurityScore(score.score)
    };
  }) : [];

  // Calculate threat velocity
  const threatVelocity = calculateThreatVelocity(notifications);

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    deselectAll();
  };

  useEffect(() => {
    fetchHeatmap();
  }, [orgId]);

  const fetchHeatmap = async () => {
    setLoading(true);
    const [heatmapRes, notifRes] = await Promise.all([
      fetch(`/api/heatmap?org_id=${orgId}`),
      fetch(`/api/notifications?org_id=${orgId}`)
    ]);
    const heatmapData = await heatmapRes.json();
    const notifData = await notifRes.json();
    setHeatmapData(heatmapData.heatmap);
    setNotifications(notifData.notifications);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Department Head Dashboard</h2>
          <p className="text-zinc-400">Department-wise risk analysis and notifications for {orgId}</p>
        </div>
        {activeTab === 'notifications' && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleBulkMode}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                bulkMode 
                  ? 'bg-cyan-600 text-white' 
                  : 'border border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:bg-cyan-500/10'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Bulk Mode
            </button>
            <Badge variant="outline" className="text-red-500 border-red-500">
              {notSafeCount} Not Safe
            </Badge>
          </div>
        )}
      </div>

      {/* Threat Velocity Indicator - Only show on overview tab */}
      {activeTab === 'overview' && (
        <div className={`px-4 py-3 rounded-lg border ${
          threatVelocity.isSpike 
            ? 'bg-red-500/10 border-red-500/30' 
            : threatVelocity.percentageChange < 0 
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-blue-500/10 border-blue-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                threatVelocity.isSpike 
                  ? 'bg-red-500 animate-pulse' 
                  : threatVelocity.percentageChange < 0 
                    ? 'bg-green-500'
                    : 'bg-blue-500'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  threatVelocity.isSpike 
                    ? 'text-red-400' 
                    : threatVelocity.percentageChange < 0 
                      ? 'text-green-400'
                      : 'text-blue-400'
                }`}>
                  {threatVelocity.displayText}
                </p>
                <p className="text-xs text-slate-400">
                  High-risk alerts: {threatVelocity.current24h} (24h) vs {threatVelocity.previous24h} (prev 24h)
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-1 text-sm ${
              threatVelocity.isSpike 
                ? 'text-red-400' 
                : threatVelocity.percentageChange < 0 
                  ? 'text-green-400'
                  : 'text-blue-400'
            }`}>
              {threatVelocity.percentageChange > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4 rotate-180" />
              )}
              {Math.abs(threatVelocity.percentageChange).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'overview' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'notifications' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('heatmap')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'heatmap' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Heatmap
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Dialog open={showDepartmentsModal} onOpenChange={setShowDepartmentsModal}>
            <DialogTrigger asChild>
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all hover:scale-105 cursor-pointer">
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
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-white">Department Details</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[calc(80vh-120px)] space-y-3">
                {Object.entries(heatmapData).map(([dept, data]) => (
                  <div 
                    key={dept}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:bg-zinc-700 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedDepartment(dept);
                      setShowDepartmentsModal(false);
                      setActiveTab('notifications');
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">{dept}</h3>
                      <Badge 
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${getRiskColor(data.avg_risk_score)}30`,
                          color: getRiskColor(data.avg_risk_score)
                        }}
                      >
                        {getRiskLevel(data.avg_risk_score)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-400">Total: </span>
                        <span className="text-white font-medium">{data.total}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Not Safe: </span>
                        <span className="text-red-400 font-medium">{data.flagged}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Avg Risk: </span>
                        <span className="text-white font-medium">{Math.round(data.avg_risk_score * 100)}%</span>
                      </div>
                      <div className={`col-span-3 ${departmentSecurityScores.find(s => s.department === dept)?.formatted.bgColor || 'bg-zinc-800'} ${departmentSecurityScores.find(s => s.department === dept)?.formatted.borderColor || 'border-zinc-700'} rounded p-2`}>
                        <span className="text-zinc-400 text-xs">Security Score: </span>
                        <span className={`font-medium ${departmentSecurityScores.find(s => s.department === dept)?.formatted.color || 'text-zinc-300'}`}>
                          {departmentSecurityScores.find(s => s.department === dept)?.formatted.display || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Card 
            className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all hover:scale-105 cursor-pointer"
            onClick={() => {
              setSelectedDepartment(null);
              setActiveTab('notifications');
            }}
          >
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

          <Card 
            className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all hover:scale-105 cursor-pointer"
            onClick={() => {
              setSelectedDepartment(null);
              setActiveTab('notifications');
              // Auto-filter to show only Not Safe notifications
              setTimeout(() => {
                const notSafeSection = document.querySelector('[data-not-safe-section]');
                if (notSafeSection) {
                  notSafeSection.scrollIntoView({ behavior: 'smooth' });
                }
              }, 100);
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Not Safe Alerts</p>
                  <p className="text-3xl font-bold text-red-500">{totalFlagged}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <div className="relative group">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all hover:scale-105 cursor-pointer">
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
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Average risk score = sum(risk_score) / total notifications
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <>
          <BulkFeedbackToast message={bulkFeedback} />
          
          {bulkMode && (
            <>
              <SelectAllNotSafeBar 
                allNotSafeSelected={allNotSafeSelected}
                notSafeCount={notSafeCount}
                onToggle={selectAllNotSafe}
              />
              <BulkActionBar 
                selectedCount={selectedIds.size}
                role="department_head"
                onAction={handleBulkAction}
                onClear={deselectAll}
              />
            </>
          )}

          <div className="space-y-6">
            {/* Not Safe Section */}
            <div className="space-y-3" data-not-safe-section>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Not Safe Notifications ({selectedDepartment ? notifications.filter(isNotSafe).filter(n => n.department === selectedDepartment).length : notSafeCount})
                  {selectedDepartment && <Badge className="bg-zinc-700 text-zinc-300 text-xs">{selectedDepartment}</Badge>}
                </h3>
                {selectedDepartment && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedDepartment(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
              
              {notifications.filter(isNotSafe).filter(n => selectedDepartment ? n.department === selectedDepartment : true).length === 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                    <p className="text-zinc-300">No not-safe notifications{selectedDepartment ? ` for ${selectedDepartment}` : ''}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {notifications.filter(isNotSafe).filter(n => selectedDepartment ? n.department === selectedDepartment : true).slice(0, 200).map((notification) => (
                    <NotificationCard 
                      key={notification.notification_id}
                      notification={notification}
                      bulkMode={bulkMode}
                      selectedIds={selectedIds}
                      toggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Safe Section */}
            <div className="space-y-3">
              <button
                onClick={() => setSafeSectionCollapsed(!safeSectionCollapsed)}
                className="flex items-center justify-between w-full text-left group"
              >
                <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Safe Notifications ({selectedDepartment ? notifications.filter(n => !isNotSafe(n)).filter(n => n.department === selectedDepartment).length : notifications.length - notSafeCount})
                  {selectedDepartment && <Badge className="bg-zinc-700 text-zinc-300 text-xs">{selectedDepartment}</Badge>}
                </h3>
                {safeSectionCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300" />
                )}
              </button>
              
              {!safeSectionCollapsed && (
                <div className="flex flex-col gap-3">
                  {notifications.filter(n => !isNotSafe(n)).filter(n => selectedDepartment ? n.department === selectedDepartment : true).slice(0, 200).map((notification) => (
                    <NotificationCard 
                      key={notification.notification_id}
                      notification={notification}
                      bulkMode={false}
                      selectedIds={new Set()}
                      toggleSelect={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'heatmap' && (
        <>
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
                    formatter={(value: number | undefined) => [`${value}%`, 'Avg Risk']}
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
        </>
      )}
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
  bulkMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
}

function NotificationCard({
  notification,
  bulkMode,
  selectedIds,
  toggleSelect,
}: NotificationCardProps) {
  const notSafe = isNotSafe(notification);
  
  return (
    <div className={`bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors p-4 rounded-lg ${
      notSafe ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'
    }`}>
      <div className="flex items-start gap-3">
        {bulkMode && (
          <NotificationCheckbox
            notification={notification}
            isSelected={selectedIds.has(notification.notification_id)}
            onToggle={toggleSelect}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              {notSafe ? (
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
              <span className="font-mono text-sm text-zinc-400">{notification.notification_id}</span>
              <Badge className={`${sourceAppColors[notification.source_app]} flex items-center gap-1`}>
                {sourceAppIcons[notification.source_app]}
                {notification.source_app}
              </Badge>
              <Badge className={
                notification.risk_level === 'High' ? 'bg-red-500/20 text-red-400' :
                notification.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }>
                {notification.risk_level} ({Math.round(notification.risk_score * 100)}%)
              </Badge>
              <Badge variant="outline" className="text-zinc-400">{notification.department}</Badge>
              {notSafe && (
                <Badge className="bg-red-500/20 text-red-400">
                  Not Safe
                </Badge>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div><span className="text-zinc-400">From: </span><span className="text-white">{notification.sender}</span></div>
            <div><span className="text-zinc-400">To: </span><span className="text-white">{notification.receiver}</span></div>
          </div>
          <p className="text-white bg-zinc-800 p-3 rounded-lg text-sm line-clamp-2 mb-2">{notification.content}</p>
          <p className="text-xs text-zinc-400">{notification.timestamp}</p>
        </div>
      </div>
    </div>
  );
}
