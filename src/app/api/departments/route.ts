import { NextResponse } from 'next/server';
import { loadDatasetNotifications } from '@/lib/dataset-notifications';

export async function GET() {
  const notifications = loadDatasetNotifications();
  
  // Calculate department stats from dataset
  const departmentStats = notifications.reduce((acc, notif) => {
    const dept = notif.department;
    if (!acc[dept]) {
      acc[dept] = {
        name: dept,
        total: 0,
        flagged: 0,
        riskScore: 0
      };
    }
    acc[dept].total++;
    if (notif.is_flagged) acc[dept].flagged++;
    acc[dept].riskScore += notif.risk_score;
    return acc;
  }, {} as Record<string, any>);

  // Calculate average risk scores
  Object.values(departmentStats).forEach((dept: any) => {
    dept.riskScore = dept.total > 0 ? dept.riskScore / dept.total : 0;
  });

  return NextResponse.json(Object.values(departmentStats));
}
