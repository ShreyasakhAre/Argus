/**
 * Scan Controller
 * Provides URL and QR code scanning functionality using pattern-based detection
 * NO external API calls. Uses rule-based analysis for demonstration.
 */

const logger = require('../utils/logger');

// URL scanning with pattern-based detection
async function scanLink(req, res) {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'URL is required and must be a string'
      });
    }

    const result = analyzeURL(url);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error('POST /api/scan-link error:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to scan URL' 
    });
  }
}

// QR code scanning endpoint
async function scanQR(req, res) {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // For demo purposes, simulate QR scanning
    // In production, you'd use a QR code library to decode the image
    const mockQRData = "https://example.com/redirect";
    const urlResult = analyzeURL(mockQRData);

    const result = {
      success: true,
      qr_data: mockQRData,
      is_url: true,
      scan_result: urlResult
    };

    return res.status(200).json(result);
  } catch (error) {
    logger.error('POST /api/scan-qr error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to scan QR code' 
    });
  }
}

// URL analysis function
function analyzeURL(url) {
  try {
    const features = extractURLFeatures(url);
    const riskScore = calculateRiskScore(features);
    const riskLevel = getRiskLevel(riskScore);
    const explanation = generateExplanation(features, riskLevel);
    const threatReasons = generateThreatReasons(features);

    return {
      url,
      is_malicious: riskLevel !== 'Safe',
      risk_score: Math.round(riskScore * 100),
      risk_level: riskLevel,
      explanation,
      threat_reasons: threatReasons,
      features,
      feature_breakdown: generateFeatureBreakdown(features)
    };
  } catch (error) {
    return {
      url,
      is_malicious: false,
      risk_score: 0,
      risk_level: 'Safe',
      explanation: 'Unable to analyze URL',
      threat_reasons: [],
      features: {},
      feature_breakdown: []
    };
  }
}

// Extract URL features for analysis
function extractURLFeatures(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const subdomain = hostname.split('.')[0];
    const domain = hostname.split('.').slice(-2).join('.');
    
    return {
      protocol: urlObj.protocol,
      full_hostname: hostname,
      root_domain: domain,
      subdomain: subdomain,
      subdomain_length: subdomain.length,
      subdomain_levels: hostname.split('.').length - 2,
      entropy_score: calculateEntropy(subdomain),
      is_hex_pattern: /^[0-9a-fA-F]+$/.test(subdomain),
      suspicious_keywords_found: findSuspiciousKeywords(url),
      suspicious_tld: isSuspiciousTLD(domain),
      is_risky_infrastructure: isRiskyInfrastructure(hostname),
      url_length: url.length,
      special_char_ratio: (url.match(/[^a-zA-Z0-9]/g) || []).length / url.length,
      digit_ratio: (url.match(/\d/g) || []).length / url.length,
      has_at_symbol: url.includes('@'),
      uses_ip_address: /^\d+\.\d+\.\d+\.\d+$/.test(hostname),
      has_double_extension: /\.(exe|zip|rar|tar|gz)\.(exe|zip|rar|tar|gz)$/i.test(url),
      dash_count: (url.match(/-/g) || []).length,
      uses_https: urlObj.protocol === 'https:',
      url_shortener: isURLShortener(hostname),
      known_legitimate: isKnownLegitimate(domain)
    };
  } catch (error) {
    return {
      protocol: 'unknown',
      full_hostname: 'unknown',
      root_domain: 'unknown',
      subdomain: 'unknown',
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
    };
  }
}

