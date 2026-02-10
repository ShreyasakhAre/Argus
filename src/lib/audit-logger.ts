/**
 * AUDIT LOGGER
 * Logs all permission-based actions and security events
 */

import { PermissionType, Role } from '@/lib/types';

export interface AuditEvent {
  _id?: string;
  timestamp: Date;
  action: string;
  userId: string;
  userRole: Role;
  details?: Record<string, any>;
  success?: boolean;
  error?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PermissionAuditEvent extends AuditEvent {
  action: 'PERMISSION_GRANTED' | 'PERMISSION_DENIED' | 'PERMISSION_CHANGED';
  permission?: PermissionType | PermissionType[];
}

export interface ApiAuditEvent extends AuditEvent {
  action: 'API_ACCESS' | 'API_ERROR' | 'API_MODIFIED';
  endpoint: string;
  method: string;
  statusCode?: number;
}

export interface RoleAuditEvent extends AuditEvent {
  action: 'ROLE_CREATED' | 'ROLE_UPDATED' | 'ROLE_DELETED' | 'ROLE_ASSIGNED';
  targetRole?: Role;
  targetUser?: string;
  changes?: Record<string, any>;
}

/**
 * Log audit event to database
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const auditEntry = {
      ...event,
      timestamp: new Date(),
      createdAt: new Date(),
    };

    // In a real implementation, save to MongoDB
    // await db.collection('audit_logs').insertOne(auditEntry);

    // For now, log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', {
        action: event.action,
        user: event.userId,
        role: event.userRole,
        time: new Date().toISOString(),
        details: event.details,
      });
    }

    // In production, also send to external logging service
    if (process.env.NODE_ENV === 'production') {
      // await logToExternalService(auditEntry);
    }
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Log permission check
 */
export async function logPermissionCheck(
  userId: string,
  userRole: Role,
  permission: PermissionType | PermissionType[],
  allowed: boolean,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    action: allowed ? 'PERMISSION_GRANTED' : 'PERMISSION_DENIED',
    userId,
    userRole,
    details: {
      ...details,
      permission: Array.isArray(permission) ? permission : [permission],
    },
    timestamp: new Date(),
  });
}

/**
 * Log API access
 */
export async function logApiAccess(
  userId: string,
  userRole: Role,
  endpoint: string,
  method: string,
  permission?: PermissionType,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    action: 'API_ACCESS',
    userId,
    userRole,
    details: {
      ...details,
      permission,
    },
    timestamp: new Date(),
  } as ApiAuditEvent & { endpoint: string; method: string });
}

/**
 * Log API error
 */
export async function logApiError(
  userId: string,
  userRole: Role,
  endpoint: string,
  method: string,
  error: string,
  statusCode: number = 500
): Promise<void> {
  await logAuditEvent({
    action: 'API_ERROR',
    userId,
    userRole,
    details: {
      endpoint,
      method,
      statusCode,
      error,
    },
    timestamp: new Date(),
  });
}

/**
 * Log role creation
 */
export async function logRoleCreated(
  userId: string,
  userRole: Role,
  newRole: Role,
  permissions: PermissionType[]
): Promise<void> {
  await logAuditEvent({
    action: 'ROLE_CREATED',
    userId,
    userRole,
    details: {
      newRole,
      permissions,
    },
    timestamp: new Date(),
  } as RoleAuditEvent);
}

/**
 * Log role update
 */
export async function logRoleUpdated(
  userId: string,
  userRole: Role,
  targetRole: Role,
  changes: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    action: 'ROLE_UPDATED',
    userId,
    userRole,
    details: {
      targetRole,
      changes,
    },
    timestamp: new Date(),
  } as RoleAuditEvent);
}

/**
 * Log role deletion
 */
export async function logRoleDeleted(
  userId: string,
  userRole: Role,
  deletedRole: Role
): Promise<void> {
  await logAuditEvent({
    action: 'ROLE_DELETED',
    userId,
    userRole,
    details: {
      deletedRole,
    },
    timestamp: new Date(),
  } as RoleAuditEvent);
}

