import { NextRequest, NextResponse } from 'next/server';
import { loadDatasetNotifications } from '@/lib/dataset-notifications';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const notifications = loadDatasetNotifications();
  const notification = notifications.find(n => n.notification_id === params.id);
  
  if (!notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }
  
  // Generate explanation based on real notification data
  const explanation = {
    notification_id: notification.notification_id,
    prediction: {
      notification_id: notification.notification_id,
      risk_score: notification.risk_score,
      risk_level: notification.risk_level,
      is_flagged: notification.is_flagged
    },
    explanation: {
      top_features: [
        {
          feature: 'sender_domain',
          impact: notification.sender_domain && !notification.sender_domain.includes('company.com') ? 0.8 : 0.2,
          direction: notification.sender_domain && !notification.sender_domain.includes('company.com') ? 'increases_risk' : 'decreases_risk'
        },
        {
          feature: 'contains_url',
          impact: notification.contains_url * 0.6,
          direction: notification.contains_url ? 'increases_risk' : 'neutral'
        },
        {
          feature: 'attachment_type',
          impact: notification.attachment_type && notification.attachment_type !== 'none' ? 0.7 : 0.1,
          direction: notification.attachment_type && notification.attachment_type !== 'none' ? 'increases_risk' : 'decreases_risk'
        }
      ],
      explanation_text: generateExplanationText(notification),
      all_impacts: []
    }
  };
  
  return NextResponse.json(explanation);
}

function generateExplanationText(notification: any): string {
  const reasons = [];
  
  if (notification.is_malicious === 1) {
    if (notification.sender_domain && !notification.sender_domain.includes('company.com')) {
      reasons.push('External sender domain detected');
    }
    if (notification.contains_url === 1) {
      reasons.push('Contains suspicious URL');
    }
    if (notification.attachment_type && notification.attachment_type !== 'none') {
      reasons.push(`Risky attachment: ${notification.attachment_type}`);
    }
  } else {
    reasons.push('Trusted internal communication patterns');
  }
  
  return reasons.join(', ') || 'Standard analysis completed';
}
