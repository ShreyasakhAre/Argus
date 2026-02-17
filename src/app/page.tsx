"use client";

import dynamic from "next/dynamic";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth, Role } from '@/components/auth-provider';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Shield, Eye, Activity, RefreshCw, LogOut, Sun, Moon, Search, Building2, User, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import NotificationBell from "@/components/ui/NotificationBell";
import { getDashboardByRole } from '@/lib/role-routing';
import { DashboardLayout } from '@/components/common/dashboard-layout';

const AdminDashboard = dynamic(
  () => import('@/components/dashboards/admin-dashboard').then((mod) => mod.AdminDashboard),
  { loading: () => <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div> }
);

const DepartmentHeadDashboard = dynamic(
  () => import('@/components/dashboards/department-dashboard').then((mod) => mod.DepartmentHeadDashboard),
  { loading: () => <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div> }
);

const EmployeeDashboard = dynamic(
  () => import('@/components/dashboards/employee-dashboard').then((mod) => mod.EmployeeDashboard),
  { loading: () => <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div> }
);

const AuditorDashboard = dynamic(
  () => import('@/components/dashboards/auditor-dashboard').then((mod) => mod.AuditorDashboard),
  { loading: () => <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div> }
);

const AnalystDashboard = dynamic(
  () => import('@/components/dashboards/analyst-dashboard').then((mod) => mod.AnalystDashboard),
  { loading: () => <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div> }
);

const DEFAULT_ROLE_CONFIG = {
  label: 'User',
  icon: <User className="w-4 h-4" />,
  color: 'text-gray-500',
  bgColor: 'bg-gray-100 border-gray-300',
  textColor: 'text-gray-500',
  badgeColor: 'bg-gray-100 border-gray-300'
};

const roleConfig: Record<Role, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  admin: { label: 'Admin', icon: <Shield className="w-4 h-4" />, color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/30' },
  fraud_analyst: { label: 'Fraud Analyst', icon: <Search className="w-4 h-4" />, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  department_head: { label: 'Department Head', icon: <Building2 className="w-4 h-4" />, color: 'text-green-500', bgColor: 'bg-green-500/10 border-green-500/30' },
  employee: { label: 'Employee', icon: <User className="w-4 h-4" />, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  auditor: { label: 'Auditor', icon: <FileText className="w-4 h-4" />, color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/30' },
};

function DashboardContent({ role }: { role: string | Role }) {
  const { user } = useAuth();
  
  // Normalize role before routing
  const normalizedRole = user?.role?.toLowerCase()?.trim();
  
  // Use centralized role routing
  return getDashboardByRole(normalizedRole || "employee");
}

function MainContent() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <DashboardLayout>
      <DashboardContent role={user.role} />
    </DashboardLayout>
  );
}

export default function Home() {
  return <MainContent />;
}
