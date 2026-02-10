# 🔍 ARGUS Scanner System - Complete Guide

## ✅ What's Working

Your ARGUS platform has **TWO POWERFUL SECURITY SCANNERS** fully integrated and ready to use:

---

## 🔗 **1. LINK SCANNER**

### **Purpose**
Scans URLs for malicious content, phishing, spam, and security threats.

### **How to Access**
```
Navigate to: http://localhost:3000/
Tab: Scanners → Link Scanner
```

### **How to Use**
1. Enter any URL (e.g., `https://example.com`)
2. Click **"🔍 Scan"** button
3. Get instant risk assessment

### **What It Detects**
- ✅ Phishing attempts
- ✅ Malware hosting
- ✅ Spam/unwanted content
- ✅ Suspicious domains
- ✅ Suspicious URL patterns
- ✅ IP-based domains
- ✅ Domain age
- ✅ HTTPS status

### **Risk Levels**
- 🟢 **Low** (0-30 score)
- 🟡 **Medium** (30-70 score)
- 🔴 **High** (70-100 score)

### **Example URLs to Test**
```
Safe: https://google.com
Safe: https://github.com
Suspicious: https://bit.ly/xxx (shortened, needs verification)
Medium: https://example.suspicious.com
```

### **File Architecture**
```
API Endpoint:     /api/scan-link (POST)
    ↓
Link Scanner Lib: src/lib/link-scanner.ts
    ↓
Component:        src/components/link-scanner.tsx
    ↓
Feature Check:    Phishing, malware, spam detection
    ↓
Risk Scoring:     Machine learning based
```

### **Sample API Call**
```bash
curl -X POST http://localhost:3000/api/scan-link \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Response:**
```json
{
  "url": "https://example.com",
  "is_malicious": false,
  "risk_score": 15,
  "risk_level": "Low",
  "explanation": "URL appears safe based on analysis",
  "features": [
    {
      "feature": "HTTPS Enabled",
      "value": true,
      "risk_impact": "positive",
      "description": "Secure connection"
    },
    {
      "feature": "Domain Age",
      "value": 8,
      "risk_impact": "positive",
      "description": "8 years old - established domain"
    }
  ]
}
```

---

## 📱 **2. QR CODE SCANNER**

### **Purpose**
Scans QR codes and checks if they contain malicious URLs.

### **How to Access**
```
Navigate to: http://localhost:3000/
Tab: Scanners → QR Code Scanner
```

### **How to Use**
1. Click **"📤 Click to upload or drag and drop"**
2. Select QR code image (PNG, JPG, GIF - up to 10MB)
3. Scanner decodes the QR code
4. Automatically scans embedded URL for threats
5. Shows risk assessment

### **What It Does**
- ✅ Decodes QR code data
- ✅ Extracts embedded URLs
- ✅ Scans URLs for malware/phishing
- ✅ Provides risk assessment
- ✅ Shows full analysis

### **File Architecture**
```
API Endpoint:        /api/scan-qr (POST - multipart)
    ↓
QR Scanner Lib:      src/lib/link-scanner.ts (decoding)
    ↓
Component:           src/components/qr-scanner.tsx
    ↓
Image Processing:    File upload & parsing
    ↓
URL Extraction:      Decode QR data
    ↓
Risk Scoring:        Link scanner analysis
```

### **Sample API Call**
```bash
# Upload QR code image
curl -X POST http://localhost:3000/api/scan-qr \
  -F "file=@qr_code.png"
```

**Response:**
```json
{
  "success": true,
  "qr_data": "https://malicious-site.com",
  "is_url": true,
  "scan_result": {
    "url": "https://malicious-site.com",
    "is_malicious": true,
    "risk_score": 85,
    "risk_level": "High",
    "explanation": "Domain flagged for phishing"
  }
}
```

---

## 📊 **Detection Features**

### **Both Scanners Analyze:**

| Feature | What It Checks | Risk Impact |
|---------|---------------|------------|
| **Phishing Detection** | Known phishing domains | Negative ⚠️ |
| **Malware Check** | Malware distribution sites | Negative ⚠️ |
| **Spam Detection** | Spam/junk content | Negative ⚠️ |
| **HTTPS Status** | Secure connection | Positive ✅ |
| **Domain Age** | How old the domain is | Positive ✅ |
| **IP-based URLs** | Direct IP links (suspicious) | Negative ⚠️ |
| **URL Shorteners** | bit.ly, tinyurl, etc. | Neutral ⚠️ |
| **Special Characters** | Deceptive encoding | Negative ⚠️ |
| **Subdomain Check** | Unusual subdomains | Negative ⚠️ |

---

## 🚀 **Live Testing**

### **Step 1: Start the Server**
```bash
cd D:\Project\argus
npm run dev
```

Server runs on: `http://localhost:3000`

