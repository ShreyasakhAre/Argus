export interface AuditLog {
  id: string;
  user: string;
  role: string;
  action: string;
  target_id: string;
  timestamp: string;
  details?: any;
}

// In-memory audit log store
let auditLogs: AuditLog[] = [];

export function logAuditEvent(
  user: string,
  role: string,
  action: string,
  targetId: string,
  details?: any
): void {
  const logEntry: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user,
    role,
    action,
    target_id: targetId,
    timestamp: new Date().toISOString(),
    details
  };
  
  auditLogs.push(logEntry);
  
  // Also log to console for debugging
  console.log('Audit Log:', logEntry);
}

export function getAuditLogs(limit?: number): AuditLog[] {
  const logs = [...auditLogs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  return limit ? logs.slice(-limit) : logs;
}

export function getAuditLogsByUser(userId: string, limit?: number): AuditLog[] {
  const userLogs = auditLogs.filter(log => log.user === userId);
  return limit ? userLogs.slice(-limit) : userLogs;
}

// Specific audit event helpers
export function logNotificationDecision(
  user: string,
  role: string,
  notificationId: string,
  decision: 'safe' | 'malicious',
  notes?: string
): void {
  logAuditEvent(user, role, `Marked notification as ${decision}`, notificationId, {
    decision,
    notes
  });
}

export function logCaseCreation(
  user: string,
  role: string,
  caseId: string,
  notificationId: string
): void {
  logAuditEvent(user, role, 'Created incident case', caseId, {
    notification_id: notificationId
  });
}

export function logCaseStatusChange(
  user: string,
  role: string,
  caseId: string,
  oldStatus: string,
  newStatus: string
): void {
  logAuditEvent(user, role, 'Changed case status', caseId, {
    old_status: oldStatus,
    new_status: newStatus
  });
}

export function logEscalation(
  user: string,
  role: string,
  notificationId: string,
  riskScore: number
): void {
  logAuditEvent(user, role, 'Auto-escalated high risk notification', notificationId, {
    risk_score: riskScore,
    escalation_type: 'automatic'
  });
}
