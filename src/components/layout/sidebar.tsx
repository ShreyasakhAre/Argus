'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Activity, Target, Zap, QrCode, Shield } from 'lucide-react';
import { ProfileSection } from '@/components/common/profile-section';

interface NavTab {
  id: string;
  label: string;
  icon: ReactNode;
}

export function Sidebar() {
  const { user } = useAuth();

  // Role-based navigation items
  const getNavTabs = (): NavTab[] => {
    if (!user?.role) return [];

    const role = user.role as string;
    
    switch (role) {
      case 'admin':
        return [
          { id: 'overview', label: 'Overview', icon: <Activity className="w-5 h-5" /> },
          { id: 'threats', label: 'Threat Intelligence', icon: <Target className="w-5 h-5" /> },
          { id: 'analytics', label: 'Analytics', icon: <Zap className="w-5 h-5" /> },
          { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" /> },
          { id: 'permissions', label: 'Roles & Permissions', icon: <Shield className="w-5 h-5" /> },
        ];
      case 'fraud_analyst':
      case 'analyst':
        return [
          { id: 'review', label: 'Review Queue', icon: <Activity className="w-5 h-5" /> },
          { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" /> },
        ];
      case 'department_head':
        return [
          { id: 'overview', label: 'Overview', icon: <Activity className="w-5 h-5" /> },
          { id: 'analytics', label: 'Analytics', icon: <Zap className="w-5 h-5" /> },
          { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" /> },
        ];
      case 'auditor':
        return [
          { id: 'overview', label: 'Overview', icon: <Activity className="w-5 h-5" /> },
          { id: 'compliance', label: 'Compliance', icon: <Shield className="w-5 h-5" /> },
          { id: 'analytics', label: 'Analytics', icon: <Zap className="w-5 h-5" /> },
        ];
      case 'employee':
        return [
          { id: 'notifications', label: 'Notifications', icon: <Activity className="w-5 h-5" /> },
          { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" /> },
        ];
      default:
        return [];
    }
  };

  const tabs = getNavTabs();

  return (
    <aside className="w-56 bg-slate-950/80 border-r border-slate-800/50 backdrop-blur-sm h-screen sticky top-0 flex flex-col overflow-y-auto scrollbar-hide">
      {/* Logo / Branding */}
      <div className="p-6 border-b border-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
            <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">ARGUS</h1>
            <p className="text-xs text-slate-400">Fraud Detection</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-all duration-200 hover:bg-slate-800/50 text-slate-300 hover:text-white group"
          >
            <span className="text-slate-400 group-hover:text-cyan-400 transition-colors">
              {tab.icon}
            </span>
            <span className="text-sm">{tab.label}</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-cyan-400 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/30 bg-slate-900/30">
        <ProfileSection />
      </div>
    </aside>
  );
}
