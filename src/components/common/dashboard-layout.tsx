'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useTheme } from '@/components/theme-provider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, Activity, RefreshCw, LogOut, Sun, Moon } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import NotificationBell from "@/components/ui/NotificationBell";
import { GlobalNotificationToast } from '@/components/common/global-notification-toast';
import { RoleSelector } from '@/components/role-selector';
import { SocketStatus } from '@/components/ui/socket-status';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  activeNavTab?: string;
  onNavTabChange?: (tab: string) => void;
}

const DEFAULT_ROLE_CONFIG = {
  label: 'User',
  icon: <Shield className="w-4 h-4" />,
  color: 'text-gray-500',
  bgColor: 'bg-gray-100 border-gray-300',
  textColor: 'text-gray-500',
  badgeColor: 'bg-gray-100 border-gray-300'
};

const roleConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  admin: { label: 'Admin', icon: <Shield className="w-4 h-4" />, color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/30' },
  fraud_analyst: { label: 'Fraud Analyst', icon: <Eye className="w-4 h-4" />, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  department_head: { label: 'Department Head', icon: <Shield className="w-4 h-4" />, color: 'text-green-500', bgColor: 'bg-green-500/10 border-green-500/30' },
  employee: { label: 'Employee', icon: <Shield className="w-4 h-4" />, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  auditor: { label: 'Auditor', icon: <Shield className="w-4 h-4" />, color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/30' },
};

export function DashboardLayout({ 
  children, 
  title, 
  subtitle,
  activeNavTab = 'overview',
  onNavTabChange
}: DashboardLayoutProps) {
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

  const currentRoleConfig = roleConfig?.[user.role] ?? roleConfig.employee;
  
  // Debug: Log the actual user role and config
  console.log('DashboardLayout - User role:', user?.role);
  console.log('DashboardLayout - Role config:', currentRoleConfig);
  
  // Add console warning if role not found
  if (!roleConfig?.[user.role] && user.role) {
    console.warn(`Role '${user.role}' not found in roleConfig, using default`);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                <p className="text-xs text-muted-foreground">Fraud Detection System</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span>System Online</span>
                </div>
                <div className="border-l border-border h-4 mx-1" />
                <SocketStatus />
                <div className="border-l border-border h-4 mx-1" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>ML Model Active</span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-border pl-4">
                <RoleSelector />
                <span className="text-sm text-muted-foreground hidden sm:inline ml-2">{user.orgId}</span>
              </div>

              <NotificationBell />

              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="border-border"
              >
                {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button variant="outline" size="icon" onClick={handleLogout} className="border-border">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Only render if user is not admin (admin uses its own sidebar) */}
        {user?.role !== 'admin' && <Sidebar />}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {title && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Global Notification Toast */}
      <GlobalNotificationToast />
    </div>
  );
}
