# 🛡️ ARGUS  
## Real-Time AI-Driven Threat Intelligence & Notification Governance Platform

ARGUS is a full-stack, enterprise-grade security platform designed to strengthen internal enterprise communication systems.

It proactively:
- Identifies suspicious URLs  
- Analyzes domain reputation  
- Calculates threat velocity  
- Applies AI-based risk scoring  
- Enforces strict role-based governance  

This project simulates a real-world enterprise security architecture built for scalability, explainability, and governance compliance.

---

# 📌 Executive Summary

ARGUS Enterprise is a production-ready, real-time AI-powered security intelligence platform built to monitor, classify, and govern enterprise communications across internal systems such as Email, Slack, Teams, Finance, and HR portals.

### The system enables organizations to:

- Detect phishing, BEC, ransomware, and fraud attempts in real-time  
- Reduce false positives through human-in-the-loop workflows  
- Enforce governance and audit compliance  
- Maintain role-based access control and accountability  
- Scale to high-volume enterprise environments  

ARGUS bridges the gap between automated AI detection and enterprise governance control systems.

---

# 🎯 Enterprise Objectives

ARGUS addresses critical enterprise security challenges:

| Enterprise Problem | ARGUS Solution |
|-------------------|---------------|
| High volume of communications | Scalable real-time streaming architecture |
| Manual fraud review overhead | AI-driven classification engine |
| Blind trust in AI | Human validation workflows |
| Lack of audit transparency | Decision logging & auditor dashboards |
| Multi-role access complexity | Strict RBAC enforcement |
| Governance compliance gaps | Traceable actions & overrides |

---

# 🏗 Enterprise Architecture

## System Flow

Frontend (Next.js + React + TypeScript)  
⬇  
API Layer (Next.js API Routes / Node)  
⬇  
ML Inference Engine (FastAPI + Scikit-learn)  
⬇  
Real-Time Streaming (WebSockets)  
⬇  
Dataset Layer (5,000+ Notifications Simulation)

### Architectural Highlights

- Modular role-based routing  
- Real-time WebSocket propagation  
- Explainable ML inference layer  
- Governance-aware decision logging  
- Scalable notification simulation  

---

# ⚙️ Technology Stack

## Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- WebSocket Client

## Backend
- Node.js
- Next.js API Routes
- Role-based middleware architecture

## Machine Learning
- Python
- FastAPI
- Scikit-learn
- Feature engineering pipeline
- Explainable risk scoring model

## Data Layer
- CSV-based scalable dataset
- 5,000+ notification simulation
- Real-time streaming integration
- Optimized in-memory filtering

---

# 🔐 Enterprise Security Features

## 1️⃣ Role-Based Access Control (RBAC)

Strict separation of responsibilities:

| Role | Capabilities |
|------|-------------|
| Admin | System-wide governance, bulk blocking, analytics |
| Fraud Analyst | Threat review, AI override, validation |
| Department Head | Department risk analytics |
| Auditor | Governance audit & decision traceability |
| Employee | Personal notification visibility |

Role routing is securely locked to prevent privilege escalation.

---

## 2️⃣ Real-Time Threat Streaming

- WebSocket-based live delivery  
- Sub-second notification rendering  
- No polling overhead  
- Cross-dashboard propagation  
- Optimized for high-volume environments  

---

## 3️⃣ AI Risk Classification Engine

Each notification includes:

- Risk score (0–1 scale)
- Risk severity (Safe / Not Safe)
- Confidence score
- Contributing feature explanations
- URL scan analysis

### ML Strategy

- URL entropy detection  
- Suspicious keyword analysis  
- Sender domain validation  
- Risk distribution modeling  
- Human feedback calibration  

---

## 4️⃣ Human-in-the-Loop Governance

ARGUS enforces AI-assisted decision making, not blind automation.

- Analysts validate high-risk alerts  
- Overrides are logged  
- Decisions are traceable  
- Audit visibility is preserved  
- Governance trail maintained  

---

## 5️⃣ Safe vs Not-Safe Segregation

- Automatic AI segregation  
- Bulk selection for high-risk alerts  
- Block sender / mute domain actions  
- Severity prioritization  
- Cross-dashboard consistency  

---

## 6️⃣ Audit & Compliance Readiness

The Auditor Dashboard provides:

- Decision history visibility  
- Analyst override tracking  
- Timeline-based event tracing  
- Governance compliance review  

Designed to support:
- SOC monitoring  
- Internal fraud compliance  
- Enterprise audit requirements  

---

# 📊 Scalability & Performance Engineering

- Tested with 5,000+ notifications  
- Capped rendering for performance  
- Optimized dropdown scroll handling  
- Controlled re-renders for WebSocket updates  
- Efficient in-memory filtering  
- Stable architecture under load  

---

# 🧠 Explainable AI Design

ARGUS does not operate as a black box.

Each flagged alert includes:
- Feature impact breakdown  
- Risk reasoning explanation  
- Confidence metrics  
- Link analysis  

This improves:
- Analyst trust  
- Executive visibility  
- Regulatory transparency  
- Decision accountability  

---

# 👤 Enterprise Account Management

- Profile sections per role  
- Secure password reset via email link  
- Role-based identity segregation  
- Governance-aligned access control  

---

# 🚀 Deployment

## Backend (Render)

- **Root directory:** `backend`
- **Build command:** `npm install --legacy-peer-deps`
- **Start command:** `node server.js`
- **Environment variables:**
  - `MONGO_URI` — MongoDB connection string
  - `JWT_SECRET` — JWT signing secret
  - `FRONTEND_URL` — Deployed frontend URL (e.g. `https://your-app.vercel.app`)

## Frontend (Vercel)

- **Root directory:** project root
- **Build command:** `npm run build`
- **Environment variables:**
  - `NEXT_PUBLIC_BACKEND_URL` — Deployed backend URL (e.g. `https://your-backend.onrender.com`)

---

## Development

```bash
npm install
npm run dev
