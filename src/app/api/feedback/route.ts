import { NextRequest, NextResponse } from 'next/server';
import { loadDatasetNotifications } from '@/lib/dataset-notifications';

export async function GET() {
  const data = loadDatasetNotifications();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const { notification_id, decision, corrected_label, analyst_notes } = await request.json();
    
    // In a real system, this would update a database
    console.log(`[feedback] Processing ${decision} for ${notification_id}`);
    
    return NextResponse.json({ 
      success: true, 
      notification_id,
      decision,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid request' 
    }, { status: 400 });
  }
}
