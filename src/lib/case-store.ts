export interface IncidentCase {
  id: string;
  notification_id: string;
  created_by: string;
  assigned_to: string | null;
  status: 'Open' | 'Investigating' | 'Resolved' | 'Escalated';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  notes: string[];
  created_at: string;
  updated_at: string;
}

// In-memory case store
let cases: IncidentCase[] = [];

export function createCase(notification: any, createdBy: string): IncidentCase {
  const newCase: IncidentCase = {
    id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    notification_id: notification.notification_id || notification.id || '',
    created_by: createdBy,
    assigned_to: null,
    status: 'Open',
    priority: getPriorityFromRisk(notification.risk_score || 0),
    notes: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  cases.push(newCase);
  return newCase;
}

export function updateCaseStatus(caseId: string, status: IncidentCase['status']): boolean {
  const caseIndex = cases.findIndex(c => c.id === caseId);
  if (caseIndex === -1) return false;
  
  cases[caseIndex].status = status;
  cases[caseIndex].updated_at = new Date().toISOString();
  return true;
}

export function assignCase(caseId: string, assignedTo: string): boolean {
  const caseIndex = cases.findIndex(c => c.id === caseId);
  if (caseIndex === -1) return false;
  
  cases[caseIndex].assigned_to = assignedTo;
  cases[caseIndex].updated_at = new Date().toISOString();
  return true;
}

export function addCaseNote(caseId: string, note: string): boolean {
  const caseIndex = cases.findIndex(c => c.id === caseId);
  if (caseIndex === -1) return false;
  
  cases[caseIndex].notes.push(note);
  cases[caseIndex].updated_at = new Date().toISOString();
  return true;
}

export function getAllCases(): IncidentCase[] {
  return [...cases];
}

export function getCasesByUser(userId: string): IncidentCase[] {
  return cases.filter(c => c.created_by === userId || c.assigned_to === userId);
}

function getPriorityFromRisk(riskScore: number): IncidentCase['priority'] {
  if (riskScore >= 0.9) return 'Critical';
  if (riskScore >= 0.7) return 'High';
  if (riskScore >= 0.4) return 'Medium';
  return 'Low';
}
