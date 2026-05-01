import { NextRequest, NextResponse } from 'next/server';
import { loadDatasetNotifications } from '@/lib/dataset-notifications';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    // In a real system, this would update a database
    console.log(`[notifications/read] Marking ${id} as read`);
    
    return NextResponse.json({ 
      success: true, 
      id,
      read: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid request' 
    }, { status: 400 });
  }
}
