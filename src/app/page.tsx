"use client";

import dynamic from "next/dynamic";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth, Role } from '@/components/auth-provider';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { AdminDashboard } from '@/components/dashboards/admin-dashboard';
import { DepartmentHeadDashboard } from '@/components/dashboards/department-dashboard';
import { EmployeeDashboard } from '@/components/dashboards/employee-dashboard';
import { AuditorDashboard } from '@/components/dashboards/auditor-dashboard';
import { Shield, Eye, Activity, RefreshCw, LogOut, Sun, Moon, Search, Building2, User, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import NotificationBell from "@/components/ui/NotificationBell";

const AnalystDashboard = dynamic(
  () => import('@/components/dashboards/analyst-dashboard').then((mod) => mod.AnalystDashboard),
  { loading: () => <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div> }
);

const roleConfig: Record<Role, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  admin: { label: 'Admin', icon: <Shield className="w-4 h-4" />, color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/30' },
  analyst: { label: 'Fraud Analyst', icon: <Search className="w-4 h-4" />, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  department_head: { label: 'Department Head', icon: <Building2 className="w-4 h-4" />, color: 'text-green-500', bgColor: 'bg-green-500/10 border-green-500/30' },
  employee: { label: 'Employee', icon: <User className="w-4 h-4" />, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  auditor: { label: 'Auditor', icon: <FileText className="w-4 h-4" />, color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/30' },
};

function DashboardContent({ role }: { role: Role }) {
  const dashboards = {
    admin: <AdminDashboard />,
    analyst: <AnalystDashboard />,
    department_head: <DepartmentHeadDashboard />,
    employee: <EmployeeDashboard />,
    auditor: <AuditorDashboard />,
  };

  return dashboards[role];
}

function Header() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  if (!user) return null;

  const config = roleConfig[user.role];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
              <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl">
                <Eye className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">ARGUS</h1>
              <p className="text-xs text-muted-foreground font-medium">Centralized Notification Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="w-4 h-4 text-green-500" />
                <span>System Online</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                <span>ML Model Active</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-border pl-4">
              <Badge className={`${config.bgColor} ${config.color} flex items-center gap-1.5 px-3 py-1`}>
                {config.icon}
                <span>{config.label}</span>
              </Badge>
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.orgId}</span>
            </div>

            <NotificationBell />

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
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
    <div className="min-h-screen bg-background grid-pattern">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <DashboardContent role={user.role} />
      </main>
    </div>
  );
}

export default function Home() {
  return <MainContent />;
}
