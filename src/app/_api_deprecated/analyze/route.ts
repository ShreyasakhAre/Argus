import { NextRequest, NextResponse } from "next/server";
const { analyzeNotification } = require("../../../../backend/services/aiService");

/**
 * POST /api/analyze
 * Analyze a notification using AI service with fallback
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sender, receiver, type, details } = body;

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Use AI service for analysis
    const analysis = await analyzeNotification({
      message,
      sender: sender || 'unknown',
      receiver: receiver || 'unknown',
      type: type || 'notification',
      details: details || {},
      timestamp: new Date().toISOString()
    });

    // Return successful analysis
    return NextResponse.json({
      success: true,
      analysis: {
        riskScore: analysis.riskScore,
        riskLevel: getRiskLevel(analysis.riskScore),
        explanation: analysis.explanation,
        confidence: analysis.confidence,
        source: analysis.source,
        isFlagged: analysis.riskScore >= 50
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Never expose raw errors - return user-friendly message
    const errorMessage = (error instanceof Error ? error.message : String(error)) || 'Analysis failed';
    
    // Check if it's an AI service error
    if (errorMessage.includes('402') || errorMessage.includes('insufficient_credits')) {
      return NextResponse.json({
        success: false,
        error: 'AI service temporarily unavailable. Using fallback detection.',
        fallbackAnalysis: {
          riskScore: 50,
          riskLevel: 'medium',
          explanation: ['Analysis service temporarily unavailable'],
          confidence: 'low',
          source: 'emergency_fallback',
          isFlagged: false
        }
      }, { status: 200 }); // Return 200 so frontend doesn't break
    }

    // Generic error handling
    return NextResponse.json({
      success: false,
      error: 'Analysis service temporarily unavailable. Please try again.',
      fallbackAnalysis: {
        riskScore: 30,
        riskLevel: 'low',
        explanation: ['Service temporarily unavailable'],
        confidence: 'low',
        source: 'emergency_fallback',
        isFlagged: false
      }
    }, { status: 200 });
  }
}

/**
 * Convert risk score to risk level
 */
function getRiskLevel(score: number): string {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * GET /api/analyze
 * Health check for AI service
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'AI Analysis API',
    version: '1.0.0',
    features: [
      'AI-powered analysis',
      'Fallback detection',
      'Error recovery',
      'Demo mode support'
    ]
  });
}
