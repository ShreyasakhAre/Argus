import { DatasetNotification, ThreatPattern } from './types';

export interface ExtendedThreatPattern extends ThreatPattern {
  notifications: DatasetNotification[];
}

export function detectThreatPatterns(notifications: DatasetNotification[]): ExtendedThreatPattern[] {
  const patterns: ExtendedThreatPattern[] = [];
  
  // Pattern 1: Coordinated phishing from same sender domain
  const domainGroups = notifications.reduce((groups, notification) => {
    const sender = notification.sender || '';
    const domain = sender.includes('@') ? sender.split('@')[1].toLowerCase() : 'unknown';
    
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(notification);
    return groups;
  }, {} as Record<string, DatasetNotification[]>);

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
          type: 'phishing_campaign',
          severity: 'high_risk_suspicious',
          confidence: 0.8,
          indicators: [domain],
          affected_entities: domainNotifications.map(n => n.receiver),
          timeline: {
            start: new Date(Math.min(...timestamps)).toISOString(),
            end: new Date(Math.max(...timestamps)).toISOString()
          },
          mitigation_strategies: [`Block domain ${domain}`, 'Increase monitoring', 'User education'],
          notifications: domainNotifications
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
  }, {} as Record<string, DatasetNotification[]>);

  Object.entries(urlGroups).forEach(([domain, urlNotifications]) => {
    if (urlNotifications.length >= 3) {
      patterns.push({
        id: `url-${domain}`,
        type: 'malware_distribution',
        severity: 'suspicious',
        confidence: 0.6,
        indicators: [domain],
        affected_entities: urlNotifications.map(n => n.receiver),
        timeline: {
          start: new Date(Math.min(...urlNotifications.map(n => new Date(n.timestamp).getTime()))).toISOString()
        },
        mitigation_strategies: [`Block ${domain}`, 'Scan all attachments', 'Network monitoring'],
        notifications: urlNotifications
      });
    }
  });

  // Pattern 3: BEC attacks targeting executives
  const becNotifications = notifications.filter(n => 
    n.threat_category === 'bec' && n.risk_score > 0.8
  );
  
  if (becNotifications.length >= 2) {
    patterns.push({
      id: 'bec-campaign',
      type: 'bec_attack',
      severity: 'critical',
      confidence: 0.9,
      indicators: ['High-value targets', 'Urgent requests', 'Financial themes'],
      affected_entities: becNotifications.map(n => n.receiver),
      timeline: {
        start: new Date(Math.min(...becNotifications.map(n => new Date(n.timestamp).getTime()))).toISOString()
      },
      mitigation_strategies: ['Executive verification', 'Financial controls', 'Enhanced monitoring'],
      notifications: becNotifications
    });
  }

  return patterns;
}

export function getPatternBadge(pattern: ExtendedThreatPattern) {
  const colors = {
    safe: 'bg-green-500/20 text-green-400 border-green-500/30',
    low_risk_suspicious: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    suspicious: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    high_risk_suspicious: 'bg-red-500/20 text-red-400 border-red-500/30',
    bec: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    ransomware: 'bg-red-600/20 text-red-500 border-red-600/30',
    phishing: 'bg-orange-600/20 text-orange-500 border-orange-600/30',
    critical: 'bg-red-700/20 text-red-600 border-red-700/30'
  };

  const typeLabels = {
    phishing_campaign: 'Phishing Campaign',
    bec_attack: 'BEC Attack',
    malware_distribution: 'Malware Distribution',
    data_exfiltration: 'Data Exfiltration'
  };

  return {
    className: colors[pattern.severity] || colors.suspicious,
    text: `⚠ ${typeLabels[pattern.type]} - ${pattern.affected_entities.length} targets`,
    severity: pattern.severity,
    confidence: pattern.confidence
  };
}
