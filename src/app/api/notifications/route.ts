import { NextRequest, NextResponse } from 'next/server';
import { mockData } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const org_id = searchParams.get('org_id') || undefined;
  const department = searchParams.get('department') || undefined;
  const flagged_only = searchParams.get('flagged_only') === 'true';
  const search = searchParams.get('search') || undefined;
  const risk_level = searchParams.get('risk_level') || undefined;
  const date_from = searchParams.get('date_from') || undefined;
  const date_to = searchParams.get('date_to') || undefined;
  const sender_domain = searchParams.get('sender_domain') || undefined;
  const source_app = searchParams.get('source_app') || undefined;

  const data = mockData.getNotifications({ 
    org_id, 
    department, 
    flagged_only,
    search,
    risk_level,
    date_from,
    date_to,
    sender_domain,
    source_app
  });
  return NextResponse.json(data);
}
