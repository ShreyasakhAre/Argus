import { DashboardLayout } from '@/components/common/dashboard-layout';
import { AuditorDashboard } from '@/components/dashboards/auditor-dashboard';

export default function AuditorPage() {
  return (
    <DashboardLayout>
      <AuditorDashboard />
    </DashboardLayout>
  );
}
