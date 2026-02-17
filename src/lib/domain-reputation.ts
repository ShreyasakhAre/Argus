export interface DomainReputationScore {
  score: number;
  category: 'trusted' | 'neutral' | 'suspicious' | 'malicious';
  reason?: string;
}

// Simple domain reputation scoring
const domainReputation: Record<string, DomainReputationScore> = {
  // Trusted corporate domains
  "microsoft.com": { score: 0, category: 'trusted' },
  "google.com": { score: 0, category: 'trusted' },
  "amazon.com": { score: 0, category: 'trusted' },
  "apple.com": { score: 0, category: 'trusted' },
  "company.com": { score: 0, category: 'trusted' },
  "enterprise.com": { score: 0, category: 'trusted' },
  "corp.com": { score: 0, category: 'trusted' },
  
  // Common email providers (neutral)
  "gmail.com": { score: 10, category: 'neutral' },
  "yahoo.com": { score: 10, category: 'neutral' },
  "outlook.com": { score: 10, category: 'neutral' },
  "hotmail.com": { score: 10, category: 'neutral' },
  "icloud.com": { score: 10, category: 'neutral' },
  
  // Suspicious patterns
  "verify-secure.xyz": { score: 70, category: 'suspicious', reason: 'Suspicious TLD' },
  "secure-update.net": { score: 65, category: 'suspicious', reason: 'Impersonation attempt' },
  "account-security.info": { score: 60, category: 'suspicious', reason: 'Phishing pattern' },
  "verification-required.com": { score: 55, category: 'suspicious', reason: 'Social engineering' },
  
  // Known malicious patterns
  "malicious-site.ru": { score: 90, category: 'malicious', reason: 'Known malicious domain' },
  "phishing-attack.xyz": { score: 85, category: 'malicious', reason: 'Phishing domain' },
  "fake-security.org": { score: 80, category: 'malicious', reason: 'Impersonation domain' },
};

export function extractDomain(email: string): string {
  if (!email) return 'unknown';
  
  const emailMatch = email.toLowerCase().match(/@([^@\s]+)/);
  return emailMatch ? emailMatch[1] : 'unknown';
}

export function getDomainReputation(email: string): DomainReputationScore {
  const domain = extractDomain(email);
  
  // Check exact match first
  if (domainReputation[domain]) {
    return domainReputation[domain];
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\d{1,3}\.xyz$/, // Numbers + .xyz
    /secure.*\.(xyz|net|info)$/, // secure + suspicious TLD
    /verify.*\.(com|net|org)$/, // verify + common TLD
    /account.*security/i, // account security keywords
    /phishing|malware|fake/i, // Obvious malicious keywords
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(domain)) {
      return {
        score: 50,
        category: 'suspicious',
        reason: 'Suspicious domain pattern detected'
      };
    }
  }
  
  // Check for very new domains (less than 30 days old)
  const domainParts = domain.split('.');
  if (domainParts.length >= 2) {
    const tld = domainParts[domainParts.length - 1];
    const suspiciousTlds = ['xyz', 'top', 'click', 'download'];
    
    if (suspiciousTlds.includes(tld)) {
      return {
        score: 40,
        category: 'suspicious',
        reason: `Suspicious TLD: .${tld}`
      };
    }
  }
  
  // Default to neutral if no patterns match
  return {
    score: 15,
    category: 'neutral',
    reason: 'Unknown domain'
  };
}

export function getDomainRiskAdjustment(email: string): number {
  const reputation = getDomainReputation(email);
  return reputation.score;
}

export function getDomainRiskBadge(reputation: DomainReputationScore) {
  const colors = {
    trusted: 'bg-green-500/20 text-green-400 border-green-500/30',
    neutral: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    suspicious: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    malicious: 'bg-red-500/20 text-red-400 border-red-500/30'
  };
  
  return {
    className: colors[reputation.category],
    text: reputation.category === 'trusted' ? 'Trusted Domain' :
          reputation.category === 'neutral' ? 'Neutral Domain' :
          reputation.category === 'suspicious' ? 'Suspicious Domain' :
          'Malicious Domain',
    score: reputation.score,
    reason: reputation.reason
  };
}
