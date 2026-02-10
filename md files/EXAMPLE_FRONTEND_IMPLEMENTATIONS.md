/**
 * EXAMPLE FRONTEND COMPONENTS WITH PERMISSION GUARD
 * Shows how to use PermissionGuard in React components
 */

// ============================================
// EXAMPLE 1: Simple feature hiding
// ============================================
// File: src/components/features/ScannerButton.tsx

'use client';

import { PermissionGuardNull } from '@/components/PermissionGuard';

export function ScannerButton() {
  return (
    <PermissionGuardNull permission="access_scanners">
      <button className="btn btn-primary">
        🔗 Scan Link
      </button>
    </PermissionGuardNull>
  );
}

// ============================================
// EXAMPLE 2: With fallback message
// ============================================
// File: src/components/features/ExportButton.tsx

import { PermissionGuardWarning } from '@/components/PermissionGuard';

export function ExportButton() {
  return (
    <PermissionGuardWarning 
      permission="export_reports"
      className="w-full"
    >
      <button className="btn btn-secondary w-full">
        📄 Export Report
      </button>
    </PermissionGuardWarning>
  );
}

// ============================================
// EXAMPLE 3: Multiple tabs with different permissions
// ============================================
// File: src/components/dashboards/DashboardTabs.tsx

import { PermissionGuardNull } from '@/components/PermissionGuard';

export function DashboardTabs() {
  return (
    <div className="tabs">
      <PermissionGuardNull permission="view_all_notifications">
        <div className="tab">
          <input 
            type="radio" 
            name="dashboard-tabs" 
            className="tab-toggle"
          />
          <label className="tab-label">📋 All Notifications</label>
          <div className="tab-content">
            {/* All notifications content */}
          </div>
        </div>
      </PermissionGuardNull>

      <PermissionGuardNull permission="view_fraud_feed">
        <div className="tab">
          <input 
            type="radio" 
            name="dashboard-tabs" 
            className="tab-toggle"
          />
          <label className="tab-label">🔍 Fraud Feed</label>
          <div className="tab-content">
            {/* Fraud feed content */}
          </div>
        </div>
      </PermissionGuardNull>

      <PermissionGuardNull permission="view_analytics">
        <div className="tab">
          <input 
            type="radio" 
            name="dashboard-tabs" 
            className="tab-toggle"
          />
          <label className="tab-label">📊 Analytics</label>
          <div className="tab-content">
            {/* Analytics content */}
          </div>
        </div>
      </PermissionGuardNull>

      <PermissionGuardNull permission="view_audit_logs">
        <div className="tab">
          <input 
            type="radio" 
            name="dashboard-tabs" 
            className="tab-toggle"
          />
          <label className="tab-label">🔐 Audit Logs</label>
          <div className="tab-content">
            {/* Audit logs content */}
          </div>
        </div>
      </PermissionGuardNull>
    </div>
  );
}

// ============================================
// EXAMPLE 4: Conditional feature section
// ============================================
// File: src/components/features/AdminPanel.tsx

import { PermissionGuardError } from '@/components/PermissionGuard';

export function AdminPanel() {
  return (
    <PermissionGuardError 
      permission="manage_roles_permissions"
      className="p-4"
    >
      <div className="space-y-4">
        <h2>👥 Role Management</h2>
        <div>
          {/* Role management UI */}
          <button className="btn btn-primary">Create Role</button>
        </div>
      </div>
    </PermissionGuardError>
  );
}

// ============================================
// EXAMPLE 5: Using HOC to wrap component
// ============================================
// File: src/components/features/ProtectedAnalytics.tsx

import { withPermissionGuard } from '@/components/PermissionGuard';

function AnalyticsPanel() {
  return (
    <div>
      <h2>📊 Fraud Trends</h2>
      {/* Analytics visualization */}
    </div>
  );
}

export const Analytics = withPermissionGuard(
  AnalyticsPanel,
  'view_analytics',
  {
    fallback: <p className="text-gray-500">Analytics not available for your role</p>,
  }
);

// ============================================
// EXAMPLE 6: Multiple permissions (OR logic)
// ============================================
// File: src/components/features/ReportGenerator.tsx

import { PermissionGuardWarning } from '@/components/PermissionGuard';

export function ReportGenerator() {
  return (
    <PermissionGuardWarning
      permission={['export_reports', 'view_analytics']}
      requireAll={false} // OR logic - need at least one
    >
      <div className="space-y-3">
        <h3>📈 Generate Report</h3>
        <button className="btn btn-secondary">
          Create Report
        </button>
      </div>
    </PermissionGuardWarning>
  );
}

