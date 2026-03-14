<div align="center">

<!-- HERO IMAGE -->
<img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80" width="280" alt="LexBrain AI — AI Legal Assistant for India" style="border-radius:12px"/>

<br/>
<br/>

# ⚖️ LexBrain AI

**AI-Powered Legal Assistant · Indian Penal Code · Google Gemini · 5-Agent Pipeline**

<br/>

<!-- BADGES -->
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Gemini-1.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](#authentication)
[![License](https://img.shields.io/badge/License-MIT-94A3B8?style=flat-square)](LICENSE)
[![Agents](https://img.shields.io/badge/AI_Agents-5-E8A838?style=flat-square)](#ai-pipeline)
[![Analysis](https://img.shields.io/badge/Analysis_Time-<15s-22C55E?style=flat-square)](#performance)

<br/>

<!-- LIVE LINKS -->
| | Link |
|---|---|
| 🖥️ **Live Frontend** | [lexai.vercel.app](https://lexbrain-ai.vercel.app) |
| ⚡ **Live API** | [lexai-api.onrender.com](https://lexbrain-ai.onrender.com) |
| 📖 **API Docs (Swagger)** | [lexai-api.onrender.com/docs](https://lexbrain-ai.onrender.com/docs) |

<br/>

*A full-stack AI legal assistant that analyzes your situation in plain English and returns relevant IPC sections, predicted court outcomes, precautions, recommended actions, and a downloadable professional report — powered by a 5-agent Google Gemini pipeline — in under 15 seconds.*

</div>

---

## Table of Contents

- [What is LexBrain AI?](#what-is-lexbrain-ai)
- [The Problem](#the-problem)
- [Solution Overview](#solution-overview)
- [Live Demo](#live-demo)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [AI Pipeline](#ai-pipeline)
- [Performance](#performance)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)
- [Authentication](#authentication)

---

## What is LexBrain AI?

**LexBrain AI** is a full-stack web application that gives Indian citizens instant access to legal knowledge — without needing to know the law.

A user describes their legal problem in plain English (or speaks it aloud). Five specialized AI agents powered by **Google Gemini 1.5 Flash** process the query sequentially and return:

- The specific **Indian Penal Code (IPC) sections** that apply — with section numbers, descriptions, punishments, fines, and direct [Indian Kanoon](https://indiankanoon.org) links
- **Predicted legal outcomes** — FIR, arrest, bail conditions, trial timeline, sentencing
- **Immediate precautions** — what to do and not do right now
- **Step-by-step recommended actions**
- A **downloadable PDF or DOCX report** — professionally formatted, suitable to hand to an advocate

Every analysis is saved to the user's account and accessible anytime.

---

## The Problem

**Most Indian citizens do not know which law applies to their situation.**

When someone is cheated, assaulted, or wronged — they don't know if it's IPC 420 or IPC 406. They don't know whether to file an FIR or send a legal notice first. They don't know what evidence to preserve. Consulting a lawyer costs ₹2,000–₹10,000 for an initial consultation that may happen days later.

LexBrain AI solves this by making legal knowledge **instantly accessible, free, and in plain language** — so people understand their rights before they even speak to an advocate.

---

## Solution Overview

```
User describes legal situation (text or voice input)
                    │
                    ▼
        ┌───────────────────┐
        │  Input Validation  │  min length · auth check · Pydantic schema
        └─────────┬─────────┘
                  ▼
        ┌───────────────────────────────────────────┐
        │           5-Agent AI Pipeline             │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │ Agent 1 · Case Understanding        │  │
        │  │ → legal_category · keywords · severity│ │
        │  └──────────────────┬──────────────────┘  │
        │                     ▼                     │
        │  ┌─────────────────────────────────────┐  │
        │  │ Agent 2 · Legal Retrieval           │  │
        │  │ → IPC sections · punishments · links│  │
        │  └──────────────────┬──────────────────┘  │
        │                     ▼                     │
        │  ┌─────────────────────────────────────┐  │
        │  │ Agent 3 · Outcome Prediction        │  │
        │  │ → possible_outcomes list            │  │
        │  └──────────────────┬──────────────────┘  │
        │                     ▼                     │
        │  ┌─────────────────────────────────────┐  │
        │  │ Agent 4 · Precaution Advisor        │  │
        │  │ → precautions · recommended_actions │  │
        │  └──────────────────┬──────────────────┘  │
        │                     ▼                     │
        │  ┌─────────────────────────────────────┐  │
        │  │ Agent 5 · Case Summarizer           │  │
        │  │ → plain English 3-sentence summary  │  │
        │  └──────────────────┬──────────────────┘  │
        └─────────────────────┼─────────────────────┘
                              ▼
                ┌─────────────────────────┐
                │   Persist to SQLite DB   │  user_queries table
                └─────────────┬───────────┘
                              ▼
          Full analysis · IPC sections · Outcomes
          Precautions · Summary · Download links
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
           PDF Report               DOCX Report
         (ReportLab)              (python-docx)
```

**Key design decisions:**
- **Mock fallbacks on every agent** — if Gemini API is unavailable or returns malformed JSON, keyword-based mock responses are returned. The app never crashes due to AI failure
- **JWT stored in localStorage** — single source of truth, 1-year expiry, no cookie conflicts
- **Lightweight history endpoint** — returns only `query_id`, `query_text`, `timestamp` (not the full analysis blob) to keep responses fast
- **401 interceptor scoped** — only redirects to login for data routes (`/api/query/`, `/api/report/`), never for non-critical calls like `/api/auth/me`

---

## Live Demo

**Frontend** — [lexai.vercel.app](https://lexai.vercel.app)

Create a free account, describe your legal situation, and get a full analysis in seconds. Download the PDF or DOCX report. All cases are saved to your history.

**Try the API directly:**

```bash
# 1. Login and get a token
curl -X POST https://lexai-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'

# 2. Analyze a legal case (use the token from step 1)
curl -X POST https://lexai-api.onrender.com/api/query/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query_text": "My landlord is refusing to return my security deposit of Rs 50000 after 4 months of vacating the flat. What legal action can I take?"
  }'
```

**Example API response:**

```json
{
  "query_id": 42,
  "query_text": "My landlord is refusing to return my security deposit...",
  "analysis": {
    "legal_category": "Property / Civil Law",
    "summary": "This matter involves wrongful retention of a security deposit, which can constitute criminal breach of trust under Indian law...",
    "relevant_sections": [
      {
        "section_number": "IPC 406",
        "title": "Criminal Breach of Trust",
        "description": "Dishonest misappropriation of property entrusted to a person.",
        "punishment": "Imprisonment up to 3 years, or fine, or both",
        "fine": "As per court discretion",
        "reference_link": "https://indiankanoon.org/doc/1941644/"
      }
    ],
    "possible_outcomes": [
      "You can send a legal notice demanding return within 30 days",
      "File a case in Consumer Forum or Civil Court for recovery"
    ],
    "precautions": ["Preserve all rent receipts and the original agreement"],
    "recommended_actions": ["Send a formal legal notice through a lawyer"]
  },
  "timestamp": "2024-11-15T10:23:41"
}
```

> **Note:** The API is hosted on Render's free tier and spins down after 15 minutes of inactivity. The first request after idle may take ~30 seconds. Subsequent requests are fast.

---

## Project Structure

```
ai-legal-assistant/
├── backend/
│   ├── main.py                  ← FastAPI app · CORS · router registration
│   ├── auth_utils.py            ← JWT create/verify · bcrypt hashing · get_current_user
│   ├── models.py                ← SQLAlchemy ORM: User · UserQuery · IPCSection
│   ├── schemas.py               ← Pydantic request/response validation schemas
│   ├── database.py              ← SQLite engine · session factory · Base class
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── auth.py              ← POST /signup · POST /login · GET /me
│   │   ├── query.py             ← POST /analyze · GET /history · GET /:id
│   │   └── report.py            ← GET /download/:id/pdf · GET /download/:id/docx
│   └── agents/
│       └── orchestrator.py      ← 5 AI agents · mock fallbacks · run_legal_analysis()
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx          ← Landing page · animated canvas background
        │   ├── layout.tsx        ← Root layout · Google Fonts · Toaster
        │   ├── globals.css       ← Global styles · CSS variables · scrollbar
        │   ├── login/page.tsx    ← Split-panel login · password toggle
        │   ├── signup/page.tsx   ← Signup · password strength meter
        │   ├── dashboard/page.tsx← Query form · case history sidebar · voice input
        │   └── case/[id]/page.tsx← Analysis result · IPC cards · PDF/DOCX download
        └── lib/
            └── api.ts            ← Axios instance · token helpers · all API calls
```

---

## Quick Start

### 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/legal-detective.git
cd legal-detective
```

### 2 — Backend setup

```bash
cd backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Open `.env` and configure:

```env
DATABASE_URL=sqlite:///./legal_assistant.db
SECRET_KEY=your-long-random-secret-key-here
GEMINI_API_KEY=your_gemini_key_here   # Leave blank to use intelligent mock responses
```

> **Get a free Gemini API key:** [aistudio.google.com](https://aistudio.google.com) → Get API Key → Create API Key. The free tier supports this project without any billing.

### 3 — Start the backend

```bash
uvicorn main:app --reload --port 8000
```

- Health check: [localhost:8000](http://localhost:8000)
- Interactive API docs: [localhost:8000/docs](http://localhost:8000/docs)

### 4 — Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000)

> **No frontend `.env` needed.** The frontend is pre-configured to talk to `http://localhost:8000`.

---

## API Reference

### `GET /`
Liveness probe. Confirms API is running.

```json
{ "message": "AI Legal Assistant API is running" }
```

### `POST /api/auth/signup`
Create a new user account.

```json
{ "name": "Rahul Sharma", "email": "rahul@example.com", "password": "securepassword" }
```

### `POST /api/auth/login`
Authenticate and receive a JWT token.

```json
{ "email": "rahul@example.com", "password": "securepassword" }
```

Response:
```json
{ "access_token": "eyJhbGciOiJIUzI1NiIsInR...", "token_type": "bearer" }
```

### `POST /api/query/analyze` 🔐
Analyze a legal situation. Requires `Authorization: Bearer <token>`.

**Request:**
```json
{ "query_text": "My employer hasn't paid salary for 3 months despite repeated requests." }
```

**Response:**
```json
{
  "query_id": 7,
  "query_text": "My employer hasn't paid salary for 3 months...",
  "analysis": {
    "legal_category": "Labour Law",
    "summary": "This is a case of non-payment of wages...",
    "relevant_sections": [
      {
        "section_number": "Payment of Wages Act",
        "title": "Non-payment of wages",
        "description": "Every employer must pay wages on time...",
        "punishment": "Fine up to Rs. 7,500 for first offence",
        "fine": "Up to Rs. 22,500",
        "reference_link": "https://indiankanoon.org/search/?formInput=payment+of+wages+act"
      }
    ],
    "possible_outcomes": ["..."],
    "precautions": ["..."],
    "recommended_actions": ["..."]
  },
  "timestamp": "2024-11-15T10:23:41"
}
```

### `GET /api/query/history` 🔐
Returns the authenticated user's case history (id, text, timestamp only — lightweight).

### `GET /api/query/{id}` 🔐
Returns full analysis for a specific case by ID.

### `GET /api/report/download/{id}/pdf` 🔐
Downloads a professionally formatted PDF report.

### `GET /api/report/download/{id}/docx` 🔐
Downloads a Word document report.

Full interactive docs at **[lexai-api.onrender.com/docs](https://lexbrain-ai.onrender.com/docs)**

---

## AI Pipeline

Five specialized agents run sequentially. Each has an independent fallback — if any agent fails, the rest continue.

| Agent | Role | Output |
|---|---|---|
| **01 · Case Understanding** | Classifies legal domain, extracts keywords, assesses severity | `legal_category` · `keywords` · `severity` |
| **02 · Legal Retrieval** | Identifies 3–4 most relevant IPC sections / legislation | `section_number` · `title` · `punishment` · `fine` · `reference_link` |
| **03 · Outcome Prediction** | Predicts 4–5 realistic legal outcomes | `possible_outcomes[]` |
| **04 · Precaution Advisor** | Advises immediate actions and what to avoid | `precautions[]` · `recommended_actions[]` |
| **05 · Case Summarizer** | Synthesizes into a 3-sentence plain English summary | `summary` string |

### Mock Fallback System

Every agent wraps its Gemini call in `try/except`. On failure, it calls a keyword-based mock:

```python
def legal_retrieval_agent(query, category, keywords):
    if not _gemini_available:
        return _mock_ipc_sections(query)   # keyword detection
    try:
        raw = _call_gemini(prompt)
        result = _extract_json(raw)
        if isinstance(result, list) and len(result) > 0:
            return result
    except Exception as e:
        print(f"[Agent2 Error] {e}")
    return _mock_ipc_sections(query)       # fallback on any failure
```

The `_extract_json()` function strips markdown fences and finds valid JSON within arbitrary LLM output — handling cases where Gemini adds explanations around the JSON.

---

## Performance

| Metric | Value |
|---|---|
| **Analysis time (with Gemini key)** | 8 – 25 seconds |
| **Analysis time (mock mode)** | < 1 second |
| **API response (history endpoint)** | < 100ms |
| **JWT token validity** | 1 year |
| **Max case history returned** | 50 most recent |
| **Report generation (PDF)** | < 2 seconds |
| **Concurrent users (free tier)** | ~10 |

---

## Deployment

### Backend — Render (free tier)

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service → connect repo
3. Configure:

```
Root Directory:   backend
Build Command:    pip install -r requirements.txt
Start Command:    uvicorn main:app --host 0.0.0.0 --port $PORT
```

4. Add environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Supabase PostgreSQL URI |
| `SECRET_KEY` | Any long random string |
| `GEMINI_API_KEY` | Your Gemini API key |

> **Production database:** Switch from SQLite to [Supabase](https://supabase.com) free PostgreSQL. Only `DATABASE_URL` needs to change.

### Frontend — Vercel (free forever)

1. Go to [vercel.com](https://vercel.com) → Add New Project → import repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-api-name.onrender.com` |

4. Deploy. Vercel auto-deploys on every push to `main`.

### Update CORS after deploying

In `backend/main.py`, add your Vercel URL:

```python
allow_origins=[
    "http://localhost:3000",
    "https://your-app.vercel.app",
    "https://*.vercel.app",
]
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14 · React 18 · TypeScript | UI framework · file-based routing · SSR |
| **Styling** | Tailwind CSS · Inline styles | Dark detective theme · animations |
| **HTTP Client** | Axios | API calls · JWT interceptor |
| **Backend** | FastAPI · Python 3.11 | REST API · auto Swagger docs |
| **ORM** | SQLAlchemy | Database models · queries |
| **Validation** | Pydantic v2 | Request/response schema validation |
| **Database** | SQLite (dev) · PostgreSQL (prod) | Persistent case storage |
| **AI** | Google Gemini 1.5 Flash | LLM for all 5 agents |
| **Auth** | python-jose (JWT) · passlib (bcrypt) | Stateless auth · password hashing |
| **PDF Reports** | ReportLab | Professional PDF generation |
| **DOCX Reports** | python-docx | Word document generation |
| **Voice Input** | Web Speech API | Real-time speech-to-text |
| **Backend hosting** | Render (free tier) | Cloud deployment |
| **Frontend hosting** | Vercel (free tier) | CDN · auto-deploy |
| **Prod database** | Supabase (free tier) | Managed PostgreSQL |

---

## Authentication

LexBrain AI uses **stateless JWT authentication**:

1. User signs up → password hashed with `bcrypt` via `passlib`
2. User logs in → backend verifies hash → creates JWT signed with `SECRET_KEY` (HS256)
3. JWT stored in **`localStorage`** — single source of truth, 1-year expiry
4. Every API request sends `Authorization: Bearer <token>` header
5. FastAPI's `get_current_user()` dependency decodes the token and resolves the user on every protected route — no session storage needed

**Why localStorage over cookies?** Eliminates cookie/localStorage conflicts that caused repeated logouts. For production, add `Content-Security-Policy` headers to mitigate XSS risk.

---

## Example Queries

| Legal Category | Example Query |
|---|---|
| **Cyber Crime** | *"Someone hacked my Instagram and is blackmailing me with private photos, demanding ₹50,000"* |
| **Labour Law** | *"My employer hasn't paid salary for 3 months and threatened to fire me if I complain"* |
| **Fraud / IPC 420** | *"I paid ₹25,000 to an online seller who never delivered and is now unreachable"* |
| **Property Law** | *"My landlord refuses to return ₹80,000 security deposit after 5 months of vacating"* |
| **Criminal Assault** | *"My neighbor physically attacked me last night and I have witnesses and bruise photos"* |
| **Business Dispute** | *"My business partner withdrew company funds without my knowledge or consent"* |

---

<div align="center">

Built as a full-stack portfolio project demonstrating end-to-end engineering — from multi-agent AI pipeline design and JWT authentication to report generation and cloud deployment.

*For informational purposes only · Not a substitute for professional legal advice · Always consult a qualified advocate for serious matters*

</div>
