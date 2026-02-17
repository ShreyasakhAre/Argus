'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/components/auth-provider';
import { useRole } from '@/components/role-provider';
import { Key, AlertCircle, CheckCircle } from 'lucide-react';
import { getUserByEmail, updateUserPassword, validatePassword, hashPassword, verifyPassword } from '@/lib/users';

interface ChangePasswordModalProps {
  targetUserEmail?: string;
  trigger?: React.ReactNode;
}

export function ChangePasswordModal({ targetUserEmail, trigger }: ChangePasswordModalProps) {
  const { user } = useAuth();
  const { role } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isChangingOwnPassword = !targetUserEmail || targetUserEmail === user?.email;
  const canChangePassword = isChangingOwnPassword || role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const targetEmail = targetUserEmail || user?.email;
      if (!targetEmail) {
        setError('User not found');
        return;
      }

      // Validate new password
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid password');
        return;
      }

      // Check password confirmation
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // If changing own password, verify current password
      if (isChangingOwnPassword) {
        const targetUser = getUserByEmail(targetEmail);
        if (!targetUser) {
          setError('User not found');
          return;
        }

        const isCurrentPasswordValid = await verifyPassword(currentPassword, targetUser.passwordHash);
        if (!isCurrentPasswordValid) {
          setError('Current password is incorrect');
          return;
        }
      }

      // Hash new password and update
      const newPasswordHash = await hashPassword(newPassword);
      const updated = updateUserPassword(targetEmail, newPasswordHash);

      if (updated) {
        setSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Close modal after success
        setTimeout(() => {
          setIsOpen(false);
          setSuccess('');
        }, 2000);
      } else {
        setError('Failed to update password');
      }
    } catch (err) {
      setError('An error occurred while changing password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canChangePassword) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="w-full">
            <Key className="w-4 h-4 mr-2" />
            Change Password
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Key className="w-5 h-5" />
            {isChangingOwnPassword ? 'Change Your Password' : `Reset Password`}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isChangingOwnPassword && (
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-zinc-300">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                required
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-zinc-300">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              required
            />
            <div className="text-xs text-zinc-400 space-y-1">
              <div>• Minimum 8 characters</div>
              <div>• Must contain a number</div>
              <div>• Must contain a symbol</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-zinc-300">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
