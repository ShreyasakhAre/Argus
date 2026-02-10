import { 
  calculateRiskScore, 
  RiskAssessment, 
  getRiskLevelExplanation 
} from './security/riskScoring';
import {
  isRiskyDomain,
  isTrustedDomain,
  containsPhishingKeywords,
  containsDangerousExtension
} from './security/riskyDomains';

export interface URLFeatures {
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

export interface LinkScanResult {
  url: string;
  is_malicious: boolean;
  risk_score: number;
  risk_level: 'Safe' | 'Suspicious' | 'Critical';
  explanation: string;
  threat_reasons: string[];
  features: URLFeatures;
  feature_breakdown: {
    feature: string;
    value: string | number | boolean;
    risk_impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
}

/**
 * FEATURE EXTRACTION
 * Analyzes URL structure and extracts 20+ security-relevant features
 */
function extractFeatures(url: string): URLFeatures {
  const emptyFeatures: URLFeatures = {
    protocol: '',
    full_hostname: '',
    root_domain: '',
    subdomain: '',
    subdomain_length: 0,
    subdomain_levels: 0,
    entropy_score: 0,
    is_hex_pattern: false,
    suspicious_keywords_found: [],
    suspicious_tld: false,
    is_risky_infrastructure: false,
    url_length: url.length,
    special_char_ratio: 0,
    digit_ratio: 0,
    has_at_symbol: url.includes('@'),
    uses_ip_address: false,
    has_double_extension: false,
    dash_count: 0,
    uses_https: url.startsWith('https'),
    url_shortener: false,
    known_legitimate: false
  };

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith('http') ? url : `http://${url}`);
  } catch {
    return emptyFeatures;
  }

  const hostname = parsedUrl.hostname?.toLowerCase() || '';
  const fullUrl = parsedUrl.href.toLowerCase();
  const path = parsedUrl.pathname.toLowerCase();
  const search = parsedUrl.search.toLowerCase();

  // Extract hostname components
  const hostParts = hostname.split('.');
  const rootDomain = hostParts.slice(-2).join('.');
  const subdomainParts = hostParts.slice(0, -2);
  const subdomain = subdomainParts.join('.');

