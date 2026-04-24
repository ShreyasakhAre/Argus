'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { NotificationCard } from './NotificationCard';
import { isNotSafe } from '@/components/notification-bulk-actions';

interface NotificationListProps {
  notifications: any[];
  bulkMode: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectedExplanation: {
    [key: string]: any;
  };
  fetchExplanation: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  safeCollapsed: boolean;
  setSafeCollapsed: (collapsed: boolean) => void;
}

function SectionTitle({
  title,
  danger,
  success,
}: {
  title: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <h3
      className={`text-lg font-semibold flex items-center gap-2 ${
        danger
          ? 'text-red-400'
          : success
          ? 'text-green-400'
          : ''
      }`}
    >
      {danger ? (
        <AlertTriangle className="w-5 h-5" />
      ) : success ? (
        <CheckCircle className="w-5 h-5" />
      ) : null}

      {title}
    </h3>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <div className="flex justify-center mb-3">
          {icon}
        </div>
        <p className="text-muted-foreground">
          {text}
        </p>
      </CardContent>
    </Card>
  );
}

export function NotificationList({
  notifications,
  bulkMode,
  selectedIds,
  toggleSelect,
  selectedExplanation,
  fetchExplanation,
  refresh,
  safeCollapsed,
  setSafeCollapsed,
}: NotificationListProps) {
  const filteredNotifications = notifications; // Already filtered in parent
  const unsafeNotifications = filteredNotifications.filter(isNotSafe);
  const safeNotifications = filteredNotifications.filter((n) => !isNotSafe(n));

  return (
    <>
      {/* UNSAFE */}
      <SectionTitle
        title={`Not Safe Notifications (${unsafeNotifications?.length ?? 0})`}
        danger
      />

      {(unsafeNotifications?.length ?? 0) === 0 ? (
        <EmptyState
          icon={
            <CheckCircle className="w-10 h-10 text-green-500" />
          }
          text="No unsafe notifications found."
        />
      ) : (
        <div className="space-y-3">
          {unsafeNotifications.map(
            (notification) => (
              <NotificationCard
                key={
                  notification?.notification_id ?? Math.random().toString()
                }
                notification={notification}
                bulkMode={bulkMode}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
                selectedExplanation={selectedExplanation}
                fetchExplanation={fetchExplanation}
                refresh={refresh}
              />
            )
          )}
        </div>
      )}

      {/* SAFE */}
      <button
        onClick={() => setSafeCollapsed(!safeCollapsed)}
        className="w-full flex items-center justify-between"
      >
        <SectionTitle
          title={`Safe Notifications (${safeNotifications?.length ?? 0})`}
          success
        />

        {safeCollapsed ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {!safeCollapsed && (
        <div className="space-y-3">
          {(safeNotifications ?? []).map(
            (notification) => (
              <NotificationCard
                key={
                  notification?.notification_id ?? Math.random().toString()
                }
                notification={notification}
                bulkMode={false}
                selectedIds={new Set()}
                toggleSelect={() => {}}
                selectedExplanation={selectedExplanation}
                fetchExplanation={fetchExplanation}
                refresh={refresh}
              />
            )
          )}
        </div>
      )}
    </>
  );
}
