'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useTheme } from '@/components/theme-provider';
import { useSidebar, SidebarProvider } from '@/lib/sidebar-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, Activity, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import NotificationBell from "@/components/ui/NotificationBell";
import { GlobalNotificationToast } from '@/components/common/global-notification-toast';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  activeNavTab?: string;
  onNavTabChange?: (tab: string) => void;
}

const roleConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  admin: { label: 'Admin', icon: <Shield className="w-4 h-4" />, color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/30' },
  fraud_analyst: { label: 'Fraud Analyst', icon: <Eye className="w-4 h-4" />, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  department_head: { label: 'Department Head', icon: <Shield className="w-4 h-4" />, color: 'text-green-500', bgColor: 'bg-green-500/10 border-green-500/30' },
  employee: { label: 'Employee', icon: <Shield className="w-4 h-4" />, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  auditor: { label: 'Auditor', icon: <Shield className="w-4 h-4" />, color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/30' },
};

function DashboardLayoutInner({ children, title, subtitle }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { setMobileOpen } = useSidebar();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  if (!user) return null;

  const currentRoleConfig = roleConfig[user.role] ?? {
    label: 'User', icon: <Shield className="w-4 h-4" />, color: 'text-gray-500', bgColor: 'bg-gray-500/10 border-gray-500/30'
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile hamburger - only for non-admin */}
              {user.role !== 'admin' && (
                <button
                  onClick={() => setMobileOpen(true)}
                  className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

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

            <div className="flex items-center gap-3 sm:gap-4">
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

              <div className="flex items-center gap-2 border-l border-border pl-3 sm:pl-4">
                <Badge className={`${currentRoleConfig.bgColor} ${currentRoleConfig.color} flex items-center gap-1.5 px-2 sm:px-3 py-1`}>
                  {currentRoleConfig.icon}
                  <span className="hidden sm:inline">{currentRoleConfig.label}</span>
                </Badge>
                <span className="text-sm text-muted-foreground hidden lg:inline">{user.orgId}</span>
              </div>

              <NotificationBell />

              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="border-border"
                title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button variant="outline" size="icon" onClick={handleLogout} className="border-border" title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar for non-admin roles */}
        {user.role !== 'admin' && <Sidebar />}

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6">
          {title && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>

      <GlobalNotificationToast />
    </div>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardLayoutInner {...props} />
    </SidebarProvider>
  );
}
