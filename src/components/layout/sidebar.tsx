'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Activity, Target, Zap, QrCode, Shield } from 'lucide-react';
import { ProfileSection } from '@/components/common/profile-section';
import { useRouter, usePathname } from 'next/navigation';

interface NavTab {
  id: string;
  label: string;
  icon: ReactNode;
  route: string;
}

export function Sidebar() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const getNavTabs = (): NavTab[] => {
    if (!user?.role) return [];
    const role = user.role as string;

    switch (role) {
      case 'admin':
        return [
          { id: 'admin', label: 'Overview', icon: <Activity className="w-5 h-5" />, route: '/admin' },
          { id: 'threats', label: 'Threat Intelligence', icon: <Target className="w-5 h-5" />, route: '/threats' },
          { id: 'analytics', label: 'Analytics', icon: <Zap className="w-5 h-5" />, route: '/admin' },
          { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" />, route: '/admin' },
          { id: 'permissions', label: 'Roles & Permissions', icon: <Shield className="w-5 h-5" />, route: '/admin' },
        ];
      case 'fraud_analyst':
      case 'analyst':
        return [
          { id: 'fraud-analyst', label: 'Review Queue', icon: <Activity className="w-5 h-5" />, route: '/fraud-analyst' },
          { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" />, route: '/fraud-analyst' },
        ];
      case 'department_head':
        return [
          { id: 'department-head', label: 'Overview', icon: <Activity className="w-5 h-5" />, route: '/department-head' },
          { id: 'analytics', label: 'Analytics', icon: <Zap className="w-5 h-5" />, route: '/department-head' },
          { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" />, route: '/department-head' },
        ];
      case 'auditor':
        return [
          { id: 'auditor', label: 'Overview', icon: <Activity className="w-5 h-5" />, route: '/auditor' },
          { id: 'compliance', label: 'Compliance', icon: <Shield className="w-5 h-5" />, route: '/auditor' },
          { id: 'analytics', label: 'Analytics', icon: <Zap className="w-5 h-5" />, route: '/auditor' },
        ];
      case 'employee':
        return [
          { id: 'employee', label: 'Notifications', icon: <Activity className="w-5 h-5" />, route: '/employee' },
          { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" />, route: '/employee' },
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

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.route;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.route)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg
                transition-all duration-200 group cursor-pointer
                ${isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'}
              `}
            >
              <span className={`transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {isActive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/30 bg-slate-900/30">
        <ProfileSection />
      </div>
    </aside>
  );
}
