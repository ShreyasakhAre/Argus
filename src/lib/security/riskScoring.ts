/**
 * RISK SCORING ENGINE
 * 
 * Combines multiple signals to produce ML-ready, explainable risk scores
 * 
 * Scoring approach:
 * - Add points for dangerous signals
 * - Subtract points for safe indicators
 * - Never allow HTTPS alone to reduce overall risk
 */

import {
  isRiskyDomain,
  isTrustedDomain,
  containsPhishingKeywords,
  containsDangerousExtension,
  getRiskyDomainCategory,
} from "./riskyDomains";

export interface RiskSignal {
  signal: string;
  points: number;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface RiskAssessment {
  baseScore: number;
  signals: RiskSignal[];
  finalScore: number;
  riskLevel: "SAFE" | "SUSPICIOUS" | "CRITICAL";
  reasons: string[];
  confidence: number;
}

/**
 * RISK CLASSIFICATION THRESHOLDS
 */
const RISK_THRESHOLDS = {
  SAFE: { min: 0, max: 39 },
  SUSPICIOUS: { min: 40, max: 69 },
  CRITICAL: { min: 70, max: 100 },
};

/**
 * SCORING CONSTANTS
 */
const SCORES = {
  // Critical signals (+30-40 points)
  DANGEROUS_EXTENSION: 40,
  RISKY_DOMAIN_WITH_KEYWORDS: 35,
  RISKY_DOMAIN_ALONE: 25,
  URL_SHORTENER: 30,

  // High signals (+15-25 points)
  PHISHING_KEYWORDS_ALONE: 20,
  MULTIPLE_PHISHING_KEYWORDS: 25,
  SUSPICIOUS_ENTROPY: 20,
  DYNAMIC_DNS: 20,

  // Medium signals (+10-15 points)
  SUSPICIOUS_HOSTNAME_PATTERN: 15,
  IP_ADDRESS_BASED: 15,
  VERY_LONG_URL: 12,
  DOUBLE_EXTENSION: 10,

  // Low signals (+5-10 points)
  MANY_SPECIAL_CHARS: 8,
  REDIRECT_PARAMETER: 5,

  // Safe adjustments (-5-10 points)
  HTTPS_NEUTRAL: 0, // No points, but doesn't reduce score
  TRUSTED_DOMAIN: -10,
  KNOWN_LEGITIMATE: -15,

  // Escalation multiplier
  RISKY_PLUS_KEYWORDS_MULTIPLIER: 1.5,
};

/**
 * Calculate risk score from multiple signals
 */
export function calculateRiskScore(url: string): RiskAssessment {
  const signals: RiskSignal[] = [];
  let baseScore = 0;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    const search = urlObj.search.toLowerCase();
    const protocol = urlObj.protocol;
    const full = url.toLowerCase();

    // ============================================
    // SIGNAL 0: RISKY INFRASTRUCTURE + RANDOMIZED SUBDOMAIN (HIGHEST PRIORITY)
    // ============================================
    const isRisky = isRiskyDomain(hostname);
    const riskyCategory = getRiskyDomainCategory(hostname);
    
    if (isRisky) {
      // For tunneling/shortener services, check for randomized/hex patterns in subdomain
      const hostParts = hostname.split('.');
      const mainDomain = hostParts.slice(-2).join('.');
      
      // Extract the subdomain that appears before the risky domain
      if (hostParts.length > 2) {
        const suspiciousSubdomain = hostParts[0];
        // Check if subdomain is hex-like or random (common in tunneling abuse)
        const isHexLike = /^[a-f0-9]{10,}$/i.test(suspiciousSubdomain);
        const isRandomLike = /^[a-z0-9]{15,}$/.test(suspiciousSubdomain) && 
                             suspiciousSubdomain.length > 12;
        
        if ((isHexLike || isRandomLike) && riskyCategory === 'tunneling') {
          // Randomized subdomain on tunneling service = CRITICAL
          signals.push({
            signal: 'random_subdomain_tunneling',
            points: 45, // HIGHEST PENALTY
            description: `Randomized subdomain (${suspiciousSubdomain}) on tunneling service (${riskyCategory}) - likely malicious C2 or phishing infrastructure`,
            severity: 'critical',
          });
          baseScore += 45;
        }
      }
    }

    // ============================================
    // SIGNAL 1: DANGEROUS FILE EXTENSION
    // ============================================
    const dangerousExt = containsDangerousExtension(full);
    if (dangerousExt) {
      signals.push({
        signal: "dangerous_extension",
        points: SCORES.DANGEROUS_EXTENSION,
        description: `Dangerous file extension detected: ${dangerousExt}`,
        severity: "critical",
      });
      baseScore += SCORES.DANGEROUS_EXTENSION;
    }

    // ============================================
    // SIGNAL 2: RISKY DOMAIN DETECTION
    // ============================================
    if (isRisky) {
      // Check for phishing keywords
      const keywords = containsPhishingKeywords(full);

      if (keywords.length > 0) {
        // Risky domain + keywords = escalate
        const escalatedScore = Math.round(SCORES.RISKY_DOMAIN_ALONE * SCORES.RISKY_PLUS_KEYWORDS_MULTIPLIER);
        signals.push({
          signal: "risky_domain_with_keywords",
          points: escalatedScore,
          description: `Risky infrastructure (${riskyCategory}) combined with phishing keywords: ${keywords.join(", ")}`,
          severity: "critical",
        });
        baseScore += escalatedScore;
      } else {
        // Risky domain alone
        signals.push({
          signal: "risky_domain",
          points: SCORES.RISKY_DOMAIN_ALONE,
          description: `Abused infrastructure detected: ${riskyCategory}`,
          severity: "high",
        });
        baseScore += SCORES.RISKY_DOMAIN_ALONE;
      }

      // Additional penalty for URL shorteners
      if (riskyCategory === "shortener") {
        signals.push({
          signal: "url_shortener",
          points: SCORES.URL_SHORTENER,
          description: "URL shortener hides true destination",
          severity: "high",
        });
        baseScore += SCORES.URL_SHORTENER;
      }
      
      // Additional penalty for tunneling services
      if (riskyCategory === "tunneling") {
        signals.push({
          signal: "tunneling_service",
          points: 25,
          description: "Tunneling service (serveo, ngrok, etc.) - frequently abused for malware/phishing",
          severity: "high",
        });
        baseScore += 25;
      }
    }

    // ============================================
    // SIGNAL 3: PHISHING KEYWORDS (without risky domain)
    // ============================================
    if (!isRisky) {
      const keywords = containsPhishingKeywords(full);
      if (keywords.length > 0) {
        const points =
          keywords.length > 2
            ? SCORES.MULTIPLE_PHISHING_KEYWORDS
            : SCORES.PHISHING_KEYWORDS_ALONE;
        signals.push({
          signal: "phishing_keywords",
          points,
          description: `Social-engineering keywords detected: ${keywords.join(", ")}`,
          severity: keywords.length > 2 ? "high" : "medium",
        });
        baseScore += points;
      }
    }

    // ============================================
    // SIGNAL 4: SUSPICIOUS HOSTNAME PATTERNS
    // ============================================
    if (!isTrustedDomain(hostname)) {
      // Check for hexadecimal-only subdomain (bot-generated)
      const parts = hostname.split(".");
      if (parts.length > 1) {
        const subdomain = parts[0];
        if (/^[a-f0-9]{16,}$/.test(subdomain)) {
          signals.push({
            signal: "hex_subdomain",
            points: SCORES.SUSPICIOUS_HOSTNAME_PATTERN,
            description: "Hexadecimal-only subdomain pattern (bot-generated domain indicator)",
            severity: "high",
          });
          baseScore += SCORES.SUSPICIOUS_HOSTNAME_PATTERN;
        }
      }

      // Check for IP-based URL
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname)) {
        signals.push({
          signal: "ip_based",
          points: SCORES.IP_ADDRESS_BASED,
          description: "IP address instead of domain name",
          severity: "high",
        });
        baseScore += SCORES.IP_ADDRESS_BASED;
      }
    }

    // ============================================
    // SIGNAL 5: URL LENGTH & COMPLEXITY
    // ============================================
    if (url.length > 100) {
      signals.push({
        signal: "long_url",
        points: SCORES.VERY_LONG_URL,
        description: `Unusually long URL (${url.length} characters) - may hide malicious content`,
        severity: "low",
      });
      baseScore += SCORES.VERY_LONG_URL;
    }

    // ============================================
    // SIGNAL 6: SPECIAL CHARACTERS & OBFUSCATION
    // ============================================
    const specialCharCount = (full.match(/[!@#$%^&*()_+=\[\]{};:'",.<>?\\|~`]/g) || [])
      .length;
    if (specialCharCount > 5) {
      signals.push({
        signal: "many_special_chars",
        points: SCORES.MANY_SPECIAL_CHARS,
        description: `Excessive special characters (${specialCharCount}) - possible obfuscation`,
        severity: "low",
      });
      baseScore += SCORES.MANY_SPECIAL_CHARS;
    }

    // ============================================
    // SIGNAL 7: DOUBLE EXTENSION
    // ============================================
    if (/\.\w+\.\w+$/.test(pathname)) {
      signals.push({
        signal: "double_extension",
        points: SCORES.DOUBLE_EXTENSION,
        description: "Double file extension (e.g., file.pdf.exe) - common spoofing technique",
        severity: "medium",
      });
      baseScore += SCORES.DOUBLE_EXTENSION;
    }

    // ============================================
    // SIGNAL 8: REDIRECT PARAMETERS
    // ============================================
    if (search.includes("redirect=") || search.includes("url=") || search.includes("goto=")) {
      signals.push({
        signal: "redirect_param",
        points: SCORES.REDIRECT_PARAMETER,
        description: "Redirect parameter detected - may lead to external malicious site",
        severity: "low",
      });
      baseScore += SCORES.REDIRECT_PARAMETER;
    }

    // ============================================
    // SAFE ADJUSTMENTS
    // ============================================
    let safeAdjustment = 0;

    // Trusted domain gets slight penalty reduction
    if (isTrustedDomain(hostname)) {
      signals.push({
        signal: "trusted_domain",
        points: SCORES.TRUSTED_DOMAIN,
        description: "Known trusted domain - reduces risk",
        severity: "low",
      });
      safeAdjustment += SCORES.TRUSTED_DOMAIN;
    }

    // HTTPS is neutral - doesn't reduce risk
    if (protocol === "https:") {
      signals.push({
        signal: "https_protocol",
        points: SCORES.HTTPS_NEUTRAL,
        description: "HTTPS protocol used (neutral - doesn't guarantee safety)",
        severity: "low",
      });
    }

    // ============================================
    // FINAL SCORE CALCULATION
    // ============================================
    let finalScore = Math.max(0, Math.min(100, baseScore + safeAdjustment));

    // Dangerous extension always critical regardless of domain
    if (dangerousExt && finalScore < 70) {
      finalScore = Math.max(finalScore, 75);
    }

    // Risky domain + keywords always suspicious at minimum
    if (isRisky && containsPhishingKeywords(full).length > 0 && finalScore < 60) {
      finalScore = Math.max(finalScore, 65);
    }

    // ============================================
    // CLASSIFICATION
    // ============================================
    let riskLevel: "SAFE" | "SUSPICIOUS" | "CRITICAL" = "SAFE";
    if (finalScore >= RISK_THRESHOLDS.CRITICAL.min) {
      riskLevel = "CRITICAL";
    } else if (finalScore >= RISK_THRESHOLDS.SUSPICIOUS.min) {
      riskLevel = "SUSPICIOUS";
    }

    // ============================================
    // BUILD REASONS LIST
    // ============================================
    const reasons = signals
      .filter((s) => s.points !== 0) // Exclude neutral signals
      .sort((a, b) => b.points - a.points) // Sort by impact
      .map((s) => s.description);

    // ============================================
    // CONFIDENCE SCORE
    // ============================================
    // More signals = higher confidence
    const confidence = Math.min(0.99, 0.6 + signals.length * 0.05);

    return {
      baseScore,
      signals,
      finalScore,
      riskLevel,
      reasons,
      confidence,
    };
  } catch (error) {
    // Invalid URL - treat as suspicious
    return {
      baseScore: 0,
      signals: [
        {
          signal: "invalid_url",
          points: 30,
          description: "Invalid or malformed URL",
          severity: "medium",
        },
      ],
      finalScore: 50,
      riskLevel: "SUSPICIOUS",
      reasons: ["Invalid or malformed URL"],
      confidence: 0.7,
    };
  }
}

/**
 * Get detailed explanation for a risk level
 */
export function getRiskLevelExplanation(level: "Safe" | "Suspicious" | "Critical" | "SAFE" | "SUSPICIOUS" | "CRITICAL"): {
  label: string;
  color: string;
  icon: string;
  description: string;
} {
  const levelUpper = String(level).toUpperCase() as "SAFE" | "SUSPICIOUS" | "CRITICAL";
  
  const explanations = {
    SAFE: {
      label: "Safe",
      color: "green",
      icon: "✅",
      description: "This URL appears to be legitimate and safe to visit",
    },
    SUSPICIOUS: {
      label: "Suspicious",
      color: "yellow",
      icon: "⚠️",
      description: "This URL has some characteristics that warrant caution",
    },
    CRITICAL: {
      label: "Critical",
      color: "red",
      icon: "🚨",
      description: "This URL shows strong indicators of malicious intent - avoid visiting",
    },
  };

  return explanations[levelUpper];
}

/**
 * Export for testing - visibility into scoring decisions
 */
export function debugRiskScore(url: string): string {
  const assessment = calculateRiskScore(url);
  return JSON.stringify(assessment, null, 2);
}
