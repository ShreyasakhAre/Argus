'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useSidebar } from '@/lib/sidebar-context';
import { ProfileSection } from '@/components/common/profile-section';
import {
  Activity, QrCode, Shield, Bell, MessageSquare,
  BarChart2, Map, Briefcase, FileText, ChevronLeft, ChevronRight, X
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case 'fraud_analyst':
    case 'analyst':
      return [
        { id: 'review', label: 'Review Queue', icon: <Activity className="w-5 h-5" /> },
        { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" /> },
        { id: 'cases', label: 'Cases', icon: <Briefcase className="w-5 h-5" /> },
      ];
    case 'department_head':
      return [
        { id: 'overview', label: 'Overview', icon: <Activity className="w-5 h-5" /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
        { id: 'heatmap', label: 'Heatmap', icon: <Map className="w-5 h-5" /> },
      ];
    case 'auditor':
      return [
        { id: 'notifications', label: 'Notifications', icon: <FileText className="w-5 h-5" /> },
        { id: 'feedback', label: 'Feedback', icon: <MessageSquare className="w-5 h-5" /> },
        { id: 'governance', label: 'Governance', icon: <Shield className="w-5 h-5" /> },
      ];
    case 'employee':
      return [
        { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
        { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" /> },
      ];
    default:
      return [];
  }
}

export function Sidebar() {
  const { user } = useAuth();
  const { activeTab, setActiveTab, collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  const items = user?.role ? getNavItems(user.role) : [];

  // Set default active tab when role loads
  useEffect(() => {
    if (items.length > 0 && !activeTab) {
      setActiveTab(items[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const NavContent = () => (
    <>
      {/* Header / branding + collapse toggle */}
      <div className={`flex items-center border-b border-border h-14 flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-full" />
              <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-1.5 rounded-lg">
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="text-sm font-bold text-foreground tracking-wide truncate">ARGUS</span>
          </div>
        )}
        <div className={`flex items-center gap-1 ${collapsed ? '' : 'flex-shrink-0'}`}>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors duration-200 text-muted-foreground hover:text-foreground"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-muted transition-colors duration-200 text-muted-foreground hover:text-foreground"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {/* Navigation items */}
      <nav className={`flex-1 overflow-y-auto py-3 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileOpen(false);
              }}
              title={collapsed ? item.label : undefined}
              className={`
                w-full flex items-center rounded-lg text-sm font-medium
                transition-all duration-200 ease-out group relative
                ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
                ${isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-sm'
                  : 'text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground hover:scale-[1.015] hover:border-border/50'
                }
              `}
            >
              <span className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {item.icon}
              </span>

              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
              )}

              {/* Tooltip on collapsed */}
              {collapsed && (
                <div className="
                  absolute left-full ml-3 px-2.5 py-1.5 rounded-md
                  bg-popover border border-border text-popover-foreground
                  text-xs font-medium whitespace-nowrap pointer-events-none
                  opacity-0 group-hover:opacity-100 transition-opacity duration-150
                  shadow-lg z-50
                ">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-border" />
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile footer */}
      {!collapsed ? (
        <div className="border-t border-border flex-shrink-0">
          <ProfileSection />
        </div>
      ) : (
        <div className="border-t border-border p-3 flex justify-center flex-shrink-0">
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            title={user?.name || 'Profile'}
          >
            <span className="text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`
          fixed inset-0 z-30 bg-black/60 backdrop-blur-sm
          transition-opacity duration-300 md:hidden
          ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* Mobile drawer */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col w-64
          bg-card border-r border-border
          transition-transform duration-300 ease-in-out
          md:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <NavContent />
      </aside>

      {/* Desktop sidebar (in flex flow) */}
      <aside
        className={`
          hidden md:flex flex-col flex-shrink-0
          sticky top-0 h-screen
          bg-card border-r border-border
          transition-all duration-300 ease-in-out overflow-hidden
          ${collapsed ? 'w-16' : 'w-60'}
        `}
      >
        <NavContent />
      </aside>
    </>
  );
}
