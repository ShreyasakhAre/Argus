import React from 'react';
import { Shield } from 'lucide-react';
import { AdminDashboard } from "@/components/dashboards/admin-dashboard";
import { AnalystDashboard } from "@/components/dashboards/analyst-dashboard";
import { AuditorDashboard } from "@/components/dashboards/auditor-dashboard";
import { DepartmentHeadDashboard } from "@/components/dashboards/department-dashboard";
import { EmployeeDashboard } from "@/components/dashboards/employee-dashboard";

function UnauthorizedScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Unauthorized Access</h2>
        <p className="text-zinc-400">You do not have permission to access this dashboard.</p>
      </div>
    </div>
  );
}

export function getDashboardByRole(role: string) {
  switch (role) {
    case "admin":
      return <AdminDashboard />;
    case "analyst":
      return <AnalystDashboard />;
    case "fraud_analyst":
      return <AnalystDashboard />;
    case "auditor":
      return <AuditorDashboard />;
    case "department_head":
      return <DepartmentHeadDashboard />;
    case "employee":
      return <EmployeeDashboard />;
    default:
      return <div>Unauthorized Access</div>;
  }
}
