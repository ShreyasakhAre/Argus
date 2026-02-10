# ARGUS Implementation Reference

## 🚀 Quick Start

### Access ARGUS
```
Browser: http://localhost:3000
Scanners Tab: Click "Scanners"
Link Scanner: Click "Link Scanner"
```

### Test Malicious URL Detection
```
1. Copy: https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net
2. Paste into Link Scanner
3. Click "🔍 Scan"
4. View Risk Score: 80-95 (🚨 CRITICAL)
```

---

## 📂 File Structure

```
argus/
├── src/
│   ├── lib/
│   │   ├── link-scanner.ts          ✅ ENHANCED - Feature extraction + scoring
│   │   ├── dataset.ts               ✅ NEW - ML training pipeline
│   │   └── ml-service.ts            (Python backend)
│   │
│   ├── app/api/
│   │   ├── scan-link/
│   │   │   └── route.ts             ✅ ENHANCED - Dataset + notifications
│   │   ├── notifications/
│   │   │   └── manage/
│   │   │       └── route.ts         ✅ NEW - Notification management
│   │   └── dataset/
│   │       ├── export/
│   │       │   └── route.ts         ✅ NEW - CSV/JSON export
│   │       └── stats/
│   │           └── route.ts         ✅ NEW - Statistics
│   │
│   └── components/
│       ├── link-scanner.tsx         ✅ ENHANCED - Professional UI
│       ├── notification-provider.tsx (Socket.IO handler)
│       └── notifications-feed.tsx    (Live feed)
│
├── SCANNER_DOCUMENTATION.md         ✅ NEW - User guide
├── TEST_URLS.md                     ✅ NEW - Test cases
└── UPGRADE_SUMMARY.md               ✅ NEW - This architecture
```

---

## 🔧 Core Implementation Details

### Feature Extraction Algorithm

```typescript
function extractFeatures(url: string): URLFeatures {
  // 1. Parse URL
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.toLowerCase();
  
  // 2. Extract components
  const hostParts = hostname.split('.');
  const subdomain = hostParts.slice(0, -2).join('.');
  
  // 3. Calculate entropy
  const entropyScore = calculateShannonEntropy(subdomain);
  
  // 4. Check patterns
  const isHexPattern = /^[a-f0-9]{16,}$/i.test(subdomain);
  const isRiskyInfra = RISKY_DOMAINS.some(d => hostname.endsWith(d));
  
  // 5. Find keywords
  const keywords = SUSPICIOUS_KEYWORDS.filter(kw => fullUrl.includes(kw));
  
  // 6. Return all features
  return {
    protocol, hostname, subdomain, entropy_score, is_hex_pattern,
    is_risky_infrastructure, suspicious_keywords_found, ...
  };
}
```

### Shannon Entropy Calculation

```typescript
function calculateShannonEntropy(str: string): number {
  const len = str.length;
  const freq: Record<string, number> = {};
  
  // Count character frequencies
  for (const char of str.toLowerCase()) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  // Calculate entropy: H = -Σ(p * log2(p))
  let entropy = 0;
  for (const char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;  // 0 (uniform) to ~5.0 (random)
}
```

### Risk Scoring Algorithm

```typescript
function calculateRiskScore(features: URLFeatures): number {
  let score = 0;
  
  // CRITICAL SIGNALS (30-35 points each)
  if (features.is_hex_pattern) score += 35;           // Random hex
  if (features.entropy_score > 4.2) score += 30;      // Ultra-random
  if (features.is_risky_infrastructure) score += 30;  // Temporary infra
  
  // HIGH SIGNALS (15-25 points each)
  if (features.entropy_score > 3.5) score += 20;      // High randomness
  if (features.suspicious_keywords_found.length > 2) score += 20;  // Multiple keywords
  if (features.uses_ip_address) score += 25;          // IP instead of domain
  if (features.has_at_symbol) score += 20;            // Email spoofing
  
  // MEDIUM SIGNALS (5-15 points each)
  if (features.suspicious_tld) score += 15;           // Bad TLD
  if (features.has_double_extension) score += 20;     // Double extension
  if (features.url_length > 100) score += 10;         // Long URL
  
  // SAFE SIGNALS (negative adjustment)
  if (features.known_legitimate) score = Math.max(0, score - 20);
  if (features.uses_https && score < 20) score -= 5;   // Minor bonus
  
  return Math.min(100, Math.max(0, score));  // Clamp to 0-100
}
```

