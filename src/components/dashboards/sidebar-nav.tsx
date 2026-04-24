'use client';

import { useState, useEffect } from 'react';
import { Activity, Target, Zap, QrCode, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProfileSection } from '@/components/common/profile-section';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <Activity className="w-5 h-5" /> },
  { id: 'threats', label: 'Threats', icon: <Target className="w-5 h-5" /> },
  { id: 'analytics', label: 'Analytics', icon: <Zap className="w-5 h-5" /> },
  { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" /> },
  { id: 'permissions', label: 'Roles & Permissions', icon: <Shield className="w-5 h-5" /> },
];

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('argus-admin-sidebar-collapsed');
      if (stored !== null) setCollapsed(stored === 'true');
    } catch {
      // ignore
    }
  }, []);

  const handleCollapse = (v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem('argus-admin-sidebar-collapsed', String(v));
    } catch {
      // ignore
    }
  };

  return (
    <aside
      className={`
        flex-shrink-0 flex flex-col sticky top-0 h-screen
        bg-card border-r border-border
        transition-all duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Header + collapse toggle */}
      <div className={`flex items-center border-b border-border h-14 flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40 flex-shrink-0">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">ARGUS</p>
              <p className="text-xs text-muted-foreground truncate">Security Ops</p>
            </div>
          </div>
        )}
        <button
          onClick={() => handleCollapse(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors duration-200 text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className={`flex-1 overflow-y-auto py-3 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              title={collapsed ? tab.label : undefined}
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
                {tab.icon}
              </span>

              {!collapsed && (
                <span className="truncate flex-1 text-left">{tab.label}</span>
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
                  {tab.label}
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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </aside>
  );
}
