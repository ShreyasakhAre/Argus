'use client';

import { DashboardLayout } from '@/components/common/dashboard-layout';
import { ModelManagementPanel } from '@/components/dashboards/model-management-panel';

export default function ModelManagementPage() {
  return (
    <DashboardLayout>
      <ModelManagementPanel />
    </DashboardLayout>
  );
}
