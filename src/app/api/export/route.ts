import { NextRequest, NextResponse } from 'next/server';
import { loadDatasetNotifications } from '@/lib/dataset-notifications';

export async function GET(request: NextRequest) {
  const notifications = loadDatasetNotifications();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');
  
  const filtered = orgId 
    ? notifications.filter(n => n.org_id === orgId)
    : notifications;
  
  // Generate export data from real dataset
  const csvContent = [
    'notification_id,org_id,department,channel,sender,receiver,content,risk_score,threat_category,is_malicious,timestamp',
    ...filtered.map(n => 
      `${n.notification_id},${n.org_id},${n.department},${n.channel},${n.sender},${n.receiver},"${n.content}",${n.risk_score},${n.threat_category},${n.is_malicious},${n.timestamp}`
    )
  ].join('\n');
  
  return NextResponse.json({
    content: csvContent,
    filename: `argus_export_${new Date().toISOString().split('T')[0]}.csv`
  });
}
