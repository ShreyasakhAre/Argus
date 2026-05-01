'use client';

import { DashboardLayout } from '@/components/common/dashboard-layout';
import { AdminDashboard } from '@/components/dashboards/admin-dashboard';

export default function Page() {
  return (
    <DashboardLayout title="Admin Dashboard" subtitle="System overview and management">
      <AdminDashboard />
    </DashboardLayout>
  );
}
