import { NextRequest, NextResponse } from 'next/server';
import { scanLink } from '@/lib/link-scanner';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

interface QRScanResult {
  success: boolean;
  qr_data: string | null;
  is_url: boolean;
  scan_result: {
    url: string;
    is_malicious: boolean;
    risk_score: number;
    risk_level: 'Low' | 'Medium' | 'High';
    explanation: string;
    features: Array<{
      feature: string;
      value: string | number | boolean;
      risk_impact: 'positive' | 'negative' | 'neutral';
      description: string;
    }>;
  } | null;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a QR code image.' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image (PNG, JPG, etc.)' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image file too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    try {
      const mlFormData = new FormData();
      mlFormData.append('file', file);

      const mlResponse = await fetch(`${ML_SERVICE_URL}/scan-qr`, {
        method: 'POST',
        body: mlFormData,
      });

      if (mlResponse.ok) {
        const result: QRScanResult = await mlResponse.json();
        return NextResponse.json(result);
      }
    } catch {
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const extractedUrl = extractUrlFromQRFallback(uint8Array);
    
    if (!extractedUrl) {
      return NextResponse.json({
        success: false,
        error: 'Could not decode QR code. Please ensure the image contains a valid QR code.',
        qr_data: null,
        is_url: false,
        scan_result: null
      }, { status: 422 });
    }

    const urlPattern = /^https?:\/\/|^www\./i;
    const isUrl = urlPattern.test(extractedUrl);

    if (isUrl) {
      const scanResult = scanLink(extractedUrl);
      return NextResponse.json({
        success: true,
        qr_data: extractedUrl,
        is_url: true,
        scan_result: scanResult
      });
    } else {
      return NextResponse.json({
        success: true,
        qr_data: extractedUrl,
        is_url: false,
        scan_result: {
          url: extractedUrl,
          is_malicious: false,
          risk_score: 0,
          risk_level: 'Low' as const,
          explanation: 'QR code contains non-URL data. No URL-based risk assessment applicable.',
          features: []
        }
      });
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to process QR code image' },
      { status: 500 }
    );
  }
}

function extractUrlFromQRFallback(_imageData: Uint8Array): string | null {
  return null;
}
