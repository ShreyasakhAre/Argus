# Quick URL Detection Test Guide

## Testing the Fix

### Run Individual Test

```bash
# Test the specific serveo.net URL
npm test -- --testNamePattern="serveo.net"
```

### Expected Output

```
✅ PASS: should flag serveo.net tunnel as malicious/suspicious
  URL: https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net
  Risk Level: Suspicious (Score: 45-70)
  is_malicious: true
  Threat Reasons: 
    - Randomized subdomain on tunneling service
    - Abused infrastructure detected: tunneling
```

---

## Manual Testing via API

### Test the Scan Endpoint

```bash
# Test via API
curl -X POST http://localhost:3000/api/scan-link \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net"
  }'
```

### Expected Response

```json
{
  "url": "https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net",
  "is_malicious": true,
  "risk_score": 45,
  "risk_level": "Suspicious",
  "explanation": "This URL has some characteristics that warrant caution",
  "threat_reasons": [
    "Randomized subdomain on tunneling service - likely malicious C2 or phishing infrastructure",
    "Abused infrastructure detected: tunneling",
    "Tunneling service (serveo, ngrok, etc.) - frequently abused for malware/phishing"
  ],
  "features": {
    "is_risky_infrastructure": true,
    "entropy_score": 4.65,
    "is_hex_pattern": true,
    "suspicious_keywords_found": [],
    "suspicious_tld": false,
    "uses_ip_address": false,
    "url_shortener": false,
    "known_legitimate": false
  }
}
```

---

## Test Cases

### MALICIOUS URLs (Should Flag ✅)

```
https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net
https://ngrok.io/payload
https://bit.ly/login-verify
https://a1b2c3d4e5f6g7h8.ngrok.io
https://192.168.1.1/admin
https://example.com/download.exe
```

### LEGITIMATE URLs (Should NOT Flag ✅)

```
https://google.com
https://github.com/user/repo
https://microsoft.com/products
https://amazon.com/search
https://github.com
```

### SUSPICIOUS TLDs

```
https://example.xyz (risky)
https://phishing.top (risky)
https://scam.ml (risky)
https://badsite.tk (risky)
```

---

## Risk Score Reference

| Risk Level | Score Range | is_malicious | Action |
|-----------|------------|--------------|--------|
| Safe | 0-39 | false | Allow |
| Suspicious | 40-69 | true | Warn User |
| Critical | 70-100 | true | Block/Alert |

---

## Feature Scores

### Infrastructure Abuse Signals

| Signal | Points | Category |
|--------|--------|----------|
| Randomized subdomain + Tunneling | +45 | CRITICAL |
| Tunneling service (ngrok, serveo, etc.) | +25 | HIGH |
| URL Shortener + Keywords | +30-37 | HIGH |
| Dangerous executable | +40 | CRITICAL |

### Structural Signals

| Signal | Points | Trigger |
|--------|--------|---------|
| Hex-pattern subdomain | +15 | 12+ hex chars |
| High entropy subdomain | +20 | Shannon entropy > 4.2 |
| IP-based URL | +15 | Direct IP address |
| Double extension | +10 | file.pdf.exe pattern |

### Content Signals

| Signal | Points | Trigger |
|--------|--------|---------|
| Phishing keywords (1+) | +20 | Found 1+ keywords |
| Phishing keywords (3+) | +25 | Found 3+ keywords |
| Long URL | +12 | >100 characters |
| Many special chars | +8 | >5 special chars |

---

## Troubleshooting

### Issue: URL Still Shows as Safe

**Check**:
1. Is `isRiskyDomain()` returning true for the domain?
2. Is risk_score >= 40?
3. Is risk_level "SUSPICIOUS" or "CRITICAL"?
4. Is `is_malicious` being set correctly?

**Debug**:
```typescript
// Add debug output
const assessment = calculateRiskScore(url);
console.log('Risk Score:', assessment.finalScore);
console.log('Risk Level:', assessment.riskLevel);
console.log('Signals:', assessment.signals);
console.log('Reasons:', assessment.reasons);
```

### Issue: False Positive (Legitimate URL Flagged)

**Solution**:
- Add domain to `TRUSTED_DOMAINS` list in `riskyDomains.ts`
- Verify domain is not in `RISKY_DOMAINS` list
- Check entropy calculation for subdomains

---

## Performance Tips

### For Production Deployment

1. **Cache Risk Scores**
   - Cache scan results for 24 hours
   - Use URL hash as cache key

2. **Batch Processing**
   - Use `/api/scan-link` with `text` parameter for multiple URLs
   - API will extract and scan all URLs in one request

3. **ML Model Optimization**
   - Convert XGBoost model to ONNX format
   - Load model once at startup
   - Batch predict for efficiency

---

## Integration with Email Scanning

### When Scanning Email Content

```json
{
  "email_id": "email_123",
  "sender": "unknown@phishing.com",
  "content": "Click here to verify: https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net/verify",
  "action": "scan"
}
```

**System Will**:
1. Extract URL from content
2. Scan URL → Malicious (45 points)
3. Extract ML features:
   - has_urls: 1
   - has_suspicious_urls: 1
   - url_entropy_avg: 4.65
4. Combined email + URL analysis
5. Flag email as Suspicious/Critical

---

## Monitoring & Alerts

### Add to Your Monitoring

```
- Track URLs detected as malicious per day
- Monitor false positive rate
- Alert on new risky domain patterns
- Track ML model performance metrics
```

### Sample Query

```sql
SELECT 
  COUNT(*) as malicious_urls_detected,
  AVG(risk_score) as avg_risk_score,
  COUNT(CASE WHEN risk_level = 'Critical' THEN 1 END) as critical_threats
FROM link_scans
WHERE created_at >= NOW() - INTERVAL 1 DAY
```
