import mongoose from "mongoose";
import { Role, PermissionType, ROLES, ALL_PERMISSIONS } from "@/lib/types";

// ============================================
// ROLE PERMISSIONS SCHEMA
// ============================================
const RolePermissionsSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ROLES,
      required: true,
      unique: true,
    },
    permissions: {
      type: [String],
      enum: ALL_PERMISSIONS,
      default: [],
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const RolePermission =
  mongoose.models.RolePermission ||
  mongoose.model("RolePermission", RolePermissionsSchema);

// ============================================
// DEFAULT ROLE PERMISSIONS
// ============================================
/**
 * ROLE-BASED ACCESS CONTROL (RBAC) CONFIGURATION
 * 
 * Each role has specific permissions aligned with their responsibilities
 * and organizational security principles (Separation of Duties)
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, PermissionType[]> = {
  // ✅ ADMIN - Full access to all system features
  admin: [
    'view_all_notifications',
    'view_department_notifications',
    'view_personal_notifications',
    'view_fraud_feed',
    'acknowledge_alerts',
    'access_scanners',
    'view_analytics',
    'export_reports',
    'view_audit_logs',
    'retrain_model',
    'manage_roles_permissions',
  ],

  // ✅ FRAUD ANALYST - Core investigation and scanning role
  // Can investigate alerts, scan links/QR codes, and analyze trends
  // Cannot change permissions, retrain models, or access audit logs (separation of duties)
  fraud_analyst: [
    'view_all_notifications',           // See all fraud alerts
    'view_fraud_feed',                  // Access fraud investigation feed
    'acknowledge_alerts',               // Mark alerts as acknowledged/investigated
    'access_scanners',                  // Scan links and QR codes
    'view_analytics',                   // Analyze fraud patterns and trends
    'export_reports',                   // Generate investigation reports
  ],

  // ✅ DEPARTMENT HEAD - Managerial visibility for own department
  // Can see department-specific data, track risk, review reports
  // Cannot scan URLs, manage roles, or access compliance data
  department_head: [
    'view_department_notifications',    // See only department notifications
    'view_fraud_feed',                  // Review fraud trends affecting their department
    'view_analytics',                   // Monitor department risk exposure
    'export_reports',                   // Generate department reports
    'acknowledge_alerts',               // Acknowledge department-specific alerts
  ],

  // ✅ EMPLOYEE - Least-privilege end-user access
  // Can only see their own notifications and acknowledge alerts
  // Protects against data leakage and unauthorized access
  employee: [
    'view_personal_notifications',      // See only their own notifications
    'acknowledge_alerts',               // Acknowledge security warnings
  ],

  // ✅ AUDITOR - Compliance and read-only monitoring
  // Can view all notifications and audit logs for compliance
  // Cannot acknowledge alerts, export data, or modify settings (read-only principle)
  auditor: [
    'view_all_notifications',           // Full visibility for audit trail
    'view_department_notifications',    // Track department compliance
    'view_analytics',                   // Monitor system metrics for compliance
    'view_audit_logs',                  // Access compliance audit logs
  ],
};

/**
 * Initialize default role permissions in database
 */
export async function initializeDefaultPermissions() {
  try {
    for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      await RolePermission.findOneAndUpdate(
        { role },
        { 
          role, 
          permissions,
          description: `Default permissions for ${role}`,
        },
        { upsert: true, new: true }
      );
    }
    console.log("✅ Default role permissions initialized");
  } catch (error) {
    console.error("❌ Error initializing default permissions:", error);
  }
}
