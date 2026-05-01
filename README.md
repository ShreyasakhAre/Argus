## ARGUS

## AI-Powered Real-Time Threat Intelligence & Notification Governance Platform

> **Not just detecting threats — enabling real-time security decisions at scale.**

ARGUS is a full-stack, enterprise-grade system designed to **ingest, analyze, and act on high-volume security notifications** across platforms like Email, Slack, ERP, and HR systems.

It combines **Machine Learning + AI Agent reasoning + Real-Time Streaming + RBAC** to simulate a **production-ready security intelligence platform**.

---

## 🚀 Live Capabilities

* ⚡ Processes **10,000+ notifications** in real-time
* 🧠 AI-powered **risk scoring + explainable decisions**
* 🔄 **Live alert streaming (WebSockets)**
* 🔐 **Role-Based Access Control (RBAC)**
* 🤖 AI Agent with **Passive / Assisted / Autonomous modes**
* 📊 Real-time analytics dashboards
* 🧾 Audit logs & governance tracking

---

## 🏗️ System Architecture & Request Flow

<p align="left">
  <b>System Architecture</b><br><br>
  <img src="https://github.com/user-attachments/assets/1bb16083-7875-4313-9a5c-c11b3eaf6960" width="1000" style="border-radius: 8px;"/>
</p>

<br>

<p align="left">
  <b>Database Schema</b><br><br>
  <img src="https://github.com/user-attachments/assets/ee971961-e980-4549-ac02-885411457c1d" width="1200" style="border-radius: 8px;"/>
</p>

<br>

<p align="left">
  <i>End-to-end system showing frontend → API → AI Agent → ML pipeline → real-time streaming</i>
</p>

---

## 🧠 AI Agent 

### 🤖 What it does

The AI Agent acts as the **decision intelligence layer** — going beyond ML predictions to generate **context-aware, explainable actions**.

Instead of:

> “This is risky”

It answers:

> “Why is this risky, and what should be done?”

---

### ⚙️ How it works

1. Incoming notification (Email / Slack / ERP)
2. Entity extraction (URL, domain, keywords)
3. Dynamic tool selection (ReAct-style reasoning)
4. ML inference (risk scoring)
5. Feature-level analysis
6. Action recommendation generated

---

### 🔧 Agent Tools

* URL entropy analyzer
* Domain reputation checker
* Phishing keyword detector
* Historical pattern analyzer
* Threat intelligence lookup

---

### 🔄 Modes

| Mode       | Behavior                |
| ---------- | ----------------------- |
| Passive    | Only insights           |
| Assisted   | Suggestions to analysts |
| Autonomous | Executes actions        |

---

### 🔗 Integration

```text
Frontend → API Layer → AI Agent (FastAPI)
                         ↓
                 ML + Tools + Reasoning
                         ↓
                Response → UI + Alerts
```

---

## ⚙️ Tech Stack

### Frontend

* Next.js (App Router)
* React + TypeScript
* Tailwind CSS
* Recharts
* WebSockets

### Backend

* Node.js
* Express / Next API Routes
* JWT Authentication
* RBAC Middleware

### Machine Learning

* Python + FastAPI
* Scikit-learn
* TF-IDF + Logistic Regression + XGBoost
* Explainable risk scoring

### Data Layer

* 10,000+ notification dataset
* Real-time streaming simulation
* Optimized in-memory filtering

---

## 🔌 API Endpoints

### 🔐 Auth

* `POST /api/auth/login`
* `POST /api/auth/register`
* `POST /api/auth/reset-password`

### 📊 Notifications

* `GET /api/notifications`
* `GET /api/notifications/stream` (WebSocket)
* `GET /api/notifications/:id`
* `POST /api/notifications/action`

### 🤖 AI Agent

* `POST /api/agent/analyze`
* `POST /api/agent/query`

### 📈 Analytics

* `GET /api/analytics/overview`
* `GET /api/analytics/performance`

### 👥 Users & Audit

* `GET /api/users`
* `PUT /api/users/:id/role`
* `GET /api/audit/logs`

---

## 🔄 Request Flow (Sequence)

```text
User Action (Dashboard)
        ↓
Frontend (React UI)
        ↓
API Layer (Node.js)
        ↓
AI Agent (FastAPI)
        ↓
Feature Extraction + Tool Calls
        ↓
ML Model Inference
        ↓
Risk Score + Explanation
        ↓
Response to UI
        ↓
WebSocket Broadcast (Live Alerts)
```

---

## 🔐 Core Features

### 🧠 AI Risk Engine

* Risk score (0–1)
* Severity classification
* Confidence score
* Explainable reasoning

---

### ⚡ Real-Time Streaming

* WebSockets (no polling)
* Sub-second updates
* Cross-dashboard sync

---

### 🔐 RBAC System

| Role     | Access              |
| -------- | ------------------- |
| Admin    | Full system control |
| Analyst  | Threat validation   |
| Auditor  | Logs & compliance   |
| Employee | Personal alerts     |

---

### 🛡️ Policy Engine

* Rule-based enforcement
* Automated violation tracking
* Governance workflows

---

### 🔍 Threat Scanner

* URL entropy
* HTTPS validation
* Domain checks
* Phishing detection

---

## 📊 Performance & Scalability

* Handles **10,000+ events**
* Optimized rendering + state updates
* Efficient WebSocket streaming
* Low-latency alert propagation

---

## 🧠 Design Principles

* **Event-driven architecture** (real-time systems)
* **Separation of concerns** (modular layers)
* **AI + Rules hybrid system**
* **Human-in-the-loop validation**
* **Explainability-first ML design**

---

## 💡 Key Learnings

* ML ≠ real-world system (integration is harder)
* Real-time systems require **latency optimization**
* Explainability is critical for adoption
* Combining **AI + rules + UI workflows** is essential

---

## 🚀 Deployment

### Backend (Render)

```bash
npm install --legacy-peer-deps
node server.js
```

### Frontend (Vercel)

```bash
npm run build
```

---

## 🧪 Run Locally

```bash
npm install
npm run dev
```
---

## 🎥 Full Demo 

▶️ [Watch Demo](https://drive.google.com/file/d/1h2Nr8wK4o9hVK7ym4lUVWF0VxJxho46h/view)

## 🔮 Future Improvements

* Kafka-based streaming architecture
* Advanced threat intelligence models
* Fully autonomous AI response system
* Distributed system scaling

