'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, Upload, Shield, AlertTriangle, CheckCircle, Loader2, X, Link2 } from 'lucide-react';

interface ScanResult {
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
}

interface QRScanResponse {
  success: boolean;
  qr_data: string | null;
  is_url: boolean;
  scan_result: ScanResult | null;
  error?: string;
}

export function QRScanner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QRScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file too large (max 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    await scanQRCode(file);
  };

  const scanQRCode = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/scan-qr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan QR code');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setResult(null);
    setError(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      await scanQRCode(file);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-500';
      case 'Medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-500/20 border-red-500/30';
      case 'Medium': return 'bg-yellow-500/20 border-yellow-500/30';
      default: return 'bg-green-500/20 border-green-500/30';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          QR Code Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!preview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-muted-foreground text-xs">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        ) : (
          <div className="relative">
            <img
              src={preview}
              alt="QR Code preview"
              className="w-full max-h-48 object-contain rounded-lg bg-muted"
            />
            <Button
              onClick={handleClear}
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 bg-background/80 hover:bg-background"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Scanning QR code...</span>
          </div>
        )}

        {error && (
          <div className="bg-destructive/20 border border-destructive/30 text-destructive p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result && result.success && result.scan_result && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Extracted URL</span>
              </div>
              <p className="text-foreground font-mono text-sm break-all">
                {result.qr_data}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${getRiskBg(result.scan_result.risk_level)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {result.scan_result.is_malicious ? (
                    <AlertTriangle className={`w-5 h-5 ${getRiskColor(result.scan_result.risk_level)}`} />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  <span className={`font-semibold ${getRiskColor(result.scan_result.risk_level)}`}>
                    {result.scan_result.is_malicious ? 'Malicious QR Code' : 'QR Code Appears Safe'}
                  </span>
                </div>
                <Badge className={getRiskBg(result.scan_result.risk_level)}>
                  <Shield className="w-3 h-3 mr-1" />
                  {result.scan_result.risk_level} Risk ({((result.scan_result.risk_score ) > 1 ? Math.round(result.scan_result.risk_score ) : Math.round((result.scan_result.risk_score ) * 100))}%)
                </Badge>
              </div>

              <p className="text-muted-foreground text-sm">{result.scan_result.explanation}</p>
            </div>

            {result.scan_result.features && result.scan_result.features.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Analysis Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.scan_result.features.slice(0, 6).map((feature, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg text-sm ${
                        feature.risk_impact === 'positive'
                          ? 'bg-red-500/10 border border-red-500/20'
                          : feature.risk_impact === 'negative'
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-muted border border-border'
                      }`}
                    >
                      <span className="text-foreground">{feature.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleClear} variant="outline" className="w-full">
              Scan Another QR Code
            </Button>
          </div>
        )}

        {result && !result.success && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 p-3 rounded-lg text-sm">
            Could not decode QR code. Please ensure the image contains a valid QR code.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
