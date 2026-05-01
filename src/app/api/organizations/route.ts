import { NextResponse } from 'next/server';
import { loadDatasetNotifications } from '@/lib/dataset-notifications';

export async function GET() {
  const notifications = loadDatasetNotifications();
  
  // Get unique organizations from dataset
  const orgCounts = notifications.reduce((acc, notif) => {
    const org = notif.org_id;
    acc[org] = (acc[org] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const organizations = Object.entries(orgCounts).map(([orgId, count]) => ({
    orgId,
    name: `Organization ${orgId.replace('ORG', '')}`,
    notificationCount: count,
    riskLevel: calculateOrgRiskLevel(orgId, notifications.filter(n => n.org_id === orgId))
  }));

  return NextResponse.json(organizations);
}

function calculateOrgRiskLevel(orgId: string, orgNotifications: any[]): 'Low' | 'Medium' | 'High' {
  const flaggedCount = orgNotifications.filter(n => n.is_flagged).length;
  const riskRatio = flaggedCount / orgNotifications.length;
  
  if (riskRatio > 0.3) return 'High';
  if (riskRatio > 0.1) return 'Medium';
  return 'Low';
}
