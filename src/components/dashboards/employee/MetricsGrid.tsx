'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Mail,
  AlertTriangle,
  CheckCircle,
  Shield,
  TrendingUp,
  RefreshCw,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { calculateSecurityScore, formatSecurityScore } from '@/lib/security-score';

interface MetricsGridProps {
  stats: {
    totalNotifications: number;
    safe: number;
    suspicious: number;
    malicious: number;
    notSafe: number;
  };
  notifications: any[];
  userFeedback: any[];
  onRefresh: () => void;
  onSetBulkMode: (mode: boolean) => void;
  bulkMode: boolean;
  notSafeCount: number;
  onSetActiveTab: (tab: 'scanners') => void;
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font-bold">
              {value}
            </p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsGrid({
  stats,
  notifications,
  userFeedback,
  onRefresh,
  onSetBulkMode,
  bulkMode,
  notSafeCount,
  onSetActiveTab,
}: MetricsGridProps) {
  const securityScore = calculateSecurityScore(notifications, userFeedback);
  const formattedScore = formatSecurityScore(securityScore.score);

  return (
    <>
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard
          title="Total Notifications"
          value={stats.totalNotifications}
          icon={<Mail className="w-8 h-8 text-cyan-400" />}
        />

        <MetricCard
          title="Safe"
          value={stats.safe}
          icon={
            <CheckCircle className="w-8 h-8 text-green-500" />
          }
        />

        <MetricCard
          title="Suspicious"
          value={stats.suspicious}
          icon={
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          }
        />

        <MetricCard
          title="Not Safe"
          value={stats.notSafe}
          icon={
            <AlertTriangle className="w-8 h-8 text-red-500" />
          }
        />

        <Card
          className={`border ${formattedScore?.borderColor ?? ''} ${formattedScore?.bgColor ?? ''}`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Security Score
                </p>
                <p
                  className={`text-3xl font-bold ${formattedScore?.color ?? ''}`}
                >
                  {formattedScore?.display ?? 'N/A'}
                </p>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Personal safety posture
                </div>
              </div>

              <Shield
                className={`w-8 h-8 ${formattedScore?.color ?? ''}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Button variant="outline" className="h-20 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => onSetActiveTab('scanners')}>
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-xs">Report Phishing</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => onSetActiveTab('scanners')}>
          <Smartphone className="w-5 h-5 text-cyan-500" />
          <span className="text-xs">Scan Link</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => onSetActiveTab('scanners')}>
          <QrCode className="w-5 h-5 text-indigo-500" />
          <span className="text-xs">Check QR</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => window.open('/training', '_blank')}>
          <Shield className="w-5 h-5 text-green-500" />
          <span className="text-xs">View Training Tips</span>
        </Button>
      </div>

      {/* HEADER ACTIONS */}
      <div className="flex items-center gap-2 flex-wrap mt-6">
        <Badge
          variant="outline"
          className="text-red-500 border-red-500"
        >
          {notSafeCount ?? 0} Not Safe
        </Badge>

        <Button
          variant={bulkMode ? 'default' : 'outline'}
          onClick={() => onSetBulkMode(!bulkMode)}
        >
          Bulk Mode
        </Button>

        <Button
          variant="outline"
          onClick={onRefresh}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </>
  );
}
