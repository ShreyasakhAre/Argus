export interface LinkScanResult {
  url: string;
  is_malicious: boolean;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  explanation: string;
  features: {
    feature: string;
    value: string | number | boolean;
    risk_impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
}

const SUSPICIOUS_KEYWORDS = [
  'login', 'signin', 'verify', 'secure', 'account', 'update', 'confirm',
  'banking', 'paypal', 'amazon', 'microsoft', 'apple', 'google', 'netflix',
  'password', 'credential', 'suspended', 'urgent', 'expire', 'locked',
  'winner', 'prize', 'free', 'gift', 'claim', 'reward', 'lucky'
];

const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.club', '.work', '.click', '.link', '.gq', '.ml', '.cf',
  '.tk', '.ga', '.pw', '.cc', '.su', '.buzz', '.rest', '.fit'
];

const LEGITIMATE_DOMAINS = [
  'google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'github.com',
  'linkedin.com', 'facebook.com', 'twitter.com', 'youtube.com', 'netflix.com',
  'paypal.com', 'dropbox.com', 'slack.com', 'zoom.us', 'salesforce.com'
];

function extractFeatures(url: string): LinkScanResult['features'] {
  const features: LinkScanResult['features'] = [];
  
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith('http') ? url : `http://${url}`);
  } catch {
    return [{
      feature: 'invalid_url',
      value: true,
      risk_impact: 'positive',
      description: 'URL format is invalid'
    }];
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const fullUrl = parsedUrl.href.toLowerCase();
  const path = parsedUrl.pathname.toLowerCase();

  features.push({
    feature: 'url_length',
    value: url.length,
    risk_impact: url.length > 75 ? 'positive' : url.length > 50 ? 'neutral' : 'negative',
    description: url.length > 75 ? 'Unusually long URL (often used in phishing)' : 
                 url.length > 50 ? 'Moderate URL length' : 'Normal URL length'
  });

  const isHttps = parsedUrl.protocol === 'https:';
  features.push({
    feature: 'uses_https',
    value: isHttps,
    risk_impact: isHttps ? 'negative' : 'positive',
    description: isHttps ? 'Uses secure HTTPS protocol' : 'Missing HTTPS encryption'
  });

  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const usesIp = ipPattern.test(hostname);
  features.push({
    feature: 'uses_ip_address',
    value: usesIp,
    risk_impact: usesIp ? 'positive' : 'negative',
    description: usesIp ? 'Uses IP address instead of domain (suspicious)' : 'Uses domain name'
  });

  const foundKeywords = SUSPICIOUS_KEYWORDS.filter(kw => fullUrl.includes(kw));
  features.push({
    feature: 'suspicious_keywords',
    value: foundKeywords.length,
    risk_impact: foundKeywords.length > 2 ? 'positive' : foundKeywords.length > 0 ? 'neutral' : 'negative',
    description: foundKeywords.length > 0 ? 
      `Contains suspicious keywords: ${foundKeywords.slice(0, 3).join(', ')}` : 
      'No suspicious keywords detected'
  });

  const hasSuspiciousTld = SUSPICIOUS_TLDS.some(tld => hostname.endsWith(tld));
  features.push({
    feature: 'suspicious_tld',
    value: hasSuspiciousTld,
    risk_impact: hasSuspiciousTld ? 'positive' : 'negative',
    description: hasSuspiciousTld ? 'Uses suspicious top-level domain' : 'Uses common top-level domain'
  });

  const subdomainCount = hostname.split('.').length - 2;
  features.push({
    feature: 'subdomain_count',
    value: subdomainCount,
    risk_impact: subdomainCount > 2 ? 'positive' : subdomainCount > 1 ? 'neutral' : 'negative',
    description: subdomainCount > 2 ? 'Excessive subdomains (potential spoofing)' : 
                 subdomainCount > 1 ? 'Multiple subdomains' : 'Normal subdomain structure'
  });

  const specialChars = (url.match(/[@!#$%^&*()_+=\[\]{}|\\:;"'<>,?]/g) || []).length;
  features.push({
    feature: 'special_characters',
    value: specialChars,
    risk_impact: specialChars > 5 ? 'positive' : specialChars > 2 ? 'neutral' : 'negative',
    description: specialChars > 5 ? 'Many special characters (obfuscation attempt)' : 
                 specialChars > 2 ? 'Some special characters' : 'Minimal special characters'
  });

  const hasAtSymbol = url.includes('@');
  features.push({
    feature: 'contains_at_symbol',
    value: hasAtSymbol,
    risk_impact: hasAtSymbol ? 'positive' : 'negative',
    description: hasAtSymbol ? 'Contains @ symbol (URL spoofing technique)' : 'No @ symbol'
  });

  const hasShortenedPattern = /bit\.ly|goo\.gl|tinyurl|t\.co|ow\.ly|is\.gd|buff\.ly|adf\.ly|j\.mp/i.test(hostname);
  features.push({
    feature: 'url_shortener',
    value: hasShortenedPattern,
    risk_impact: hasShortenedPattern ? 'neutral' : 'negative',
    description: hasShortenedPattern ? 'Uses URL shortening service (hides destination)' : 'Direct URL'
  });

  const isLegitimate = LEGITIMATE_DOMAINS.some(domain => 
    hostname === domain || hostname.endsWith(`.${domain}`)
  );
  features.push({
    feature: 'known_legitimate',
    value: isLegitimate,
    risk_impact: isLegitimate ? 'negative' : 'neutral',
    description: isLegitimate ? 'Recognized legitimate domain' : 'Unknown domain reputation'
  });

  const hasDoubleExtension = /\.(exe|zip|rar|js|vbs|bat|cmd|scr|pif)\./i.test(path);
  features.push({
    feature: 'double_extension',
    value: hasDoubleExtension,
    risk_impact: hasDoubleExtension ? 'positive' : 'negative',
    description: hasDoubleExtension ? 'Suspicious double file extension' : 'Normal file extension'
  });

  const dashCount = hostname.split('-').length - 1;
  features.push({
    feature: 'excessive_dashes',
    value: dashCount,
    risk_impact: dashCount > 3 ? 'positive' : dashCount > 1 ? 'neutral' : 'negative',
    description: dashCount > 3 ? 'Excessive dashes in domain (typosquatting indicator)' : 
                 dashCount > 1 ? 'Some dashes in domain' : 'Normal domain format'
  });

  return features;
}

function calculateRiskScore(features: LinkScanResult['features']): number {
  const weights: Record<string, number> = {
    invalid_url: 0.95,
    uses_ip_address: 0.25,
    uses_https: -0.15,
    suspicious_keywords: 0.08,
    suspicious_tld: 0.20,
    subdomain_count: 0.05,
    special_characters: 0.03,
    contains_at_symbol: 0.20,
    url_shortener: 0.10,
    known_legitimate: -0.30,
    double_extension: 0.25,
    excessive_dashes: 0.05,
    url_length: 0.02
  };

  let score = 0.3;

  for (const feature of features) {
    const weight = weights[feature.feature] || 0;
    
    if (typeof feature.value === 'boolean') {
      score += feature.value ? weight : 0;
    } else if (typeof feature.value === 'number') {
      score += Math.min(feature.value * weight, weight * 5);
    }
  }

  return Math.max(0, Math.min(1, score));
}

function generateExplanation(features: LinkScanResult['features'], riskScore: number): string {
  const highRiskFeatures = features.filter(f => f.risk_impact === 'positive');
  const safeFeatures = features.filter(f => f.risk_impact === 'negative');

  if (riskScore >= 0.7) {
    const reasons = highRiskFeatures.slice(0, 3).map(f => f.description.toLowerCase()).join(', ');
    return `This URL is likely malicious. Key indicators: ${reasons}. Exercise extreme caution and avoid clicking.`;
  } else if (riskScore >= 0.4) {
    const concerns = highRiskFeatures.slice(0, 2).map(f => f.description.toLowerCase()).join(', ');
    return `This URL shows some suspicious characteristics: ${concerns}. Verify the source before proceeding.`;
  } else {
    const positives = safeFeatures.slice(0, 2).map(f => f.description.toLowerCase()).join(', ');
    return `This URL appears relatively safe. Positive indicators: ${positives}. Standard security practices still recommended.`;
  }
}

export function scanLink(url: string): LinkScanResult {
  const features = extractFeatures(url);
  const riskScore = calculateRiskScore(features);
  const isMalicious = riskScore >= 0.6;
  const riskLevel = riskScore >= 0.7 ? 'High' : riskScore >= 0.4 ? 'Medium' : 'Low';
  const explanation = generateExplanation(features, riskScore);

  return {
    url,
    is_malicious: isMalicious,
    risk_score: Math.round(riskScore * 100) / 100,
    risk_level: riskLevel,
    explanation,
    features: features.filter(f => f.risk_impact !== 'neutral' || f.value)
  };
}

export function extractUrlsFromText(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlPattern) || [];
  return [...new Set(matches)];
}

export function scanTextForLinks(text: string): LinkScanResult[] {
  const urls = extractUrlsFromText(text);
  return urls.map(url => scanLink(url));
}