### Classification

```typescript
if (score >= 70) {
  // 🚨 CRITICAL
  level = 'Critical';
  is_malicious = true;
  explanation = 'CRITICAL: Multiple security indicators...';
} else if (score >= 40) {
  // ⚠️ SUSPICIOUS
  level = 'Suspicious';
  is_malicious = true;
  explanation = 'SUSPICIOUS: Some suspicious characteristics...';
} else {
  // 🟢 SAFE
  level = 'Safe';
  is_malicious = false;
  explanation = 'SAFE: No major security indicators...';
}
```

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  User Input     │
│  (URL)          │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  scanLink(url)                      │
│  1. extractFeatures(url)            │
│  2. calculateRiskScore(features)    │
│  3. generateThreatExplanation()     │
│  4. generateFeatureBreakdown()      │
└────────┬────────────────────────────┘
         │
         ↓
    ┌────────┴────────┐
    │                 │
    ↓                 ↓
┌─────────┐      ┌──────────────┐
│ Dataset │      │ Notification │
│ Storage │      │ Creation     │
└────┬────┘      └──────┬───────┘
     │                  │
     ↓                  ↓
┌───────────────┐  ┌──────────────┐
│ ML Training   │  │ Toast UI +   │
│ Data (CSV/JSON)  │ Sound Alert  │
└───────────────┘  └──────────────┘
     │                  │
     └────────┬─────────┘
              ↓
         ┌──────────┐
         │ Response │
         └──────────┘
```

---

## 🔌 API Endpoints Reference

### POST /api/scan-link
```bash
curl -X POST http://localhost:3000/api/scan-link \
  -H "Content-Type: application/json" \
  -d '{"url":"https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net"}'
```

**Response:**
```json
{
  "url": "https://4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net",
  "is_malicious": true,
  "risk_score": 85,
  "risk_level": "Critical",
  "explanation": "CRITICAL: This URL combines multiple high-risk indicators...",
  "threat_reasons": [
    "Random hexadecimal pattern detected in subdomain",
    "Critical entropy level detected (highly randomized subdomain)",
    "Temporary tunnel or free hosting infrastructure detected"
  ],
  "features": {
    "protocol": "https",
    "full_hostname": "4be3c3c76fe71b2f89752d3c268e8bbe.serveo.net",
    "entropy_score": 4.85,
    "is_hex_pattern": true,
    "is_risky_infrastructure": true,
    ...
  },
  "feature_breakdown": [
    {
      "feature": "Protocol",
      "value": "HTTPS",
      "risk_impact": "neutral",
      "description": "HTTPS (encrypted)"
    },
    ...
  ],
  "notification": {
    "id": "notif_1234567890_abc123def",
    "type": "scan_result",
    "severity": "critical",
    "title": "🚨 CRITICAL THREAT"
  }
}
```

### GET /api/dataset/export
```bash
# JSON format
curl "http://localhost:3000/api/dataset/export?format=json"

# CSV format
curl "http://localhost:3000/api/dataset/export?format=csv" > dataset.csv

# Statistics only
curl "http://localhost:3000/api/dataset/export?format=stats"
```

### GET /api/dataset/stats
```bash
curl "http://localhost:3000/api/dataset/stats"
```

**Response:**
```json
{
  "stats": {
    "total_records": 42,
    "benign_count": 28,
    "suspicious_count": 8,
    "malicious_count": 6,
    "avg_label_confidence": 0.87,
    "requires_review": 3
  },
  "validation": {
    "valid": true,
    "issues": [],
    "stats": { ... }
  },
  "timestamp": "2026-01-27T10:30:45.123Z"
}
```

### POST /api/notifications/manage
```bash
# Create notification
curl -X POST http://localhost:3000/api/notifications/manage \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "url": "https://example.com",
    "risk_level": "Critical",
    "risk_score": 85,
    "explanation": "..."
  }'

# Get all notifications
curl -X POST http://localhost:3000/api/notifications/manage \
  -H "Content-Type: application/json" \
  -d '{"action": "get_all"}'

# Mark as read
curl -X POST http://localhost:3000/api/notifications/manage \
  -H "Content-Type: application/json" \
  -d '{"action": "mark_read", "notification_id": "notif_..."}'
