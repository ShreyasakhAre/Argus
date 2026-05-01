'use client';

import { useRole, Role } from './role-provider';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, Building2, User, FileText } from 'lucide-react';

const roleConfig: Record<Role, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: 'Admin', icon: <Shield className="w-4 h-4" />, color: 'text-red-500' },
  fraud_analyst: { label: 'Fraud Analyst', icon: <Search className="w-4 h-4" />, color: 'text-blue-500' },
  department_head: { label: 'Department Head', icon: <Building2 className="w-4 h-4" />, color: 'text-green-500' },
  employee: { label: 'Employee', icon: <User className="w-4 h-4" />, color: 'text-yellow-500' },
  auditor: { label: 'Auditor', icon: <FileText className="w-4 h-4" />, color: 'text-purple-500' },
};

export function RoleSelector() {
  const router = useRouter();
  const { role, setRole, orgId, setOrgId } = useRole();

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Role:</span>
        <Select value={role} onValueChange={(value) => {
          setRole(value as Role);
          const routes: Record<Role, string> = {
            admin: '/admin',
            fraud_analyst: '/fraud-analyst',
            department_head: '/department-head',
            employee: '/employee',
            auditor: '/auditor',
          };
          router.push(routes[value as Role]);
        }}>
          <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {Object.entries(roleConfig).map(([key, config]) => (
              <SelectItem key={key} value={key} className="hover:bg-zinc-800">
                <div className="flex items-center gap-2">
                  <span className={config.color}>{config.icon}</span>
                  <span>{config.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Org:</span>
        <Select value={orgId} onValueChange={setOrgId}>
          <SelectTrigger className="w-[120px] bg-zinc-900 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="ORG001" className="hover:bg-zinc-800">ORG001</SelectItem>
            <SelectItem value="ORG002" className="hover:bg-zinc-800">ORG002</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
