import { NextResponse } from 'next/server';
import { loadDatasetNotifications } from '@/lib/dataset-notifications';

export async function GET() {
  const notifications = loadDatasetNotifications();
  
  // Get unique source apps from dataset
  const sourceAppCounts = notifications.reduce((acc, notif) => {
    const app = notif.source_app;
    acc[app] = (acc[app] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sourceApps = Object.entries(sourceAppCounts).map(([name, count]) => ({
    name,
    count,
    riskLevel: calculateRiskLevel(name, notifications.filter(n => n.source_app === name))
  }));

  return NextResponse.json(sourceApps);
}

function calculateRiskLevel(sourceApp: string, appNotifications: any[]): 'Low' | 'Medium' | 'High' {
  const flaggedCount = appNotifications.filter(n => n.is_flagged).length;
  const riskRatio = flaggedCount / appNotifications.length;
  
  if (riskRatio > 0.3) return 'High';
  if (riskRatio > 0.1) return 'Medium';
  return 'Low';
}
