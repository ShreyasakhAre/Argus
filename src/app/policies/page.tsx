'use client';

import { DashboardLayout } from '@/components/common/dashboard-layout';
import { PolicyPanel } from '@/components/dashboards/policy-panel';

export default function PoliciesPage() {
  return (
    <DashboardLayout>
      <PolicyPanel />
    </DashboardLayout>
  );
}
