'use client';

import { DashboardLayout } from '@/components/common/dashboard-layout';
import { ThreatsPanel } from '@/components/dashboards/threats-panel';

export default function ThreatsPage() {
  return (
    <DashboardLayout>
      <ThreatsPanel />
    </DashboardLayout>
  );
}
