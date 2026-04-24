/**
 * Threat Intelligence Service
 * 
 * Provides threat intelligence data and analysis for IP addresses, domains, and events
 * Now integrated with datasetService to use real 10K dataset
 */

const datasetService = require("./datasetService");
const logger = require("../utils/logger");

class ThreatIntelligenceService {
  constructor() {
    this.threatFeeds = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this._initialized = false;
    // Don't initialize here - wait until dataset is ready
  }

  /**
   * Initialize threat intelligence feeds
   */
  initializeThreatFeeds() {
    // Skip if already initialized
    if (this._initialized) return;
    
    // Skip if dataset not ready yet (will retry later)
    if (!datasetService._ready) {
      logger.debug('DatasetService not ready yet, will retry threat feeds initialization later');
      return;
    }
    
    this._initialized = true;
    
    // Use real data from datasetService
    try {
      const dataset = datasetService.query({}, { limit: 10000 }).data;
      
      const maliciousIps = [];
      const maliciousDomains = [];
      const attackPatterns = [];
      
      // Helper to safely convert timestamp to date string
      const getDateString = (ts) => {
        try {
          if (!ts) return new Date().toISOString().split('T')[0];
          if (ts instanceof Date) return ts.toISOString().split('T')[0];
          if (typeof ts === 'string') return ts.split('T')[0];
          return new Date(ts).toISOString().split('T')[0];
        } catch (e) {
          return new Date().toISOString().split('T')[0];
        }
      };
      
      dataset.forEach(record => {
        if (record.is_malicious) {
          // Extract potential malicious indicators from sender domain
          const senderDomain = record.sender_domain || 'unknown';
          if (senderDomain && senderDomain !== 'unknown') {
            maliciousDomains.push({
              domain: senderDomain,
              type: record.threat_category || 'unknown',
              confidence: record.risk_score || 0.5,
              firstSeen: getDateString(record.timestamp)
            });
          }
          
          // Create attack patterns based on threat categories
          if (!attackPatterns.find(p => p.name === record.threat_category)) {
            attackPatterns.push({
              pattern: `TP${attackPatterns.length + 1}`,
              name: record.threat_category,
              description: `${record.threat_category} attack detected`,
              severity: record.risk_score > 0.7 ? 'critical' : record.risk_score > 0.4 ? 'high' : 'medium'
            });
          }
        }
      });
      
      this.threatFeeds.set('malicious_ips', maliciousIps);
      this.threatFeeds.set('malicious_domains', maliciousDomains);
      this.threatFeeds.set('attack_patterns', attackPatterns);
      
      logger.info(`Loaded ${maliciousDomains.length} malicious domains and ${attackPatterns.length} attack patterns from dataset`);
    } catch (error) {
      logger.error('Failed to initialize threat feeds from dataset:', error);
      // Fallback to minimal data
      this.threatFeeds.set('malicious_ips', []);
      this.threatFeeds.set('malicious_domains', []);
      this.threatFeeds.set('attack_patterns', []);
    }
  }

  /**
   * Ensure threat feeds are initialized (lazy load)
   */
  ensureInitialized() {
    if (!this._initialized) {
      this.initializeThreatFeeds();
    }
  }