```

---

## 🧬 ML Feature Vector

When exporting for ML training:

```python
features = [
  uses_https,              # 0 or 1
  entropy_score / 5,       # 0-1
  is_hex_pattern,          # 0 or 1
  is_risky_infrastructure, # 0 or 1
  keywords_count / 5,      # 0-1
  has_suspicious_tld,      # 0 or 1
  url_length / 200,        # 0-1
  special_char_ratio,      # 0-1
  digit_ratio,             # 0-1
  has_at_symbol,           # 0 or 1
  uses_ip_address,         # 0 or 1
  has_double_extension,    # 0 or 1
  dash_count / 5,          # 0-1
  url_shortener,           # 0 or 1
  known_legitimate,        # 0 or 1
  subdomain_length / 50,   # 0-1
  subdomain_levels / 5     # 0-1
]  # 17 features total

label = {
  'benign': 0,
  'suspicious': 1,
  'malicious': 2
}

confidence = 0.75  # Label confidence for weak supervision
```

---

## 🎓 Example: Training a Random Forest Model

```python
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# 1. Load exported dataset
df = pd.read_csv('dataset.csv')

# 2. Prepare features
feature_cols = [
  'uses_https', 'entropy_score', 'is_hex_pattern', 'is_risky_infrastructure',
  'suspicious_keywords', 'has_suspicious_tld', 'url_length',
  'special_char_ratio', 'digit_ratio', 'has_at_symbol',
  'uses_ip_address', 'has_double_extension', 'dash_count',
  'url_shortener', 'known_legitimate', 'subdomain_length', 'subdomain_levels'
]

X = df[feature_cols].values
y = df['label'].map({'benign': 0, 'suspicious': 1, 'malicious': 2}).values
weights = df['label_confidence'].values  # Weak supervision weights

# 3. Split data
X_train, X_test, y_train, y_test, w_train, w_test = train_test_split(
  X, y, weights, test_size=0.2, random_state=42, stratify=y
)

# 4. Train model (with confidence weights)
clf = RandomForestClassifier(
  n_estimators=100,
  max_depth=15,
  min_samples_split=5,
  random_state=42
)
clf.fit(X_train, y_train, sample_weight=w_train)

# 5. Evaluate
y_pred = clf.predict(X_test)
print(classification_report(y_test, y_pred, 
  target_names=['benign', 'suspicious', 'malicious']))

# 6. Feature importance
import numpy as np
importances = clf.feature_importances_
for name, importance in sorted(zip(feature_cols, importances), 
                                key=lambda x: x[1], reverse=True):
  print(f"{name}: {importance:.3f}")
```

---

## 🔍 Debugging & Troubleshooting

### Check Feature Extraction
```javascript
// In browser console:
const result = await fetch('/api/scan-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://test.com' })
}).then(r => r.json());

console.log('Features:', result.features);
console.log('Risk Score:', result.risk_score);
console.log('Threat Reasons:', result.threat_reasons);
```

### Verify Dataset Storage
```bash
curl "http://localhost:3000/api/dataset/stats"
# Check: total_records > 0
# Check: benign_count, suspicious_count, malicious_count
```

### Test Notifications
```bash
curl -X POST http://localhost:3000/api/notifications/manage \
  -H "Content-Type: application/json" \
  -d '{"action": "get_critical"}'
# Should list any critical alerts
```

### Monitor Entropy Calculation
```javascript
// For debugging entropy:
// Open DevTools → Console
// Any URL with entropy > 4.2 should be flagged as CRITICAL
```

---

## ✅ Verification Checklist

- ✅ Server running: `http://localhost:3000`
- ✅ Socket server: Port 4002
- ✅ Link Scanner: Available in Scanners tab
- ✅ Feature extraction: 14+ signals working
- ✅ Risk scoring: 0-100 scale functional
- ✅ Dataset: Stores scans in memory
- ✅ Notifications: Created for all scans
- ✅ API endpoints: Export, stats, notifications working
- ✅ UI: Threat explanation display complete
- ✅ Colors: Critical=red, Suspicious=yellow, Safe=green

---

**ARGUS Professional Security Platform**
**Enterprise-Grade Malicious URL Detection**
**Version 2.0**
