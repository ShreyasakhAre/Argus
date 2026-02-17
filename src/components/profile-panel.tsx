'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-provider';
import { useRole } from '@/components/role-provider';
import { User, Mail, Building, Calendar, Shield, Key, Send, CheckCircle } from 'lucide-react';
import { ChangePasswordModal } from '@/components/change-password-modal';

interface ProfilePanelProps {
  className?: string;
}

export function ProfilePanel({ className }: ProfilePanelProps) {
  const { user } = useAuth();
  const { role } = useRole();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showResetToast, setShowResetToast] = useState(false);

  const handlePasswordReset = () => {
    setShowResetToast(true);
    setTimeout(() => setShowResetToast(false), 3000);
  };

  if (!user) return null;

  const roleConfig = {
    admin: { label: 'Admin', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
    fraud_analyst: { label: 'Fraud Analyst', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    department_head: { label: 'Department Head', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
    employee: { label: 'Employee', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    auditor: { label: 'Auditor', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  };

  const currentRoleConfig = roleConfig[role as keyof typeof roleConfig] || roleConfig.employee;

  return (
    <>
      {/* Profile Avatar Section */}
      <div className={`flex items-center gap-3 p-3 border-t border-zinc-800 ${className}`}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{user.name || 'Unknown User'}</p>
          <p className="text-xs text-zinc-400 truncate">{user.email || 'No email'}</p>
        </div>
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <User className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          
          <DialogContent className="w-full max-w-[600px] max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-xl bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                User Profile
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col gap-6">
              {/* Profile Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-semibold text-white">Profile Information</h3>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs text-zinc-400">Full Name</p>
                        <p className="text-sm text-white">{user.name || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs text-zinc-400">Email</p>
                        <p className="text-sm text-white">{user.email || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs text-zinc-400">Role</p>
                        <Badge className={currentRoleConfig.color}>
                          {currentRoleConfig.label}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Building className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs text-zinc-400">Organization</p>
                        <p className="text-sm text-white">{user.orgId || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Building className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs text-zinc-400">Department</p>
                        <p className="text-sm text-white">Engineering</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs text-zinc-400">Account Created</p>
                        <p className="text-sm text-white">January 15, 2024</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs text-zinc-400">Last Login</p>
                        <p className="text-sm text-white">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs text-zinc-400">Account Status</p>
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Security Settings */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-semibold text-white">Security Settings</h3>
                  
                  <div className="flex flex-col gap-3">
                    <div className="p-4 border border-zinc-700 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-zinc-400" />
                          <span className="text-sm font-medium text-white">Password</span>
                        </div>
                        <span className="text-xs text-zinc-400">Last changed 30 days ago</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <ChangePasswordModal 
                          trigger={
                            <Button variant="outline" size="sm" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                              <Key className="w-4 h-4 mr-2" />
                              Change Password
                            </Button>
                          }
                        />
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handlePasswordReset}
                          className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reset Password Toast */}
      {showResetToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Password reset link sent to your registered email</span>
        </div>
      )}
    </>
  );
}
