'use client';

import { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ShieldBan,
  VolumeX,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { DatasetNotification } from '@/lib/types';
import type { Role } from '@/lib/types';

// ============================================
// "Not Safe" definition (UI-only)
// ============================================
export function isNotSafe(n: DatasetNotification): boolean {
  if (n.is_malicious === 1) return true;
  if (n.threat_category === 'suspicious' || n.threat_category === 'high_risk_suspicious') return true;
  return false;
}

// ============================================
// Role-based action config
// ============================================
export type BulkActionType = 'block_sender' | 'mute_domain' | 'escalate' | 'report';

interface BulkActionDef {
  key: BulkActionType;
  label: string;
  icon: React.ReactNode;
  className: string;
}

const ALL_BULK_ACTIONS: BulkActionDef[] = [
  { key: 'block_sender', label: 'Block Sender', icon: <ShieldBan className="w-3.5 h-3.5" />, className: 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30' },
  { key: 'mute_domain', label: 'Mute Domain', icon: <VolumeX className="w-3.5 h-3.5" />, className: 'bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/30' },
  { key: 'escalate', label: 'Escalate', icon: <ArrowUpRight className="w-3.5 h-3.5" />, className: 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30' },
  { key: 'report', label: 'Report', icon: <AlertTriangle className="w-3.5 h-3.5" />, className: 'bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-500/30' },
];

const ROLE_ACTIONS: Record<Role, BulkActionType[]> = {
  admin: ['block_sender', 'mute_domain', 'escalate'],
  fraud_analyst: ['block_sender', 'mute_domain', 'escalate'],
  department_head: ['block_sender', 'escalate'],
  employee: ['report'],
  auditor: [], // view only
};

// ============================================
// Hook: useNotificationBulkSelect
// ============================================
export function useNotificationBulkSelect(notifications: DatasetNotification[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  const notSafeItems = useMemo(
    () => notifications.filter(isNotSafe),
    [notifications]
  );

  const notSafeCount = notSafeItems.length;

  const allNotSafeSelected = useMemo(
    () => notSafeCount > 0 && notSafeItems.every((n) => selectedIds.has(n.notification_id)),
    [notSafeItems, notSafeCount, selectedIds]
  );

  const someSelected = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllNotSafe = useCallback(() => {
    setSelectedIds(new Set(notSafeItems.map((n) => n.notification_id)));
  }, [notSafeItems]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkAction = useCallback((action: string) => {
    const count = selectedIds.size;
    setFeedback(`${action}: ${count} notification${count !== 1 ? 's' : ''} processed`);
    setSelectedIds(new Set());
    setTimeout(() => setFeedback(null), 3000);
  }, [selectedIds]);

  return {
    selectedIds,
    notSafeCount,
    allNotSafeSelected,
    someSelected,
    toggleSelect,
    selectAllNotSafe,
    deselectAll,
    handleBulkAction,
    feedback,
  };
}

// ============================================
// Component: SelectAllNotSafeBar
// ============================================
interface SelectAllNotSafeBarProps {
  allNotSafeSelected: boolean;
  notSafeCount: number;
  onToggle: () => void;
}

export function SelectAllNotSafeBar({ allNotSafeSelected, notSafeCount, onToggle }: SelectAllNotSafeBarProps) {
  if (notSafeCount === 0) return null;

  return (
    <div className="flex flex-col gap-1 px-4 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-lg">
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <Checkbox
          checked={allNotSafeSelected}
          onCheckedChange={onToggle}
        />
        <span className="text-sm font-medium text-slate-200">
          Select all not-safe notifications
        </span>
        <Badge variant="outline" className="text-xs text-red-400 border-red-500/40">
          {notSafeCount}
        </Badge>
      </label>
      <p className="text-xs text-slate-500 pl-7 flex items-center gap-1">
        <Info className="w-3 h-3" />
        Bulk actions are restricted to risky notifications only
      </p>
    </div>
  );
}

// ============================================
// Component: BulkActionBar
// ============================================
interface BulkActionBarProps {
  selectedCount: number;
  role: Role;
  onAction: (action: string) => void;
  onClear: () => void;
}

export function BulkActionBar({ selectedCount, role, onAction, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const allowedKeys = ROLE_ACTIONS[role] || [];
  const actions = ALL_BULK_ACTIONS.filter((a) => allowedKeys.includes(a.key));

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-950/30 border border-red-500/20 rounded-lg flex-wrap">
      <span className="text-sm text-slate-300 font-medium mr-1">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => onAction(action.label)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${action.className}`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
      <button
        onClick={onClear}
        className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}

// ============================================
// Component: BulkFeedbackToast
// ============================================
interface BulkFeedbackToastProps {
  message: string | null;
}

export function BulkFeedbackToast({ message }: BulkFeedbackToastProps) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-green-950/40 border border-green-800/30 rounded-lg text-xs text-green-400">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {message}
    </div>
  );
}

// ============================================
// Component: NotificationCheckbox (for each row/card)
// ============================================
interface NotificationCheckboxProps {
  notification: DatasetNotification;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export function NotificationCheckbox({ notification, isSelected, onToggle }: NotificationCheckboxProps) {
  const notSafe = isNotSafe(notification);

  return (
    <div className="flex-shrink-0">
      <Checkbox
        checked={notSafe ? isSelected : false}
        onCheckedChange={() => notSafe && onToggle(notification.notification_id)}
        disabled={!notSafe}
        className={!notSafe ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      />
    </div>
  );
}
