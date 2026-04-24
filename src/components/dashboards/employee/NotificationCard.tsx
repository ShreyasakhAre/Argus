'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  Clock,
  Sparkles,
  Mail,
  MessageSquare,
  Users,
  Building,
  DollarSign,
  Smartphone,
} from 'lucide-react';
import type { DatasetNotification } from '@/lib/types';
import { NotificationCheckbox } from '@/components/notification-bulk-actions';
import { isNotSafe } from '@/components/notification-bulk-actions';

const sourceAppIcons: Record<string, React.ReactNode> = {
  Email: <Mail className="w-4 h-4" />,
  Slack: <MessageSquare className="w-4 h-4" />,
  'Microsoft Teams': <Users className="w-4 h-4" />,
  'HR Portal': <Building className="w-4 h-4" />,
  'Finance System': <DollarSign className="w-4 h-4" />,
  'Internal Mobile App': <Smartphone className="w-4 h-4" />,
};

const sourceAppColors: Record<string, string> = {
  Email: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Slack: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'Microsoft Teams': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'HR Portal': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Finance System': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Internal Mobile App': 'bg-pink-500/15 text-pink-400 border-pink-500/30',
};

function formatRiskPercent(score: number) {
  return Math.round(score > 1 ? score : score * 100);
}

function getRiskBand(score: number) {
  const normalized = score > 1 ? score / 100 : score;
  if (normalized >= 0.7) return { label: 'High Risk', className: 'border-red-500 text-red-400' };
  if (normalized >= 0.4) return { label: 'Suspicious', className: 'border-amber-500 text-amber-400' };
  return { label: 'Safe', className: 'border-green-500 text-green-400' };
}

interface NotificationCardProps {
  notification: DatasetNotification;
  bulkMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectedExplanation: {
    [key: string]: any;
  };
  fetchExplanation: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function NotificationCard({
  notification,
  bulkMode,
  selectedIds,
  toggleSelect,
  selectedExplanation,
  fetchExplanation,
  refresh,
}: NotificationCardProps) {
  const notSafe = isNotSafe(notification);

  const riskColor =
    notification?.threat_category === "high_risk_suspicious" ||
    notification?.threat_category === "ransomware" ||
    notification?.threat_category === "phishing" ||
    notification?.threat_category === "critical"
      ? "text-red-400"
      : notification?.threat_category === "suspicious" ||
        notification?.threat_category === "bec"
      ? "text-amber-400"
      : "text-green-400";

  return (
    <Card
      className={`overflow-hidden border-l-4 ${
        notSafe ? "border-l-red-500" : "border-l-green-500"
      }`}
    >
      <CardContent className="pt-5">
        <div className="flex gap-3">
          {bulkMode && (
            <NotificationCheckbox
              notification={notification}
              isSelected={
                selectedIds?.has(notification?.notification_id) ?? false
              }
              onToggle={toggleSelect}
            />
          )}

          <div className="flex-1 min-w-0">
            {/* TOP */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {notSafe ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}

              <span className="font-mono text-xs text-muted-foreground">
                {notification?.notification_id ?? "N/A"}
              </span>

              <Badge
                className={
                  sourceAppColors[notification?.channel ?? ""] ??
                  "bg-gray-500/15"
                }
              >
                <span className="mr-1">
                  {sourceAppIcons[notification?.channel ?? ""] || (
                    <Shield className="w-4 h-4" />
                  )}
                </span>
                {notification?.channel ?? "Unknown Channel"}
              </Badge>

              <Badge className={riskColor}>
                {getRiskBand(
                  Number(
                    notification?.ai_analysis?.risk_score ??
                      notification?.risk_score ??
                      0
                  )
                ).label}
                {" ("}
                {formatRiskPercent(
                  Number(
                    notification?.ai_analysis?.risk_score ??
                      notification?.risk_score ??
                      0
                  )
                )}
                %)
              </Badge>

              <Badge variant="outline">
                {notification?.department ?? "Unknown Department"}
              </Badge>
            </div>

            {/* META */}
            <div className="grid md:grid-cols-3 gap-2 text-sm mb-3">
              <div>
                <span className="text-muted-foreground">From:</span>{" "}
                {notification?.sender ?? "Unknown Sender"}
              </div>

              <div>
                <span className="text-muted-foreground">To:</span>{" "}
                {notification?.receiver ?? "Unknown Receiver"}
              </div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                {notification?.timestamp ?? "Unknown Time"}
              </div>
            </div>

            {/* CONTENT */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              {notification?.content ?? "No content available."}
            </div>

            {/* EXPLANATION */}
            {notSafe && (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-0 text-cyan-400 hover:text-cyan-300"
                  onClick={() =>
                    fetchExplanation?.(
                      notification?.notification_id ?? ""
                    )
                  }
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Why was this flagged?
                </Button>

                {notification?.notification_id &&
                  selectedExplanation?.[
                    notification.notification_id
                  ] && (
                    <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm">
                      <span className="font-semibold text-cyan-400">
                        AI Analysis:
                      </span>{" "}
                      {selectedExplanation[
                        notification.notification_id
                      ]?.summary ??
                        selectedExplanation[
                          notification.notification_id
                        ]?.explanation?.explanation_text ??
                        "Model explanation unavailable."}
                    </div>
                  )}
              </div>
            )}

            {/* ACTIONS */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await api.delete(
                    `/api/notifications/${notification.notification_id}`
                  );
                  await refresh();
                }}
              >
                Delete
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await api.post(
                    "/api/fraud-analyst/request-review",
                    {
                      notificationId:
                        notification.notification_id,
                      feedback:
                        "Reported by employee for analyst review",
                    }
                  );
                  await refresh();
                }}
              >
                Report
              </Button>

              <Button
                size="sm"
                onClick={async () => {
                  await api.post(
                    "/api/fraud-analyst/request-review",
                    {
                      notificationId:
                        notification.notification_id,
                      feedback:
                        "Employee requested manual review",
                    }
                  );
                  await refresh();
                }}
              >
                Request Review
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
