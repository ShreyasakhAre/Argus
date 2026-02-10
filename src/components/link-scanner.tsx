'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link2, Search, Shield, AlertTriangle, CheckCircle, Loader2, AlertCircle, Info } from 'lucide-react';

interface URLFeatures {
  protocol: string;
  full_hostname: string;
  root_domain: string;
  subdomain: string;
  subdomain_length: number;
  subdomain_levels: number;
  entropy_score: number;
  is_hex_pattern: boolean;
  suspicious_keywords_found: string[];
  suspicious_tld: boolean;
  is_risky_infrastructure: boolean;
  url_length: number;
  special_char_ratio: number;
  digit_ratio: number;
  has_at_symbol: boolean;
  uses_ip_address: boolean;
  has_double_extension: boolean;
  dash_count: number;
  uses_https: boolean;
  url_shortener: boolean;
  known_legitimate: boolean;
}

interface ScanResult {
  url: string;
  is_malicious: boolean;
  risk_score: number;
  risk_level: 'Safe' | 'Suspicious' | 'Critical';
  explanation: string;
  threat_reasons: string[];
  features: URLFeatures;
  feature_breakdown: Array<{
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
  const [showFullDetails, setShowFullDetails] = useState(false);

  const handleScan = async () => {
    if (!url.trim()) {
      setError('Please enter a URL to scan');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setShowFullDetails(false);

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

  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'Critical':
        return {
          color: 'text-red-500',
          bg: 'bg-red-500/20 border-red-500/30',
          badge: 'bg-red-500/20 text-red-500 border border-red-500/30',
          icon: AlertTriangle,
          label: '🚨 CRITICAL THREAT'
        };
      case 'Suspicious':
        return {
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/20 border-yellow-500/30',
          badge: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30',
          icon: AlertCircle,
          label: '⚠️ SUSPICIOUS'
        };
      default:
        return {
          color: 'text-green-500',
          bg: 'bg-green-500/20 border-green-500/30',
          badge: 'bg-green-500/20 text-green-500 border border-green-500/30',
          icon: CheckCircle,
          label: '✅ SAFE'
        };
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
            placeholder="Enter URL to scan (e.g., https://4be3c3c76fe71b2f.serveo.net)"
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
          <div className="bg-destructive/20 border border-destructive/30 text-destructive p-3 rounded-lg text-sm flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* VERDICT BADGE */}
            <div className={`p-4 rounded-lg border ${getRiskConfig(result.risk_level).bg}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  {result.risk_level === 'Critical' && (
                    <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 animate-pulse" />
                  )}
                  {result.risk_level === 'Suspicious' && (
                    <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0" />
                  )}
                  {result.risk_level === 'Safe' && (
                    <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                  )}
                  <div>
                    <div className={`font-bold text-lg ${getRiskConfig(result.risk_level).color}`}>
                      {getRiskConfig(result.risk_level).label}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Risk Score: {result.risk_score}%</div>
                  </div>
                </div>
                <Badge className={`${getRiskConfig(result.risk_level).badge} whitespace-nowrap`}>
                  {result.risk_level === 'Critical' && '🔴 CRITICAL'}
                  {result.risk_level === 'Suspicious' && '🟡 SUSPICIOUS'}
                  {result.risk_level === 'Safe' && '🟢 SAFE'}
                </Badge>
              </div>

              {/* MAIN EXPLANATION */}
              <p className="text-muted-foreground text-sm bg-muted/50 p-3 rounded border border-border">
                {result.explanation}
              </p>
            </div>

            {/* THREAT REASONS (if any) */}
            {result.threat_reasons.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Threat Detection Reasons
                </h4>
                <ul className="space-y-2">
                  {result.threat_reasons.map((reason, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-red-500 font-bold mt-0.5">→</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SCANNED URL */}
            <div className="bg-muted p-3 rounded-lg border border-border">
              <div className="text-xs text-muted-foreground mb-1">Scanned URL</div>
              <div className="text-xs font-mono text-foreground break-all font-semibold">{result.url}</div>
            </div>

            {/* FEATURE BREAKDOWN TABLE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Feature Analysis</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullDetails(!showFullDetails)}
                  className="text-xs h-6"
                >
                  {showFullDetails ? 'Show Less' : 'Show All Features'}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-muted-foreground font-medium">Feature</th>
                      <th className="text-left p-2 text-muted-foreground font-medium">Value</th>
                      <th className="text-left p-2 text-muted-foreground font-medium">Impact</th>
                      <th className="text-left p-2 text-muted-foreground font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showFullDetails 
                      ? result.feature_breakdown 
                      : result.feature_breakdown.slice(0, 8)
                    ).map((item, idx) => (
                      <tr 
                        key={idx} 
                        className={`border-b border-border/50 ${
                          item.risk_impact === 'positive' 
                            ? 'bg-red-500/10' 
                            : item.risk_impact === 'negative'
                            ? 'bg-green-500/10'
                            : ''
                        }`}
                      >
                        <td className="p-2 font-medium text-foreground">{item.feature}</td>
                        <td className="p-2 text-muted-foreground">
                          {typeof item.value === 'boolean' ? (item.value ? 'YES' : 'NO') : item.value}
                        </td>
                        <td className="p-2">
                          <span className={`text-xs font-semibold ${
                            item.risk_impact === 'positive' 
                              ? 'text-red-500' 
                              : item.risk_impact === 'negative'
                              ? 'text-green-500'
                              : 'text-muted-foreground'
                          }`}>
                            {item.risk_impact === 'positive' ? '⚠️ Risk' : item.risk_impact === 'negative' ? '✅ Safe' : '−'}
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!showFullDetails && result.feature_breakdown.length > 8 && (
                <div className="text-center text-xs text-muted-foreground p-2">
                  Showing 8 of {result.feature_breakdown.length} features
                </div>
              )}
            </div>

            {/* ENTROPY ANALYSIS FOR CRITICAL CASES */}
            {result.risk_level === 'Critical' && result.features.entropy_score > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                <h4 className="text-sm font-semibold text-red-500 mb-2">🔬 Entropy Analysis</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Subdomain Entropy: <span className="font-mono font-bold text-foreground">{result.features.entropy_score.toFixed(2)}</span> / 5.0</div>
                  <div className="text-xs">
                    {result.features.entropy_score > 4.2 && <span className="text-red-500">🚨 CRITICAL: Extremely high randomization</span>}
                    {result.features.entropy_score > 3.5 && result.features.entropy_score <= 4.2 && <span className="text-yellow-500">⚠️ HIGH: Suspicious randomization</span>}
                    {result.features.entropy_score <= 3.5 && <span className="text-green-500">✅ Normal: Natural domain structure</span>}
                  </div>
                  {result.features.is_hex_pattern && (
                    <div className="text-red-500 font-semibold mt-2">⛔ Hex-only pattern detected: {result.features.subdomain}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