### **Step 2: Navigate to Scanners**
```
URL: http://localhost:3000
Click: Scanners Tab
```

### **Step 3: Test Link Scanner**
```
1. Click "Link Scanner"
2. Enter: https://example.com
3. Click "Scan"
4. See results instantly
```

### **Step 4: Test QR Scanner**
```
1. Click "QR Code Scanner"
2. Drag & drop a QR code image
3. See decoded URL
4. See risk assessment
```

---

## 💻 **Key Files**

### **Scan Detection Logic**
📄 **`src/lib/link-scanner.ts`**
- Main detection engine
- All security algorithms
- Risk scoring logic
- Feature extraction

### **API Endpoints**
📄 **`src/app/api/scan-link/route.ts`**
- Link scanning endpoint
- Text parsing endpoint
- Result formatting

📄 **`src/app/api/scan-qr/route.ts`**
- QR code upload handling
- Image processing
- QR decoding

### **UI Components**
📄 **`src/components/link-scanner.tsx`**
- Link input interface
- Result display
- Feature visualization

📄 **`src/components/qr-scanner.tsx`**
- Image upload interface
- QR preview
- Result display

📄 **`src/components/scanner-tools.tsx`**
- Tabs & navigation
- Layout management

---

## 🔒 **Security Features**

✅ **Real-time Detection**
- Instant scanning results
- No server delays
- Client-side processing where possible

✅ **Comprehensive Analysis**
- 10+ detection features
- Multi-factor risk scoring
- Detailed explanations

✅ **User-Friendly**
- Simple input forms
- Clear results
- Color-coded risk levels

✅ **File Handling**
- Up to 10MB file size
- PNG, JPG, GIF support
- Safe upload validation

---

## 📈 **Success Indicators**

When you visit the Scanners section, you should see:

✅ **Link Scanner Panel**
- Input field: "Enter URL to scan (e.g., https://example.com)"
- Scan button with search icon
- Results showing (after scan):
  - Risk score (0-100)
  - Risk level (Low/Medium/High)
  - Detected features list

✅ **QR Code Scanner Panel**
- Upload area with upload icon
- "Click to upload or drag and drop"
- File format info: "PNG, JPG, GIF up to 10MB"
- Results showing (after upload):
  - Decoded QR data
  - Extracted URL
  - Risk assessment

---

## 🧪 **Test Cases**

### **Link Scanner Tests**
1. ✅ Safe domain: `https://google.com` → Low risk
2. ✅ HTTPS site: `https://github.com` → Low risk
3. ✅ Shortened URL: `https://bit.ly/test` → Medium risk
4. ✅ Invalid URL: `not-a-url` → Error handling
5. ✅ Empty input: `` → Validation error

### **QR Scanner Tests**
1. ✅ Valid QR with URL → Decode + Scan
2. ✅ Valid QR with text → Decode (no scan)
3. ✅ Invalid image → Error handling
4. ✅ Large file → Size limit error
5. ✅ Wrong format → Format validation

---

## 🎯 **Integration Status**

| Component | Status | Working |
|-----------|--------|---------|
| Link Scanner UI | ✅ Complete | Yes |
| Link Scanner API | ✅ Complete | Yes |
| Link Detection Logic | ✅ Complete | Yes |
| QR Scanner UI | ✅ Complete | Yes |
| QR Scanner API | ✅ Complete | Yes |
| QR Decoding | ✅ Complete | Yes |
| Risk Scoring | ✅ Complete | Yes |
| Result Display | ✅ Complete | Yes |

---

## 💡 **How to Demonstrate**

**Live Demo Script:**
1. Open: `http://localhost:3000`
2. Click "Scanners" tab
3. Show Link Scanner:
   - Enter: `https://suspicious-domain.xyz`
   - Click Scan
   - Show risk assessment
4. Show QR Scanner:
   - Upload a QR code image
   - Show decoded URL
   - Show security analysis

---

## 🔗 **Quick Links**

- **Main App**: http://localhost:3000
- **Scanners Page**: http://localhost:3000 (Scanners tab)
- **Link Scanner API**: `POST /api/scan-link`
- **QR Scanner API**: `POST /api/scan-qr`

---

**Everything is fully functional and ready to use! 🚀**