  /**
   * Helper to safely convert timestamp to date string
   */
  getDateString(ts) {
    try {
      if (!ts) return new Date().toISOString().split('T')[0];
      if (ts instanceof Date) return ts.toISOString().split('T')[0];
      if (typeof ts === 'string') return ts.split('T')[0];
      return new Date(ts).toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Get threat intelligence for IP address
   */
  async getIpIntelligence(ip) {
    try {
      this.ensureInitialized();
      
      const cacheKey = `ip_${ip}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Use real dataset data to check for malicious indicators
      const dataset = datasetService.query({ sender_domain: ip }, { limit: 100 }).data;
      const maliciousRecords = dataset.filter(record => record.is_malicious);
      
      if (maliciousRecords.length > 0) {
        const latestRecord = maliciousRecords[0]; // Most recent
        return {
          ip,
          isThreat: true,
          threatData: {
            type: latestRecord.threat_category || 'unknown',
            confidence: latestRecord.risk_score || 0.5,
            firstSeen: this.getDateString(latestRecord.timestamp),
            recommendations: this.generateRecommendations(latestRecord.threat_category)
          },
          reputation: this.calculateIpReputation(ip),
          geolocation: await this.getIpGeolocation(ip),
          asn: await this.getIpAsn(ip),
          timestamp: new Date(),
          confidence: latestRecord.risk_score || 0.5
        };
      }

      return {
        ip,
        isThreat: false,
        threatData: null,
        reputation: this.calculateIpReputation(ip),
        geolocation: await this.getIpGeolocation(ip),
        asn: await this.getIpAsn(ip),
        timestamp: new Date(),
        confidence: 0
      };
    } catch (error) {
      logger.error(`Failed to get IP intelligence for ${ip}:`, error);
      return {
        ip,
        isThreat: false,
        threatData: null,
        reputation: 'unknown',
        geolocation: null,
        asn: null,
        timestamp: new Date(),
        confidence: 0
      };
    }
  }

  /**
   * Get threat intelligence for domain
   */
  async getDomainIntelligence(domain) {
    try {
      const cacheKey = `domain_${domain}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Use real dataset data to check for malicious indicators
      const dataset = datasetService.query({ sender_domain: domain }, { limit: 100 }).data;
      const maliciousRecords = dataset.filter(record => record.is_malicious);
      
      let threatData = null;
      if (maliciousRecords.length > 0) {
        const latestRecord = maliciousRecords[0]; // Most recent
        threatData = {
          type: latestRecord.threat_category || 'unknown',
          confidence: latestRecord.risk_score || 0.5,
          firstSeen: latestRecord.timestamp?.toISOString?.split('T')[0] || new Date().toISOString().split('T')[0]
        };
      }

      const intelligence = {
        domain,
        isThreat: !!threatData,
        threatData: threatData || null,
        reputation: this.calculateDomainReputation(domain),
        whois: await this.getDomainWhois(domain),
        subdomains: await this.getSubdomains(domain),
        timestamp: new Date(),
        confidence: threatData ? threatData.confidence : 0.1
      };

      this.setCachedData(cacheKey, intelligence);
      return intelligence;

    } catch (error) {
      logger.error(`Failed to get domain intelligence for ${domain}:`, error);
      return {
        domain,
        isThreat: false,
        threatData: null,
        reputation: 'unknown',
        whois: null,
        subdomains: [],
        timestamp: new Date(),
        confidence: 0
      };
    }
  }

  /**
   * Get threat intelligence for event/pattern
   */
  async getEventIntelligence(pattern, eventData = {}) {
    try {
      // Use real dataset data to find pattern matches
      const dataset = datasetService.query({ threat_category: pattern }, { limit: 100 }).data;
      
      const patternData = dataset.length > 0 ? {
        name: pattern,
        description: `${pattern} attack detected`,
        severity: dataset[0].risk_score > 0.7 ? 'critical' : dataset[0].risk_score > 0.4 ? 'high' : 'medium',
        count: dataset.length
      } : null;

      const intelligence = {
        pattern,
        patternData: patternData || null,
        relatedEvents: await this.getRelatedEvents(pattern),
        mitigationStrategies: this.getMitigationStrategies(pattern),
        iocIndicators: this.getIocIndicators(pattern),
        trending: await this.checkPatternTrending(pattern),
        timestamp: new Date(),
        confidence: patternData ? 0.85 : 0.3
      };

      return intelligence;

    } catch (error) {
      logger.error(`Failed to get event intelligence for ${pattern}:`, error);
      return {
        pattern,
        patternData: null,
        relatedEvents: [],
        mitigationStrategies: [],
        iocIndicators: [],
        trending: false,
        timestamp: new Date(),
        confidence: 0
      };
    }
  }

  /**
   * Get comprehensive threat intelligence for notification
   */
  async getNotificationIntelligence(notification) {
    try {
      const intelligence = {
        notificationId: notification._id || notification.id,
        timestamp: new Date(),
        indicators: [],
        overallRisk: 'low',
        confidence: 0
      };

      // IP intelligence
      if (notification.details?.sourceIP) {
        const ipIntel = await this.getIpIntelligence(notification.details.sourceIP);
        intelligence.indicators.push({
          type: 'ip',
          value: notification.details.sourceIP,
          intelligence: ipIntel
        });
      }

      // Domain intelligence
      if (notification.details?.senderEmail) {
        const domain = notification.details.senderEmail.split('@')[1];
        const domainIntel = await this.getDomainIntelligence(domain);
        intelligence.indicators.push({
          type: 'domain',
          value: domain,
          intelligence: domainIntel
        });
      }

      // Pattern intelligence
      if (notification.details?.pattern) {
        const eventIntel = await this.getEventIntelligence(notification.details.pattern, notification);
        intelligence.indicators.push({
          type: 'pattern',
          value: notification.details.pattern,
          intelligence: eventIntel
        });
      }

      // Calculate overall risk and confidence
      const threatIndicators = intelligence.indicators.filter(i => i.intelligence.isThreat);
      intelligence.overallRisk = threatIndicators.length > 0 ? 'high' : 'low';
      intelligence.confidence = intelligence.indicators.reduce((sum, i) => sum + i.intelligence.confidence, 0) / intelligence.indicators.length;

      return intelligence;

    } catch (error) {
      logger.error('Failed to get notification intelligence:', error);
      return {
        notificationId: notification._id || notification.id,
        indicators: [],
        overallRisk: 'unknown',
        confidence: 0,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Get threat intelligence summary
   */
  async getThreatSummary() {
    try {
      const summary = {
        totalThreats: 0,
        threatsByType: {},
        recentActivity: [],
        topThreats: [],
        timestamp: new Date()
      };

      // Count threats by type
      this.threatFeeds.forEach((feed, feedName) => {
        summary.totalThreats += feed.length;
        summary.threatsByType[feedName] = feed.length;
      });

      // Get recent activity (mock data)
      summary.recentActivity = [
        { type: 'ip', value: '192.168.1.100', action: 'blocked', timestamp: new Date(Date.now() - 3600000) },
        { type: 'domain', value: 'malicious-site.com', action: 'flagged', timestamp: new Date(Date.now() - 7200000) },
        { type: 'pattern', value: 'TP001', action: 'detected', timestamp: new Date(Date.now() - 10800000) }
      ];

      // Get top threats
      summary.topThreats = [
        { type: 'pattern', value: 'TP003', name: 'Ransomware', count: 45 },
        { type: 'pattern', value: 'TP001', name: 'CEO Fraud', count: 32 },
        { type: 'domain', value: 'malicious-site.com', name: 'Phishing Domain', count: 28 }
      ];

      return summary;

    } catch (error) {
      logger.error('Failed to get threat summary:', error);
      return {
        totalThreats: 0,
        threatsByType: {},
        recentActivity: [],
        topThreats: [],
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Helper methods
   */
  calculateIpReputation(ip) {
    // Mock IP reputation calculation
    const maliciousIps = this.threatFeeds.get('malicious_ips') || [];
    const isMalicious = maliciousIps.find(item => item.ip === ip);
    
    if (isMalicious) {
      return isMalicious.confidence > 0.9 ? 'very_malicious' : 'malicious';
    }
    
    // Simple heuristic for private IPs
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) {
      return 'private';
    }
    
    return 'neutral';
  }

  calculateDomainReputation(domain) {
    // Mock domain reputation calculation
    const maliciousDomains = this.threatFeeds.get('malicious_domains') || [];
    const isMalicious = maliciousDomains.find(item => item.domain === domain);
    
    if (isMalicious) {
      return isMalicious.confidence > 0.9 ? 'very_malicious' : 'malicious';
    }
    
    // Check for common legitimate domains
    const legitimateDomains = ['gmail.com', 'outlook.com', 'company.com', 'microsoft.com'];
    if (legitimateDomains.includes(domain.toLowerCase())) {
      return 'legitimate';
    }
    
    return 'neutral';
  }

  async getIpGeolocation(ip) {
    // Mock geolocation data
    const geoData = {
      '192.168.1.100': { country: 'Unknown', city: 'Private', lat: 0, lon: 0 },
      '10.0.0.50': { country: 'Unknown', city: 'Private', lat: 0, lon: 0 },
      '172.16.0.25': { country: 'Unknown', city: 'Private', lat: 0, lon: 0 }
    };
    
    return geoData[ip] || { country: 'Unknown', city: 'Unknown', lat: 0, lon: 0 };
  }

  async getIpAsn(ip) {
    // Mock ASN data
    const asnData = {
      '192.168.1.100': { asn: 'AS0', organization: 'Private', country: 'Unknown' },
      '10.0.0.50': { asn: 'AS0', organization: 'Private', country: 'Unknown' },
      '172.16.0.25': { asn: 'AS0', organization: 'Private', country: 'Unknown' }
    };
    
    return asnData[ip] || { asn: 'AS0', organization: 'Unknown', country: 'Unknown' };
  }

  async getDomainWhois(domain) {
    // Mock WHOIS data
    return {
      registrar: 'Mock Registrar',
      created: '2020-01-01',
      expires: '2025-01-01',
      status: 'active'
    };
  }

  async getSubdomains(domain) {
    // Mock subdomain data
    const subdomainData = {
      'malicious-site.com': ['www.malicious-site.com', 'mail.malicious-site.com'],
      'company.com': ['www.company.com', 'mail.company.com', 'vpn.company.com']
    };
    
    return subdomainData[domain] || [];
  }

  async getRelatedEvents(pattern) {
    // Mock related events
    return [
      { pattern: pattern, count: 15, timeframe: '24h' },
      { pattern: pattern, count: 45, timeframe: '7d' },
      { pattern: pattern, count: 120, timeframe: '30d' }
    ];
  }

  getMitigationStrategies(pattern) {
    const strategies = {
      'TP001': ['Verify sender identity', 'Contact executive directly', 'Implement email authentication'],
      'TP002': ['Enable MFA', 'Educate users', 'Implement advanced spam filtering'],
      'TP003': ['Backup critical data', 'Update antivirus', 'Network segmentation'],
      'TP004': ['Data loss prevention', 'Access controls', 'Audit logging']
    };
    
    return strategies[pattern] || ['Review security controls', 'Update policies'];
  }

  getIocIndicators(pattern) {
    const iocs = {
      'TP001': ['Suspicious email domains', 'Unusual request patterns', 'Executive impersonation'],
      'TP002': ['Fake login pages', 'Credential harvesting URLs', 'Phishing kits'],
      'TP003': ['Ransomware file extensions', 'Encryption algorithms', 'Payment addresses'],
      'TP004': ['Large data transfers', 'Unusual access patterns', 'Exfiltration tools']
    };
    
    return iocs[pattern] || ['Suspicious network traffic', 'Unusual user behavior'];
  }

  async checkPatternTrending(pattern) {
    // Mock trending check
    const trendingPatterns = ['TP001', 'TP003'];
    return trendingPatterns.includes(pattern);
  }

  getCachedData(key) {
    // Simple in-memory cache implementation
    return null; // Would implement actual caching
  }

  setCachedData(key, data) {
    // Simple in-memory cache implementation
    // Would implement actual caching with timeout
  }
}

// Singleton instance
const threatIntelligenceService = new ThreatIntelligenceService();

module.exports = {
  ThreatIntelligenceService,
  threatIntelligenceService
};