// Calculate Shannon entropy
function calculateEntropy(str) {
  const freq = {};
  for (let i = 0; i < str.length; i++) {
    freq[str[i]] = (freq[str[i]] || 0) + 1;
  }
  
  let entropy = 0;
  for (const char in freq) {
    const p = freq[char] / str.length;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// Find suspicious keywords
function findSuspiciousKeywords(url) {
  const suspicious = [
    'verify', 'secure', 'account', 'suspended', 'blocked', 'urgent', 
    'click', 'immediately', 'update', 'payment', 'invoice', 'paypal',
    'bank', 'login', 'signin', 'password', 'credential', 'phishing'
  ];
  
  return suspicious.filter(keyword => 
    url.toLowerCase().includes(keyword)
  );
}

// Check for suspicious TLDs
function isSuspiciousTLD(domain) {
  const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.biz', '.info'];
  return suspiciousTLDs.some(tld => domain.endsWith(tld));
}

// Check for risky infrastructure
function isRiskyInfrastructure(hostname) {
  const riskyPatterns = [
    /.*\.serveo\.net$/,
    /.*\.ngrok\.io$/,
    /.*\.localtunnel\.me$/,
    /.*\.xip\.io$/
  ];
  
  return riskyPatterns.some(pattern => pattern.test(hostname));
}

// Check if URL shortener
function isURLShortener(hostname) {
  const shorteners = [
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 
    'is.gd', 'buff.ly', 'adf.ly', 'bit.do', 'mcaf.ee'
  ];
  
  return shorteners.includes(hostname);
}

// Check if known legitimate
function isKnownLegitimate(domain) {
  const legitimate = [
    'google.com', 'microsoft.com', 'apple.com', 'amazon.com',
    'facebook.com', 'twitter.com', 'linkedin.com', 'github.com'
  ];
  
  return legitimate.includes(domain);
}

// Calculate risk score
function calculateRiskScore(features) {
  let score = 0;
  
  // High risk factors
  if (features.is_hex_pattern) score += 0.3;
  if (features.uses_ip_address) score += 0.25;
  if (features.suspicious_tld) score += 0.2;
  if (features.is_risky_infrastructure) score += 0.25;
  if (features.url_shortener) score += 0.15;
  if (features.has_double_extension) score += 0.2;
  
  // Medium risk factors
  if (features.entropy_score > 3.5) score += 0.15;
  if (features.subdomain_length > 20) score += 0.1;
  if (features.special_char_ratio > 0.3) score += 0.1;
  if (features.dash_count > 3) score += 0.1;
  
  // Low risk factors
  score += features.suspicious_keywords_found.length * 0.05;
  if (!features.uses_https) score += 0.05;
  if (features.has_at_symbol) score += 0.1;
  
  // Reduce risk for known legitimate
  if (features.known_legitimate) score *= 0.3;
  
  return Math.min(score, 1.0);
}

// Get risk level
function getRiskLevel(score) {
  if (score >= 0.7) return 'Critical';
  if (score >= 0.4) return 'Suspicious';
  return 'Safe';
}

// Generate explanation
function generateExplanation(features, riskLevel) {
  if (riskLevel === 'Critical') {
    return 'This URL exhibits multiple high-risk characteristics including suspicious patterns, potentially malicious infrastructure, or obfuscation techniques. Exercise extreme caution.';
  } else if (riskLevel === 'Suspicious') {
    return 'This URL contains some suspicious elements that warrant caution. While not definitively malicious, further verification is recommended.';
  } else {
    return 'This URL appears to follow standard patterns and does not exhibit obvious malicious characteristics.';
  }
}

// Generate threat reasons
function generateThreatReasons(features) {
  const reasons = [];
  
  if (features.is_hex_pattern) {
    reasons.push('Contains hexadecimal-only subdomain pattern commonly used in attacks');
  }
  if (features.uses_ip_address) {
    reasons.push('Uses direct IP address instead of domain name');
  }
  if (features.suspicious_tld) {
    reasons.push('Uses suspicious top-level domain associated with malicious activity');
  }
  if (features.is_risky_infrastructure) {
    reasons.push('Hosted on temporary tunneling services often used for attacks');
  }
  if (features.url_shortener) {
    reasons.push('Uses URL shortening service that obscures final destination');
  }
  if (features.entropy_score > 4.0) {
    reasons.push('High entropy indicates randomly generated domain');
  }
  
  return reasons;
}

// Generate feature breakdown
function generateFeatureBreakdown(features) {
  return [
    {
      feature: 'Protocol',
      value: features.protocol,
      risk_impact: features.uses_https ? 'negative' : 'positive',
      description: features.uses_https ? 'Secure HTTPS protocol' : 'Unsecure HTTP protocol'
    },
    {
      feature: 'Domain Length',
      value: features.subdomain_length,
      risk_impact: features.subdomain_length > 20 ? 'positive' : 'negative',
      description: features.subdomain_length > 20 ? 'Unusually long subdomain' : 'Normal domain length'
    },
    {
      feature: 'Entropy Score',
      value: features.entropy_score.toFixed(2),
      risk_impact: features.entropy_score > 3.5 ? 'positive' : 'negative',
      description: features.entropy_score > 3.5 ? 'High randomness detected' : 'Normal entropy level'
    },
    {
      feature: 'Hex Pattern',
      value: features.is_hex_pattern,
      risk_impact: features.is_hex_pattern ? 'positive' : 'negative',
      description: features.is_hex_pattern ? 'Hexadecimal-only pattern detected' : 'Normal character set'
    },
    {
      feature: 'IP Address',
      value: features.uses_ip_address,
      risk_impact: features.uses_ip_address ? 'positive' : 'negative',
      description: features.uses_ip_address ? 'Direct IP address usage' : 'Normal domain usage'
    },
    {
      feature: 'URL Shortener',
      value: features.url_shortener,
      risk_impact: features.url_shortener ? 'positive' : 'negative',
      description: features.url_shortener ? 'URL shortening service detected' : 'Direct URL'
    },
    {
      feature: 'Suspicious TLD',
      value: features.suspicious_tld,
      risk_impact: features.suspicious_tld ? 'positive' : 'negative',
      description: features.suspicious_tld ? 'Suspicious top-level domain' : 'Standard TLD'
    },
    {
      feature: 'Known Legitimate',
      value: features.known_legitimate,
      risk_impact: features.known_legitimate ? 'negative' : 'neutral',
      description: features.known_legitimate ? 'Known legitimate domain' : 'Unknown reputation'
    }
  ];
}

module.exports = {
  scanLink,
  scanQR
};
