'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './auth-provider';
import { ROLES, ALL_PERMISSIONS, Role, PermissionType, ROLE_NAMES } from '@/lib/types';
import { Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface RolePermissionState {
  role: Role;
  permissions: PermissionType[];
}

/**
 * Admin-Only Roles & Permissions Manager
 * Only accessible to admin users
 */
export function AdminRolesPanel() {
  const { user } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<RolePermissionState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalState, setOriginalState] = useState<RolePermissionState[]>([]);

  // Only admins can see this
  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6 bg-red-900/20 border border-red-600 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-200">Access Denied: Only administrators can manage roles and permissions.</p>
        </div>
      </div>
    );
  }

  // Load permissions on mount
  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const token = btoa(JSON.stringify(user));
      const response = await fetch('/api/permissions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load permissions');
      }

      const data = await response.json();
      const permissions = data.data || [];
      
      // Normalize and sort by role
      const normalized: RolePermissionState[] = ROLES.map((role) => {
        const found = permissions.find((p: any) => p.role === role);
        return {
          role,
          permissions: found?.permissions || [],
        };
      });

      setRolePermissions(normalized);
      setOriginalState(JSON.parse(JSON.stringify(normalized)));
      toast.success('Permissions loaded');
    } catch (error) {
      console.error('Failed to load permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (role: Role, permission: PermissionType) => {
    setRolePermissions((prev) =>
      prev.map((rp) => {
        if (rp.role !== role) return rp;
        const hasPermission = rp.permissions.includes(permission);
        return {
          ...rp,
          permissions: hasPermission
            ? rp.permissions.filter((p) => p !== permission)
            : [...rp.permissions, permission],
        };
      })
    );
  };

  const savePermissions = async () => {
    try {
      setIsSaving(true);
      const token = btoa(JSON.stringify(user));
      
      // Save each role's permissions
      const savePromises = rolePermissions.map((rp) =>
        fetch('/api/permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: rp.role,
            permissions: rp.permissions,
          }),
        })
      );

      const results = await Promise.all(savePromises);
      const allOk = results.every((r) => r.ok);

      if (!allOk) {
        throw new Error('Some permissions failed to save');
      }

      setOriginalState(JSON.parse(JSON.stringify(rolePermissions)));
      toast.success('Permissions saved successfully');
    } catch (error) {
      console.error('Failed to save permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(rolePermissions) !== JSON.stringify(originalState);

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Loading permissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Roles & Permissions</h2>
        <p className="text-gray-400">
          Configure what each role can access and do in the system.
        </p>
      </div>

      {/* Permissions Grid */}
      <div className="space-y-4">
        {rolePermissions.map((rp) => (
          <div
            key={rp.role}
            className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 overflow-x-auto"
          >
            {/* Role Header */}
            <div className="mb-4 pb-3 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {ROLE_NAMES[rp.role]}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {rp.permissions.length} permission{rp.permissions.length !== 1 ? 's' : ''} granted
              </p>
            </div>

            {/* Permissions Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  className="flex items-start gap-3 p-2 hover:bg-gray-800/50 rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={rp.permissions.includes(permission)}
                    onChange={() => togglePermission(rp.role, permission)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-300">
                      {permission
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getPermissionDescription(permission)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <button
            onClick={savePermissions}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => {
              setRolePermissions(JSON.parse(JSON.stringify(originalState)));
            }}
            disabled={isSaving}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Get description for each permission
 */
function getPermissionDescription(permission: PermissionType): string {
  const descriptions: Record<PermissionType, string> = {
    view_all_notifications: 'See all notifications across the organization',
    view_department_notifications: 'See notifications for your department',
    view_personal_notifications: 'See only personal notifications',
    view_fraud_feed: 'Access the fraud analysis feed',
    acknowledge_alerts: 'Mark alerts as acknowledged',
    access_scanners: 'Use URL and QR code scanners',
    view_analytics: 'View analytics and reports',
    export_reports: 'Export data and generate reports',
    view_audit_logs: 'Access audit and compliance logs',
    retrain_model: 'Trigger ML model retraining',
    manage_roles_permissions: 'Manage roles and permissions',
  };

  return descriptions[permission] || 'System permission';
}
