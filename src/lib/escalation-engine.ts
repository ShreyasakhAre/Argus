import { createCase, updateCaseStatus } from './case-store';
import { logEscalation } from './audit-log-store';

export interface EscalationRule {
  id: string;
  name: string;
  condition: (notification: any) => boolean;
  action: (notification: any, user: string) => { escalated: boolean; caseId?: string; reason?: string } | void;
  priority: number;
}

// Auto-escalation rules
const escalationRules: EscalationRule[] = [
  {
    id: 'critical_risk',
    name: 'Critical Risk Auto-Escalation',
    condition: (notification) => (notification.risk_score || 0) > 0.9,
    action: (notification, user) => {
      const newCase = createCase(notification, user);
      updateCaseStatus(newCase.id, 'Escalated');
      logEscalation(user, 'fraud_analyst', notification.notification_id, notification.risk_score || 0);
      
      return {
        escalated: true,
        caseId: newCase.id,
        reason: 'Critical risk score detected'
      };
    },
    priority: 1
  },
  {
    id: 'high_risk',
    name: 'High Risk Auto-Escalation',
    condition: (notification) => (notification.risk_score || 0) > 0.8,
    action: (notification, user) => {
      const newCase = createCase(notification, user);
      updateCaseStatus(newCase.id, 'Escalated');
      logEscalation(user, 'fraud_analyst', notification.notification_id, notification.risk_score || 0);
      
      return {
        escalated: true,
        caseId: newCase.id,
        reason: 'High risk score detected'
      };
    },
    priority: 2
  }
];

export function checkEscalationRules(notification: any, user: string): {
  escalated: boolean;
  caseId?: string;
  reason?: string;
  bannerMessage?: string;
} | null {
  // Check rules in priority order
  for (const rule of escalationRules.sort((a, b) => a.priority - b.priority)) {
    if (rule.condition(notification)) {
      const result = rule.action(notification, user);
      
      if (result) {
        return {
          escalated: true,
          caseId: result.caseId,
          reason: result.reason,
          bannerMessage: `🚨 Auto-Escalated: ${rule.name} - ${result.reason}`
        };
      }
    }
  }
  
  return null;
}

export function getEscalationBanner(notifications: any[], user: string): string | null {
  // Check if any recent notifications need escalation
  for (const notification of notifications) {
    const escalation = checkEscalationRules(notification, user);
    if (escalation?.escalated) {
      return escalation.bannerMessage || null;
    }
  }
  
  return null;
}

export function shouldShowEscalationBanner(notifications: any[], user: string): boolean {
  return getEscalationBanner(notifications, user) !== null;
}
