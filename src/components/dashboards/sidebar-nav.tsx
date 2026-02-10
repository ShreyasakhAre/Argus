'use client';

import { ReactNode } from 'react';
import {
  Activity, Target, Zap, QrCode, Shield
} from 'lucide-react';

interface NavTab {
  id: string;
  label: string;
  icon: ReactNode;
}

interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs: NavTab[] = [
  { id: 'overview', label: 'Overview', icon: <Activity className="w-5 h-5" /> },
  { id: 'threats', label: 'Threats', icon: <Target className="w-5 h-5" /> },
  { id: 'analytics', label: 'Analytics', icon: <Zap className="w-5 h-5" /> },
  { id: 'scanners', label: 'Scanners', icon: <QrCode className="w-5 h-5" /> },
  { id: 'permissions', label: 'Roles & Permissions', icon: <Shield className="w-5 h-5" /> },
];

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  return (
    <aside className="w-56 bg-slate-950/80 border-r border-slate-800/50 backdrop-blur-sm h-screen sticky top-0 flex flex-col overflow-y-auto scrollbar-hide">
      {/* Logo / Branding */}
      <div className="p-6 border-b border-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">ARGUS</h2>
            <p className="text-xs text-slate-400">Security Ops</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium
              transition-all duration-200 group
              ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }
            `}
            title={tab.label}
          >
            <span className={`transition-colors ${activeTab === tab.id ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
              {tab.icon}
            </span>
            <span className="text-sm">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="ml-auto w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/30 bg-slate-900/30">
        <p className="text-xs text-slate-500 text-center">v1.0.0</p>
      </div>
    </aside>
  );
}
