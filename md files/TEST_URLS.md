# ARGUS Professional Security Platform - Test Cases

## 🚨 CRITICAL Risk URLs (Risk Score ≥ 70)

These URLs have **CRITICAL** threat indicators and should be flagged as such:

### 1. Random Hex + Risky Infrastructure
```
https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net
```
**Expected Result:**
- Risk Level: **CRITICAL**
- Risk Score: **80-95**
- Threat Reasons:
  - Random hexadecimal pattern detected in subdomain
  - Critical entropy level detected (highly randomized subdomain)
  - Temporary tunnel or free hosting infrastructure detected

---

## ⚠️ SUSPICIOUS Risk URLs (Risk Score 40-69)

These URLs have **SUSPICIOUS** indicators:

### 2. High Entropy + Risky Infrastructure
```
https://xzjkqwpvmnbdkslx.ngrok.io/admin
```
**Expected Result:**
- Risk Level: **SUSPICIOUS**
- Risk Score: **50-65**
- Threat Reasons:
  - High entropy detected in subdomain
  - Temporary tunnel or free hosting infrastructure detected

### 3. Suspicious Keywords + Shortened URL
```
https://bit.ly/login-verify-account-12345
```
**Expected Result:**
- Risk Level: **SUSPICIOUS**
- Risk Score: **40-55**
- Threat Reasons:
  - Multiple phishing keywords detected: login, verify, account
  - URL shortening service used (destination hidden)

### 4. IP-based URL (Always Suspicious)
```
http://192.168.1.100:8080/banking/login
```
**Expected Result:**
- Risk Level: **SUSPICIOUS**
- Risk Score: **45-60**
- Threat Reasons:
  - Direct IP address used instead of domain (phishing technique)

---

## 🟢 SAFE URLs (Risk Score 0-39)

These URLs should be flagged as **SAFE**:

### 5. Legitimate Google
```
https://www.google.com
```
**Expected Result:**
- Risk Level: **SAFE**
- Risk Score: **5-15**
- Description: Known legitimate domain

### 6. Legitimate GitHub
```
https://github.com/torvalds/linux
```
**Expected Result:**
- Risk Level: **SAFE**
- Risk Score: **10-20**
- Description: Known legitimate domain

### 7. Legitimate Microsoft
```
https://outlook.microsoft.com/mail
```
**Expected Result:**
- Risk Level: **SAFE**
- Risk Score: **5-15**
- Description: Known legitimate domain

### 8. Normal HTTPS Domain
```
https://example.com
```
**Expected Result:**
- Risk Level: **SAFE**
- Risk Score: **15-25**
- Description: Normal domain with HTTPS

---

## 🧪 Testing Instructions

1. Open ARGUS: `http://localhost:3000`
2. Navigate to **Scanners → Link Scanner**
3. Copy/paste test URLs from above
4. Click **🔍 Scan**
5. Verify:
   - Risk Score matches expected range
   - Threat Level is correct
   - Threat Reasons are displayed
   - Feature breakdown shows analysis details

---

## 🎯 Expected Behaviors

### For CRITICAL URLs:
✅ Red verdict badge: "🚨 CRITICAL THREAT"
✅ Risk score 80+ 
✅ Multiple threat reasons listed
✅ Entropy analysis panel shows high entropy (>4.2)
✅ If hex pattern: Shows "⛔ Hex-only pattern detected"

### For SUSPICIOUS URLs:
✅ Yellow verdict badge: "⚠️ SUSPICIOUS"
✅ Risk score 40-69
✅ 2-3 threat reasons listed
✅ Feature table highlights risk indicators

### For SAFE URLs:
✅ Green verdict badge: "✅ SAFE"
✅ Risk score 0-39
✅ Minimal threat reasons
✅ Known legitimate domain indication

---

## 📊 Feature Analysis Table

Each scan should display a detailed table showing:

| Feature | Value | Impact | Description |
|---------|-------|--------|-------------|
| Protocol | https | neutral | HTTPS (encrypted) |
| Hostname | domain.com | neutral | Full domain name |
| Root Domain | domain.com | positive/negative | Domain reputation |
| Subdomain Entropy | 4.5 | positive | CRITICAL: Highly randomized |
| Hex Pattern | YES | positive | Hexadecimal-only subdomain |
| Suspicious Keywords | 3 | positive | Found: login, verify, account |
| Risky Infrastructure | YES | positive | Temporary hosting detected |
| URL Length | 67 | negative | Normal length |
| IP Address | NO | negative | Uses domain name |

---

## 🔍 ML Dataset Integration

All scanned URLs are automatically:
1. ✅ Stored in ML training dataset
2. ✅ Features extracted for model training
3. ✅ Labels assigned using weak supervision
4. ✅ Available for export (CSV/JSON)

Export dataset: `http://localhost:3000/api/dataset/export?format=json`
Dataset stats: `http://localhost:3000/api/dataset/stats`

---

## 🔐 Security Assertions

✅ **HTTPS Doesn't Mean Safe** - HTTPS on serveo.net still critical
✅ **Domain Age Matters** - Old domains more trustworthy
✅ **Entropy Detection** - Random subdomains = phishing infrastructure
✅ **Risky Hosting** - Temporary infra (ngrok, serveo) = critical
✅ **Keyword Analysis** - Login/verify/update keywords + random domain = phishing

---

**Platform: ARGUS Security**
**Version: Enterprise ML-Ready**
**Last Updated: 2026-01-27**
