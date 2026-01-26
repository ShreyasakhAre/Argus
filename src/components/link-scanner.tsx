'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link2, Search, Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

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

export function LinkScanner() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!url.trim()) {
      setError('Please enter a URL to scan');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/scan-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        throw new Error('Failed to scan URL');
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setError('Failed to scan URL. Please try again.');
    } finally {
      setLoading(false);
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
          <Link2 className="w-5 h-5 text-primary" />
          Link Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter URL to scan (e.g., https://example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            className="bg-muted border-input"
          />
          <Button 
            onClick={handleScan} 
            disabled={loading}
            className="bg-primary hover:bg-primary/90 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4 mr-1" />
                Scan
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/20 border border-destructive/30 text-destructive p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className={`p-4 rounded-lg border ${getRiskBg(result.risk_level)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {result.is_malicious ? (
                    <AlertTriangle className={`w-5 h-5 ${getRiskColor(result.risk_level)}`} />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  <span className={`font-semibold ${getRiskColor(result.risk_level)}`}>
                    {result.is_malicious ? 'Malicious Link Detected' : 'Link Appears Safe'}
                  </span>
                </div>
                <Badge className={getRiskBg(result.risk_level)}>
                  <Shield className="w-3 h-3 mr-1" />
                  {result.risk_level} Risk ({Math.round(result.risk_score * 100)}%)
                </Badge>
              </div>

              <p className="text-muted-foreground text-sm mb-3">{result.explanation}</p>

              <div className="bg-muted p-2 rounded text-xs font-mono text-muted-foreground break-all">
                {result.url}
              </div>
            </div>

            {result.features.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Analysis Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.features.slice(0, 6).map((feature, idx) => (
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
