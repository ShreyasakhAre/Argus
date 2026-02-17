'use client';

import { useState } from 'react';
import { useRole } from '@/components/role-provider';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  User, 
  Mail, 
  Building, 
  Shield, 
  Clock, 
  Activity,
  TrendingUp,
  AlertTriangle,
  FileText,
  Users,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import type { Role } from '@/lib/types';
import type { Notification } from '@/lib/ml-service';
import type { Feedback } from '@/lib/ml-service';
import { calculateSecurityScore, formatSecurityScore } from '@/lib/security-score';
import { ChangePasswordModal } from '@/components/change-password-modal';

interface ProfileSectionProps {
  className?: string;
}

export function ProfileSection({ className }: ProfileSectionProps) {
  const { role, orgId } = useRole();
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Mock data for security score calculation
  const mockNotifications: Notification[] = [];
  const mockFeedback: Feedback[] = [];
  const securityScore = calculateSecurityScore(mockNotifications, mockFeedback);
  const formattedScore = formatSecurityScore(securityScore.score);

  if (!user) return null;

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'admin': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'fraud_analyst': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'department_head': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'employee': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'auditor': return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'fraud_analyst': return 'Fraud Analyst';
      case 'department_head': return 'Department Head';
      case 'employee': return 'Employee';
      case 'auditor': return 'Auditor';
      default: return 'Unknown';
    }
  };

  const renderRoleSpecificContent = () => {
    switch (role) {
      case 'admin':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4" />
              System Metrics
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Total Users</div>
                <div className="text-white font-medium">1,247</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Active Sessions</div>
                <div className="text-green-400 font-medium">892</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">System Load</div>
                <div className="text-amber-400 font-medium">67%</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Storage Used</div>
                <div className="text-cyan-400 font-medium">2.4TB</div>
              </div>
            </div>
          </div>
        );

      case 'fraud_analyst':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Review Stats
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Reviewed Today</div>
                <div className="text-cyan-400 font-medium">47</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Accuracy Rate</div>
                <div className="text-green-400 font-medium">94.2%</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Avg Review Time</div>
                <div className="text-amber-400 font-medium">3.2m</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Escalated</div>
                <div className="text-red-400 font-medium">8</div>
              </div>
            </div>
          </div>
        );

      case 'department_head':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Building className="w-4 h-4" />
              Department Risk Overview
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Team Size</div>
                <div className="text-cyan-400 font-medium">23</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Avg Risk Score</div>
                <div className="text-amber-400 font-medium">42%</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Alerts This Week</div>
                <div className="text-red-400 font-medium">156</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Response Rate</div>
                <div className="text-green-400 font-medium">87%</div>
              </div>
            </div>
          </div>
        );

      case 'auditor':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Governance Stats
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Audited This Month</div>
                <div className="text-cyan-400 font-medium">324</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Override Rate</div>
                <div className="text-amber-400 font-medium">12.4%</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">False Positives</div>
                <div className="text-red-400 font-medium">18</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Compliance Score</div>
                <div className="text-green-400 font-medium">96.8%</div>
              </div>
            </div>
          </div>
        );

      case 'employee':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Personal Notification Stats
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Total Received</div>
                <div className="text-cyan-400 font-medium">142</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Action Required</div>
                <div className="text-amber-400 font-medium">7</div>
              </div>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <div className="text-zinc-400 text-xs">Acknowledged</div>
                <div className="text-green-400 font-medium">135</div>
              </div>
              <div className={`bg-zinc-800 p-3 rounded-lg ${formattedScore.bgColor} ${formattedScore.borderColor}`}>
                <div className="text-zinc-400 text-xs">Security Score</div>
                <div className={`font-medium ${formattedScore.color}`}>
                  {formattedScore.display}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full justify-start p-3 ${className}`}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-white">{user.name}</div>
              <div className="text-xs text-zinc-400">{getRoleLabel(role)}</div>
            </div>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Profile Information</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                <Badge className={`${getRoleColor(role)} mt-1`}>
                  {getRoleLabel(role)}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300">{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300">{user.departmentId || 'General'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300">{orgId}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300">Last login: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Role-specific content */}
          {renderRoleSpecificContent()}

          {/* Change Password Section */}
          <div className="pt-4 border-t border-zinc-700">
            <ChangePasswordModal />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
