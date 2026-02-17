/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { scanLink } from './link-scanner';

/**
 * Link Scanner Test Suite
 * Verifies that malicious URLs are correctly classified
 */

describe('Link Scanner - Malicious URL Detection', () => {
  
  test('should flag serveo.net tunnel as malicious/suspicious', () => {
    const url = 'https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net';
    const result = scanLink(url);
    
    console.log('Testing serveo.net URL:', url);
    console.log('Result:', {
      is_malicious: result.is_malicious,
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      reasons: result.threat_reasons
    });
    
    // Should be flagged as malicious
    expect(result.is_malicious).toBe(true);
    
    // Should have high/suspicious risk score
    expect(result.risk_score).toBeGreaterThanOrEqual(40);
    
    // Should be SUSPICIOUS or CRITICAL
    expect(['Suspicious', 'Critical']).toContain(result.risk_level);
    
    // Should identify reasons related to serveo
    expect(result.threat_reasons.some(r => 
      r.includes('tunneling') || r.includes('infrastructure') || r.includes('serveo')
    )).toBe(true);
  });

  test('should flag ngrok URLs as malicious', () => {
    const url = 'https://malicious-subdomain.ngrok.io/payload';
    const result = scanLink(url);
    
    expect(result.is_malicious).toBe(true);
    expect(result.risk_score).toBeGreaterThanOrEqual(40);
    expect(['Suspicious', 'Critical']).toContain(result.risk_level);
  });

  test('should flag bit.ly shortener with phishing keywords as malicious', () => {
    const url = 'https://bit.ly/login-verify-account';
    const result = scanLink(url);
    
    expect(result.is_malicious).toBe(true);
    expect(result.risk_score).toBeGreaterThanOrEqual(40);
  });

  test('should flag hex-pattern subdomains as suspicious', () => {
    const url = 'https://a1b2c3d4e5f6g7h8.example.com';
    const result = scanLink(url);
    
    console.log('Hex pattern URL:', {
      is_malicious: result.is_malicious,
      risk_score: result.risk_score,
      entropy: result.features.entropy_score
    });
    
    expect(result.features.entropy_score).toBeGreaterThan(3.5);
  });

  test('should flag high-entropy subdomains as suspicious', () => {
    const url = 'https://qwerty.asdfgh.zxcvbn.example.com';
    const result = scanLink(url);
    
    expect(result.features.entropy_score).toBeGreaterThan(3.5);
  });

  test('should flag URL shorteners', () => {
    const shortenerUrls = [
      'https://tinyurl.com/abc123',
      'https://bit.ly/xyz789',
      'https://goo.gl/qwerty',
      'https://t.co/status123'
    ];

    shortenerUrls.forEach(url => {
      const result = scanLink(url);
      expect(result.features.url_shortener).toBe(true);
      expect(result.is_malicious).toBe(true);
    });
  });

  test('should flag IP-based URLs as suspicious', () => {
    const url = 'http://192.168.1.1/admin';
    const result = scanLink(url);
    
    expect(result.features.uses_ip_address).toBe(true);
    expect(result.is_malicious).toBe(true);
  });

  test('should flag dangerous file extensions', () => {
    const dangerousUrls = [
      'https://example.com/download.exe',
      'https://example.com/script.bat',
      'https://example.com/archive.zip'
    ];

    dangerousUrls.forEach(url => {
      const result = scanLink(url);
      expect(result.features.has_double_extension || 
              result.threat_reasons.some(r => r.includes('file'))).toBe(true);
    });
  });

  test('should flag suspicious TLDs', () => {
    const suspiciousUrls = [
      'https://example.xyz',
      'https://badsite.top',
      'https://phishing.ml',
      'https://scam.tk'
    ];

    suspiciousUrls.forEach(url => {
      const result = scanLink(url);
      expect(result.features.suspicious_tld).toBe(true);
    });
  });

  test('should NOT flag legitimate domains as malicious', () => {
    const legitimateUrls = [
      'https://google.com',
      'https://github.com',
      'https://microsoft.com',
      'https://amazon.com'
    ];

    legitimateUrls.forEach(url => {
      const result = scanLink(url);
      expect(result.features.known_legitimate).toBe(true);
      expect(result.risk_level).toBe('Safe');
    });
  });

  test('should provide detailed feature breakdown', () => {
    const url = 'https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net/payload';
    const result = scanLink(url);
    
    expect(result.feature_breakdown).toBeDefined();
    expect(result.feature_breakdown.length).toBeGreaterThan(0);
    expect(result.feature_breakdown[0]).toHaveProperty('feature');
    expect(result.feature_breakdown[0]).toHaveProperty('value');
    expect(result.feature_breakdown[0]).toHaveProperty('risk_impact');
    expect(result.feature_breakdown[0]).toHaveProperty('description');
  });
});

/**
 * Run tests with detailed logging
 */
export function testMaliciousURLDetection() {
  console.log('\n======= MALICIOUS URL DETECTION TEST =======\n');
  
  const testUrls = [
    {
      url: 'https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net',
      name: 'Serveo tunnel (CRITICAL)',
      expectedRisk: 'malicious'
    },
    {
      url: 'https://ngrok.io/phishing-login',
      name: 'ngrok tunnel with phishing keyword',
      expectedRisk: 'malicious'
    },
    {
      url: 'https://bit.ly/secure-verify-account',
      name: 'URL shortener with verification keyword',
      expectedRisk: 'malicious'
    },
    {
      url: 'https://google.com',
      name: 'Legitimate domain',
      expectedRisk: 'safe'
    }
  ];

  testUrls.forEach(({ url, name, expectedRisk }) => {
    const result = scanLink(url);
    const actual = result.is_malicious ? 'malicious' : 'safe';
    const status = actual === expectedRisk ? '✅ PASS' : '❌ FAIL';
    
    console.log(`${status} ${name}`);
    console.log(`  URL: ${url}`);
    console.log(`  Risk Level: ${result.risk_level} (Score: ${result.risk_score})`);
    console.log(`  Flagged as Malicious: ${result.is_malicious}`);
    console.log(`  Top Reasons: ${result.threat_reasons.slice(0, 2).join(' | ')}\n`);
  });
}
