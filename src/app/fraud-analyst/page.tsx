import { DashboardLayout } from '@/components/common/dashboard-layout';
import { FraudAnalystDashboard } from '@/components/dashboards/fraud-analyst-dashboard';

export default function FraudAnalystPage() {
  return (
    <DashboardLayout>
      <FraudAnalystDashboard />
    </DashboardLayout>
  );
}