  // Calculate special character and digit ratios
  const specialChars = (url.match(/[@!#$%^&*()_+=\[\]{}|\\:;"'<>,?/]/g) || []).length;
  const digits = (url.match(/\d/g) || []).length;
  const special_char_ratio = url.length > 0 ? specialChars / url.length : 0;
  const digit_ratio = url.length > 0 ? digits / url.length : 0;

  // Calculate Shannon entropy of subdomain
  const calculateShannonEntropy = (str: string): number => {
    const len = str.length;
    if (len === 0) return 0;
    const freq: Record<string, number> = {};
    for (const char of str.toLowerCase()) {
      freq[char] = (freq[char] || 0) + 1;
    }
    let entropy = 0;
    for (const char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  };

  const entropyScore = subdomain.length > 0 ? calculateShannonEntropy(subdomain) : 0;

  // Check for hex-only pattern (ENHANCED: longer threshold for better detection)
  const isHexPattern = /^[a-f0-9]{12,}$/i.test(subdomain) && subdomain.length >= 12;

  // Find suspicious keywords including URL path and parameters
  const foundKeywords = [
    ...containsPhishingKeywords(fullUrl),
    ...(path.includes('malware') ? ['malware'] : []),
    ...(path.includes('payload') ? ['payload'] : []),
    ...(path.includes('shell') ? ['shell'] : []),
    ...(path.includes('admin') && !isTrustedDomain(hostname) ? ['admin'] : []),
    ...(path.includes('wp-admin') && !hostname.includes('wordpress.com') ? ['wp-admin'] : []),
    ...(path.includes('backdoor') ? ['backdoor'] : []),
    ...(search.includes('phishing') ? ['phishing'] : []),
  ];

  // Check for risky infrastructure (NOW CENTRALIZED)
  const isRiskyInfra = isRiskyDomain(hostname);

  // IP address detection
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const usesIp = ipPattern.test(hostname);

  // Double extension detection
  const hasDoubleExt = containsDangerousExtension(fullUrl) !== null;

  // Count dashes in hostname
  const dashCount = hostname.split('-').length - 1;

  // Check for suspicious TLD (simple heuristic)
  const suspiciousTlds = [
    '.xyz', '.top', '.club', '.work', '.click', '.link', '.gq', '.ml', '.cf',
    '.tk', '.ga', '.pw', '.cc', '.su', '.buzz', '.rest', '.fit',
    '.stream', '.download', '.review', '.men', '.date', '.webcam', '.loan',
    '.online', '.tech', '.website', '.site', '.space'
  ];
  const hasSuspiciousTld = suspiciousTlds.some(tld => hostname.endsWith(tld));

  // URL shortener detection
  const hasUrlShortener = /bit\.ly|goo\.gl|tinyurl|t\.co|ow\.ly|is\.gd|buff\.ly|adf\.ly|j\.mp|shorte\.st|tr\.im|v\.gd|tiny\.cc/i.test(hostname);

  // Legitimate domain check (NOW CENTRALIZED)
  const isLegit = isTrustedDomain(hostname);

  return {
    protocol: parsedUrl.protocol.replace(':', ''),
    full_hostname: hostname,
    root_domain: rootDomain,
    subdomain: subdomain,
    subdomain_length: subdomain.length,
    subdomain_levels: subdomainParts.length,
    entropy_score: parseFloat(entropyScore.toFixed(2)),
    is_hex_pattern: isHexPattern,
    suspicious_keywords_found: foundKeywords,
    suspicious_tld: hasSuspiciousTld,
    is_risky_infrastructure: isRiskyInfra,
    url_length: url.length,
    special_char_ratio: parseFloat(special_char_ratio.toFixed(3)),
    digit_ratio: parseFloat(digit_ratio.toFixed(3)),
    has_at_symbol: url.includes('@'),
    uses_ip_address: usesIp,
    has_double_extension: hasDoubleExt,
    dash_count: dashCount,
    uses_https: parsedUrl.protocol === 'https:',
    url_shortener: hasUrlShortener,
    known_legitimate: isLegit
  };
}

/**
 * GENERATE FEATURE BREAKDOWN
 * Converts features to UI table format
 */
function generateFeatureBreakdown(features: URLFeatures): LinkScanResult['feature_breakdown'] {
  const breakdown: LinkScanResult['feature_breakdown'] = [];

  breakdown.push({
    feature: 'Protocol',
    value: features.protocol.toUpperCase(),
    risk_impact: features.uses_https ? 'neutral' : 'positive',
    description: features.uses_https ? 'HTTPS (encrypted, but doesn\'t guarantee safety)' : 'HTTP (unencrypted)'
  });

  breakdown.push({
    feature: 'Hostname',
    value: features.full_hostname,
    risk_impact: 'neutral',
    description: 'Full domain name'
  });

  breakdown.push({
    feature: 'Root Domain',
    value: features.root_domain,
    risk_impact: features.known_legitimate ? 'negative' : 'neutral',
    description: features.known_legitimate ? 'Known legitimate domain' : 'Domain reputation unknown'
  });

  breakdown.push({
    feature: 'Risky Infrastructure',
    value: features.is_risky_infrastructure ? 'YES' : 'NO',
    risk_impact: features.is_risky_infrastructure ? 'positive' : 'negative',
    description: features.is_risky_infrastructure ? 'Abused hosting or tunnel detected' : 'Regular domain'
  });

  breakdown.push({
    feature: 'Suspicious Keywords',
    value: features.suspicious_keywords_found.length,
    risk_impact: features.suspicious_keywords_found.length > 0 ? 'positive' : 'negative',
    description: features.suspicious_keywords_found.length > 0 ? 
      `Found: ${features.suspicious_keywords_found.join(', ')}` : 'None detected'
  });

  breakdown.push({
    feature: 'URL Shortener',
    value: features.url_shortener ? 'YES' : 'NO',
    risk_impact: features.url_shortener ? 'positive' : 'negative',
    description: features.url_shortener ? 'Destination hidden' : 'Direct link'
  });

  breakdown.push({
    feature: 'Subdomain Entropy',
    value: features.entropy_score.toFixed(2),
    risk_impact: features.entropy_score > 4.2 ? 'positive' : features.entropy_score > 3.5 ? 'positive' : 'negative',
    description: features.entropy_score > 4.2 ? 'CRITICAL: Highly randomized' : 
                 features.entropy_score > 3.5 ? 'HIGH: Suspicious randomization' : 'Normal'
  });

  breakdown.push({
    feature: 'Hex Pattern',
    value: features.is_hex_pattern ? 'YES' : 'NO',
    risk_impact: features.is_hex_pattern ? 'positive' : 'negative',
    description: features.is_hex_pattern ? 'Bot-generated domain indicator' : 'Normal subdomain'
  });

  breakdown.push({
    feature: 'IP Address',
    value: features.uses_ip_address ? 'YES' : 'NO',
    risk_impact: features.uses_ip_address ? 'positive' : 'negative',
    description: features.uses_ip_address ? 'Direct IP (phishing technique)' : 'Uses domain name'
  });

  breakdown.push({
    feature: '@ Symbol',
    value: features.has_at_symbol ? 'YES' : 'NO',
    risk_impact: features.has_at_symbol ? 'positive' : 'negative',
    description: features.has_at_symbol ? 'Email spoofing detected' : 'Not present'
  });

  breakdown.push({
    feature: 'Double Extension',
    value: features.has_double_extension ? 'YES' : 'NO',
    risk_impact: features.has_double_extension ? 'positive' : 'negative',
    description: features.has_double_extension ? 'File spoofing technique' : 'Normal'
  });

  breakdown.push({
    feature: 'URL Length',
    value: features.url_length,
    risk_impact: features.url_length > 100 ? 'positive' : 'negative',
    description: features.url_length > 100 ? 'Unusually long (obfuscation)' : 'Normal length'
  });

  return breakdown;
}

/**
 * MAIN SCAN FUNCTION
 * Uses centralized risk scoring engine
 */
export function scanLink(url: string): LinkScanResult {
  try {
    const features = extractFeatures(url);
    const assessment = calculateRiskScore(url);
    
    // Determine risk level based on score
    let riskLevel: 'Safe' | 'Suspicious' | 'Critical' = 'Safe';
    
    if (assessment.finalScore >= 70) {
      riskLevel = 'Critical';
    } else if (assessment.finalScore >= 40) {
      riskLevel = 'Suspicious';
    }
    
    const explanation = getRiskLevelExplanation(riskLevel).description;
    const featureBreakdown = generateFeatureBreakdown(features);

    // Flag as malicious if:
    // 1. Risk score >= 40 (SUSPICIOUS or CRITICAL)
    // 2. Has risky domain infrastructure
    // 3. Has dangerous executable extensions
    const isRiskyInfra = features.is_risky_infrastructure;
    const hasDangerousExt = features.suspicious_keywords_found.some(k => 
      k.includes('.exe') || k.includes('.zip') || k.includes('.bat') || k.includes('.scr')
    );
    
    const is_malicious = 
      assessment.finalScore >= 40 ||
      isRiskyInfra ||
      hasDangerousExt;

    return {
      url,
      is_malicious,
      risk_score: assessment.finalScore,
      risk_level: riskLevel,
      explanation,
      threat_reasons: assessment.reasons.length > 0 ? assessment.reasons : ['No major threats detected'],
      features,
      feature_breakdown: featureBreakdown
    };
  } catch (error) {
    // Fallback for malformed URLs
    return {
      url,
      is_malicious: false,
      risk_score: 0,
      risk_level: 'Safe',
      explanation: 'Could not analyze URL',
      threat_reasons: [],
      features: {
        protocol: '',
        full_hostname: '',
        root_domain: '',
        subdomain: '',
        subdomain_length: 0,
        subdomain_levels: 0,
        entropy_score: 0,
        is_hex_pattern: false,
        suspicious_keywords_found: [],
        suspicious_tld: false,
        is_risky_infrastructure: false,
        url_length: url.length,
        special_char_ratio: 0,
        digit_ratio: 0,
        has_at_symbol: false,
        uses_ip_address: false,
        has_double_extension: false,
        dash_count: 0,
        uses_https: false,
        url_shortener: false,
        known_legitimate: false
      },
      feature_breakdown: []
    };
  }
}


/**
 * UTILITY FUNCTIONS
 */
export function extractUrlsFromText(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlPattern) || [];
  return [...new Set(matches)];
}

export function scanTextForLinks(text: string): LinkScanResult[] {
  const urls = extractUrlsFromText(text);
  return urls.map(url => scanLink(url));
}