// ============================================
// EXAMPLE 7: Navigation with permission checks
// ============================================
// File: src/components/layout/Sidebar.tsx

'use client';

import { PermissionGuardNull } from '@/components/PermissionGuard';
import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="space-y-2">
        <Link href="/dashboard" className="nav-item">
          📊 Dashboard
        </Link>

        <PermissionGuardNull permission="view_fraud_feed">
          <Link href="/fraud-feed" className="nav-item">
            🔍 Fraud Feed
          </Link>
        </PermissionGuardNull>

        <PermissionGuardNull permission="access_scanners">
          <Link href="/scanners" className="nav-item">
            🔗 Scanners
          </Link>
        </PermissionGuardNull>

        <PermissionGuardNull permission="view_analytics">
          <Link href="/analytics" className="nav-item">
            📈 Analytics
          </Link>
        </PermissionGuardNull>

        <PermissionGuardNull permission="view_audit_logs">
          <Link href="/audit-logs" className="nav-item">
            🔐 Audit Logs
          </Link>
        </PermissionGuardNull>

        <PermissionGuardNull permission="manage_roles_permissions">
          <Link href="/admin/roles" className="nav-item">
            ⚙️ Role Management
          </Link>
        </PermissionGuardNull>
      </nav>
    </aside>
  );
}

// ============================================
// EXAMPLE 8: Contextual buttons
// ============================================
// File: src/components/features/AlertActions.tsx

import { PermissionGuardNull } from '@/components/PermissionGuard';

interface AlertActionsProps {
  alertId: string;
}

export function AlertActions({ alertId }: AlertActionsProps) {
  return (
    <div className="flex gap-2">
      <PermissionGuardNull permission="acknowledge_alerts">
        <button 
          className="btn btn-sm btn-outline"
          onClick={() => {/* acknowledge alert */}}
        >
          ✓ Acknowledge
        </button>
      </PermissionGuardNull>

      <PermissionGuardNull permission="access_scanners">
        <button 
          className="btn btn-sm btn-outline"
          onClick={() => {/* scan linked URL */}}
        >
          🔗 Scan Link
        </button>
      </PermissionGuardNull>

      <PermissionGuardNull permission="view_audit_logs">
        <button 
          className="btn btn-sm btn-outline"
          onClick={() => {/* view alert history */}}
        >
          📜 History
        </button>
      </PermissionGuardNull>
    </div>
  );
}

// ============================================
// EXAMPLE 9: Custom hook + PermissionGuard combo
// ============================================
// File: src/hooks/useFeatureAccess.ts

import { usePermissions } from '@/hooks/usePermissions';

export function useFeatureAccess() {
  const perms = usePermissions();

  return {
    canScan: perms.hasPermission('access_scanners'),
    canAnalyze: perms.hasPermission('view_analytics'),
    canExport: perms.hasPermission('export_reports'),
    canAcknowledge: perms.hasPermission('acknowledge_alerts'),
    canManageRoles: perms.hasPermission('manage_roles_permissions'),
    canViewAudit: perms.hasPermission('view_audit_logs'),
  };
}

// Usage in component:
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export function FeaturePanel() {
  const { canScan, canAnalyze, canExport } = useFeatureAccess();

  return (
    <div className="grid grid-cols-3 gap-4">
      {canScan && <ScannerCard />}
      {canAnalyze && <AnalyticsCard />}
      {canExport && <ExportCard />}
    </div>
  );
}

// ============================================
// EXAMPLE 10: Error boundary with permissions
// ============================================
// File: src/components/features/ProtectedSection.tsx

import { PermissionGuardError } from '@/components/PermissionGuard';
import { ReactNode } from 'react';

interface ProtectedSectionProps {
  permission: string;
  title: string;
  children: ReactNode;
}

export function ProtectedSection({
  permission,
  title,
  children,
}: ProtectedSectionProps) {
  return (
    <section className="mb-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <PermissionGuardError permission={permission as any}>
        {children}
      </PermissionGuardError>
    </section>
  );
}

// Usage:
export function Dashboard() {
  return (
    <div>
      <ProtectedSection 
        permission="access_scanners"
        title="URL Scanner"
      >
        <ScannerTools />
      </ProtectedSection>

      <ProtectedSection 
        permission="manage_roles_permissions"
        title="Administration"
      >
        <AdminControls />
      </ProtectedSection>
    </div>
  );
}
