import { DashboardLayout } from '@/components/common/dashboard-layout';
import { DepartmentHeadDashboard } from '@/components/dashboards/department-dashboard';

export default function DepartmentHeadPage() {
  return (
    <DashboardLayout>
      <DepartmentHeadDashboard />
    </DashboardLayout>
  );
}