/**
 * Log role assignment to user
 */
export async function logRoleAssigned(
  userId: string,
  userRole: Role,
  targetUserId: string,
  newRole: Role,
  previousRole?: Role
): Promise<void> {
  await logAuditEvent({
    action: 'ROLE_ASSIGNED',
    userId,
    userRole,
    details: {
      targetUserId,
      newRole,
      previousRole,
    },
    timestamp: new Date(),
  } as RoleAuditEvent);
}

/**
 * Get audit logs (with filtering)
 */
export async function getAuditLogs(filter?: {
  userId?: string;
  userRole?: Role;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditEvent[]> {
  try {
    // In a real implementation, query MongoDB with filters
    // const query: any = {};
    // if (filter?.userId) query.userId = filter.userId;
    // if (filter?.userRole) query.userRole = filter.userRole;
    // if (filter?.action) query.action = filter.action;
    // if (filter?.startDate || filter?.endDate) {
    //   query.timestamp = {};
    //   if (filter?.startDate) query.timestamp.$gte = filter.startDate;
    //   if (filter?.endDate) query.timestamp.$lte = filter.endDate;
    // }
    // return await db.collection('audit_logs')
    //   .find(query)
    //   .sort({ timestamp: -1 })
    //   .limit(filter?.limit || 100)
    //   .toArray();

    console.log('[AUDIT LOG QUERY]', { filter });
    return [];
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for specific user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100
): Promise<AuditEvent[]> {
  return getAuditLogs({
    userId,
    limit,
  });
}

/**
 * Get audit logs for specific action
 */
export async function getActionAuditLogs(
  action: string,
  limit: number = 100
): Promise<AuditEvent[]> {
  return getAuditLogs({
    action,
    limit,
  });
}

/**
 * Get permission change history
 */
export async function getPermissionChangeHistory(
  userId?: string,
  limit: number = 100
): Promise<PermissionAuditEvent[]> {
  const logs = await getAuditLogs({
    action: 'PERMISSION_CHANGED',
    userId,
    limit,
  });

  return logs as PermissionAuditEvent[];
}

/**
 * Export audit logs for compliance
 */
export async function exportAuditLogs(filter?: {
  userId?: string;
  userRole?: Role;
  startDate?: Date;
  endDate?: Date;
}): Promise<string> {
  const logs = await getAuditLogs({
    ...filter,
    limit: 10000, // Export up to 10k records
  });

  // Convert to CSV format
  const headers = [
    'Timestamp',
    'Action',
    'User ID',
    'User Role',
    'Details',
  ];

  const rows = logs.map(log => [
    log.timestamp.toISOString(),
    log.action,
    log.userId,
    log.userRole,
    JSON.stringify(log.details || {}),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}

/**
 * Get compliance report
 */
export async function getComplianceReport(filter?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalEvents: number;
  deniedAccess: number;
  roleChanges: number;
  apiErrors: number;
  summary: Record<string, number>;
}> {
  const logs = await getAuditLogs({
    ...filter,
    limit: 10000,
  });

  const summary: Record<string, number> = {};
  let deniedAccess = 0;
  let roleChanges = 0;
  let apiErrors = 0;

  logs.forEach(log => {
    summary[log.action] = (summary[log.action] || 0) + 1;

    if (log.action === 'PERMISSION_DENIED') {
      deniedAccess++;
    }
    if (
      log.action === 'ROLE_CREATED' ||
      log.action === 'ROLE_UPDATED' ||
      log.action === 'ROLE_ASSIGNED'
    ) {
      roleChanges++;
    }
    if (log.action === 'API_ERROR') {
      apiErrors++;
    }
  });

  return {
    totalEvents: logs.length,
    deniedAccess,
    roleChanges,
    apiErrors,
    summary,
  };
}
