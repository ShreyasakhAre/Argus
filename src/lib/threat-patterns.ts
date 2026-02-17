import type { Notification } from '@/lib/ml-service';

export interface ThreatPattern {
  id: string;
  type: 'coordinated_phishing' | 'domain_spoofing' | 'url_campaign';
  severity: 'low' | 'medium' | 'high';
  description: string;
  notifications: Notification[];
  detectedAt: Date;
}

export function detectThreatPatterns(notifications: Notification[]): ThreatPattern[] {
  const patterns: ThreatPattern[] = [];
  
  // Pattern 1: Coordinated phishing from same sender domain
  const domainGroups = notifications.reduce((groups, notification) => {
    const sender = notification.sender || '';
    const domain = sender.includes('@') ? sender.split('@')[1].toLowerCase() : 'unknown';
    
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  // Check for coordinated campaigns (3+ notifications from same domain within short time)
  Object.entries(domainGroups).forEach(([domain, domainNotifications]) => {
    if (domainNotifications.length >= 3 && domain !== 'unknown') {
      // Check if notifications are within a short time window (e.g., 1 hour)
      const timestamps = domainNotifications.map(n => new Date(n.timestamp || Date.now()).getTime());
      const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
      const oneHour = 60 * 60 * 1000;
      
      if (timeSpan <= oneHour) {
        patterns.push({
          id: `domain-${domain}`,
          type: 'coordinated_phishing',
          severity: 'high',
          description: `Potential coordinated phishing campaign from ${domain}`,
          notifications: domainNotifications,
          detectedAt: new Date()
        });
      }
    }
  });

  // Pattern 2: Same URL base across multiple notifications
  const urlGroups = notifications.reduce((groups, notification) => {
    const content = notification.content || '';
    const urlMatches = content.match(/https?:\/\/([^\/\s]+)/g);
    
    if (urlMatches) {
      urlMatches.forEach(url => {
        const domain = url.replace(/https?:\/\//, '').split('/')[0];
        if (!groups[domain]) {
          groups[domain] = [];
        }
        groups[domain].push(notification);
      });
    }
    return groups;
  }, {} as Record<string, Notification[]>);

  Object.entries(urlGroups).forEach(([domain, urlNotifications]) => {
    if (urlNotifications.length >= 3) {
      patterns.push({
        id: `url-${domain}`,
        type: 'url_campaign',
        severity: 'medium',
        description: `Multiple notifications referencing ${domain}`,
        notifications: urlNotifications,
        detectedAt: new Date()
      });
    }
  });

  return patterns;
}

export function getPatternBadge(pattern: ThreatPattern) {
  const colors = {
    low: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return {
    className: colors[pattern.severity],
    text: `⚠ ${pattern.description}`,
    severity: pattern.severity
  };
}
