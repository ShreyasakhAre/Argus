import { DashboardLayout } from '@/components/common/dashboard-layout';
import { EmployeeDashboard } from '@/components/dashboards/employee-dashboard';

export default function EmployeePage() {
  return (
    <DashboardLayout>
      <EmployeeDashboard />
    </DashboardLayout>
  );
}
