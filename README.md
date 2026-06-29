<div align="center">

<img src="https://img.shields.io/badge/Placement%20Intelligence-Platform-1F4E79?style=for-the-badge&logoColor=white" />

# 🎓 Placement Intelligence Platform

### *AI-powered end-to-end placement preparation — company research, real OSS missions, DSA prep, and career intelligence in one unified system*

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-placement--intel--portal.vercel.app-2E75B6?style=for-the-badge)](https://placement-intel-portal.vercel.app/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-FF6B35?style=for-the-badge)](https://langchain-ai.github.io/langgraph/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Containerised-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com/)
[![Jenkins](https://img.shields.io/badge/Jenkins-CI%2FCD-D24939?style=for-the-badge&logo=jenkins&logoColor=white)](https://jenkins.io/)

---

> **"Not just another placement portal. A production-grade AI intelligence system that researches companies at depth, verifies real open-source contributions, trains competitive coding skills, and builds a verifiable placement portfolio — all from a single platform."**

**→ [placement-intel-portal.vercel.app](https://placement-intel-portal.vercel.app/)**

</div>

---

## 📌 Table of Contents

- [What This Platform Does](#-what-this-platform-does)
- [System Architecture](#-system-architecture)
- [Core Features](#-core-features)
  - [Company Intelligence Engine](#1--company-intelligence-engine)
  - [MissionX Labs](#2--missionx-labs)
  - [DSA Buddy](#3--dsa-buddy)
  - [Aptitude Learning Tracker](#4--aptitude-learning-tracker)
  - [Career Intelligence Dashboard](#5--career-intelligence-dashboard)
  - [Student Career Dashboard](#6--student-career-dashboard)
  - [Dream Company Tracker](#7--dream-company-tracker)
  - [Interview Experience Sharing](#8--interview-experience-sharing-section)
  - [Placement Timeline Tracker](#9--placement-timeline-tracker)
  - [Smart Placement Heatmap](#10--smart-placement-heatmap-dashboard)
  - [Hidden Opportunity Detector](#11--hidden-opportunity-detector)
  - [Company Relationship Map](#12--company-relationship-map)
  - [Competitive Preparation Arena](#13--competitive-preparation-arena)
  - [Candidate Rejection Probability Engine](#14--candidate-rejection-probability-engine)
  - [AI Project Idea Generator](#15--ai-project-idea-generator)
- [Tech Stack](#-tech-stack)
- [Key Technical Highlights](#-key-technical-highlights)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Docker Deployment](#-docker-deployment)
- [CI/CD Pipeline](#-cicd-pipeline)

---

## 🚀 What This Platform Does

The **Placement Intelligence Platform** is a full-stack AI-powered system built to give engineering students a genuine data-driven edge in campus recruitment. It solves three fundamental problems that no existing placement tool addresses together:

| Problem | What This Platform Does |
|---|---|
| Students don't know enough about companies | Multi-agent LangGraph pipeline researches 140+ companies across 163 parameters — financials, culture, tech stack, hiring patterns, compensation, and more |
| Students can't prove real-world skills | MissionX Labs connects students to live GitHub issues from 48 major company repositories — real contributions, verified by AI, not simulated practice |
| Preparation is scattered and generic | DSA Buddy, Aptitude Tracker, Career Intelligence, and 10+ more features give structured, personalised preparation in one unified system |

---

## 🏗 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                  Placement Intelligence Platform                  │
├──────────────────┬──────────────────────┬────────────────────────┤
│  React Frontend  │   FastAPI Backend    │  Intelligence Engine   │
│  TanStack Router │   19 Route Modules   │  LangGraph Pipeline    │
│  Zustand State   │   4-Layer Middleware │  6 LLM Providers       │
│  Vite + Nginx    │   Circuit Breakers   │  163-Field Schema      │
└────────┬─────────┴──────────┬───────────┴────────────┬───────────┘
         │                    │                          │
         ▼                    ▼                          ▼
   ┌──────────┐     ┌─────────────────┐     ┌─────────────────────┐
   │  Vercel  │     │    Supabase     │     │   Tavily Search     │
   │  Static  │     │   PostgreSQL    │     │   GitHub API        │
   │  Hosting │     ├─────────────────┤     │   LangSmith Tracing │
   └──────────┘     │  Redis Cache    │     └─────────────────────┘
                    │  (1hr TTL)      │
                    ├─────────────────┤
                    │  Local Cache    │
                    │  field_cache    │
                    │  validated_mem  │
                    └─────────────────┘
```

### Middleware Stack (every request passes through all 4 layers)

```
Request → RequestIDMiddleware (UUID stamp)
        → TimeoutMiddleware (300s — supports long AI workflows)
        → LoggingMiddleware (structured JSON logs)
        → CORS
        → Router
```

---

## 🔬 Core Features

---

### 1. 🧠 Company Intelligence Engine

The most technically sophisticated component of the platform. A **stateful multi-agent research pipeline** built on LangGraph that automatically researches any company and produces a structured intelligence record covering **163 canonical parameters**.

#### Pipeline Flow

```
Entry Node
  ├── Hydrate from Supabase (if record exists)
  ├── Classify all 163 fields:
  │     VALIDATED | MISSING | CORRUPTED | STALE | WEAK_CONFIDENCE
  └── Temporal drift pre-scan (Tavily search for recent signals)
        ├── CEO mismatch detected → flag leadership section
        ├── New funding round → flag financials section
        └── Layoff language → flag culture + brand sections

Parallel Research Node
  ├── Process only missing/stale fields (field-level granularity)
  ├── Priority micro-batching (critical=3 fields, important=5, optional=7)
  └── Provider-side validation after every micro-batch

LLM Orchestration Layer
  ├── 6 providers: Groq → Cerebras → Gemini → Together → Anthropic → OpenRouter
  ├── Circuit breaker per provider (opens at 3 failures, exponential backoff)
  ├── HTTP 429 → 90s cooldown | HTTP 402 → permanent session lockout
  ├── Prompt fingerprinting (MD5 hash → skip duplicate failed calls)
  └── Model rotation across free-tier endpoints (OpenRouter + Together)

Validation Node → Consolidation Node → Analysis Node → Retry Node → Supabase Persist
```

#### The 163 Parameters Cover

| Section | Key Parameters |
|---|---|
| **Overview** | Legal name, HQ, employee count, incorporation year, business description |
| **Leadership** | CEO name, CEO LinkedIn, executives list, board composition |
| **Financials** | Revenue, valuation, funding rounds, burn rate, runway months, stock ticker |
| **Tech & Innovation** | Tech stack, core engineering tools, R&D investment, active patents |
| **Business & Market** | Competitors, market share, target market, operating countries |
| **Brand & Digital** | Glassdoor rating, Indeed rating, LinkedIn URL, website traffic rank, NPS |
| **Culture & People** | D&I stance, layoff history, burnout risk, psychological safety, manager quality |
| **Compensation** | Pay ranges, ESOP, RSU, health insurance, leave policy, remote work policy |
| **Learning & Growth** | Internal mobility programs, mentorship, L&D budget |
| **Work Logistics** | Office locations, commute options, hybrid flexibility |

#### Field-Level Caching — The Key Innovation

```
Most AI pipelines: re-run everything if anything needs updating
This system:       tracks each of 163 fields individually

Per-field metadata:
  ├── State:      VALIDATED | MISSING | CORRUPTED | STALE | WEAK_CONFIDENCE
  ├── Freshness:  high-priority fields → stale after 1 day
  │               all others         → stale after 7 days
  ├── Provenance: REAL_EXTRACTED | CACHE_VERIFIED | DERIVED | INFERRED
  └── Confidence: 0.0 → 1.0

If all 163 fields are fresh and validated → extraction stage skipped entirely
```

#### Data Storage Architecture

```
Supabase (primary)       → company_json table (163-field JSON blob + metadata)
Redis (session cache)    → missions board (1hr TTL), hot query results
field_cache.json (local) → write-through cache, absorbs fields as LLM extracts
validated_memory.json    → curated snapshot, only records with quality score ≥ 80
```

#### Validation Suite

A standalone quality assurance pipeline that runs independently:

| Validator | What It Checks |
|---|---|
| Numeric Validator | All numerical fields within expected ranges |
| Financial Validator | Cross-field consistency — revenue vs profit vs valuation |
| String Validator | Placeholder values, truncated strings, encoding issues |
| URL Validator | All URL fields resolve to accessible endpoints |
| Record Validator | No two companies share the same CEO, website, or LinkedIn URL |
| Dependency Validator | Logical consistency — pre-revenue company cannot have revenue figure |

---

### 2. 🎯 MissionX Labs

> *Real contributions. Verified proof. Not simulated practice.*

A gamified open-source contribution platform that presents **live GitHub issues** from **48 major technology company repositories** as student missions.

#### Supported Repositories Include

`Next.js` · `React` · `React Native` · `VS Code` · `TypeScript` · `Playwright` · `Flutter` · `TensorFlow` · `Angular` · `Netflix Eureka` · `Netflix Zuul` · `Spotify Backstage` · `Stripe Node SDK` · `Redis` · `OpenAI Python SDK` · `OpenAI Node SDK` · and 30+ more

#### How It Works

```
Board loads → GitHub API queried concurrently for all 48 repos
           → Failed repos skipped gracefully
           → Issues deduplicated by ID
           → If live fetch < 200 issues → merge real_seed_missions.json fallback
           → Sort: Vercel Beginner first → All Beginner → Intermediate → Advanced
```

#### Difficulty and XP System

| Label / Heuristic | Difficulty | XP |
|---|---|---|
| `good first issue` | 🟢 Beginner | 100 XP |
| `help wanted` / `enhancement` | 🟡 Intermediate | 250 XP |
| High body length + high comment count bug | 🔴 Advanced | 500 XP |

#### 5-Step PR Verification Pipeline

```
Step 1 → Parse GitHub URL (extract owner, repo, PR number/branch/commit)
Step 2 → Verify repository exists via GitHub API
Step 3 → Confirm valid fork relationship (check parent + source fields)
Step 4 → Fetch actual code diff for the PR or branch comparison
Step 5 → LLM semantic relevance check:
         Input:  issue title + issue description + first 6,000 chars of diff
         Output: boolean (relevant/not relevant) + plain-English reason
         If NO → submission rejected with AI reasoning shown to student

Rate limit hit at any step → optimistic acceptance (logs constraint, never blocks student)
```

#### Portfolio Auto-Generation

Every completed mission updates the student profile with:
- Total XP and mission count
- PR merge status per contribution
- Company readiness badges (Bronze / Silver / Gold)
- Verified skill tags from completed mission labels
- Public shareable portfolio URL with verified GitHub PR links

---

### 3. 💻 DSA Buddy

An AI-powered competitive coding environment with five integrated sub-modules:

| Sub-Module | Description |
|---|---|
| **Dashboard** | Practice history overview, performance metrics, streak tracking, progress charts |
| **Arena** | Live competitive coding interface with WebSocket real-time communication, problem statements, and code editor |
| **Assessment** | Timed assessments with a curated bank of company-specific questions |
| **Mock OA Simulator** | Replicates real online assessment formats used by Amazon, Google, and Microsoft |
| **Submissions** | Full history of attempted problems, outcomes, and solution review |

**AI Capabilities:**
- Hint generation powered by OpenRouter (rotates across free-tier models)
- Code quality evaluation with dimension-wise feedback
- Isolated code execution via sandbox executor

**Real-time Infrastructure:**
- WebSocket manager for live arena sessions
- Dedicated `openrouter.py` service module
- `sandbox_executor.py` for isolated, safe code execution

---

### 4. 📊 Aptitude Learning Tracker

An AI-powered aptitude preparation system that goes beyond generic practice:

- Tracks performance across all aptitude topic categories
- Identifies weak topics using accuracy and solving speed analysis
- Generates personalised daily practice plans with progressive difficulty
- Analyses solving speed vs accuracy per topic
- Maps aptitude weak spots to company-specific shortlisting criteria
- Provides timed mock aptitude tests with detailed post-test breakdowns
- Tracks improvement velocity week-over-week

---

### 5. 🔍 Career Intelligence Dashboard

Surfaces real-time intelligence that directly affects placement strategy:

- **Live Company Intelligence Tracker** — monitors company hiring announcements, funding news, layoffs, product launches, and technology shifts; translates each signal into direct placement impact
- **Placement Risk Intelligence Engine** — tracks hiring freezes, layoff announcements, and market instability across target companies; provides early warning alerts and alternative company suggestions
- **Real-Time Industry Shift Radar** — detects emerging technologies and skill demand shifts before they become mainstream, giving students first-mover advantage
- **Company Future Simulation Engine** — predicts company growth trajectory, technology adoption rate, and hiring volume changes over 1–3 years using funding data and market signals from the 163-parameter database

---

### 6. 🖥 Student Career Dashboard

A unified personal command centre for every student:

- Placement readiness score (composite across DSA, aptitude, projects, and profile)
- Skill gap analysis mapped to target companies
- Recommended companies based on current profile
- Upcoming drive alerts and application deadlines
- Daily action items and preparation milestones
- Week-over-week progress tracking

---

### 7. 🎯 Dream Company Tracker

Goal-oriented company tracking with full preparation alignment:

- Student sets dream companies with target roles
- Platform monitors all hiring activity for those companies
- Sends alerts on new job postings, eligibility changes, and interview pattern updates
- Auto-generates a personalised roadmap with milestones to reach the target company
- Shows alumni connections and their roles at the dream company
- Tracks compatibility score vs current profile and shows what's missing

---

### 9. 📅 Placement Timeline Tracker

A centralised placement drive management system:

- Aggregates all placement drives, application deadlines, test dates, interview rounds, and result announcements in one timeline
- Sends personalised reminders based on student eligibility and target company list
- Eligibility checker — auto-flags which drives the student qualifies for based on CGPA and branch
- Countdown timers per deadline
- One-click application tracking from timeline view
- Integrates with the Career Intelligence layer to flag companies at risk of freezes

---

### 10. 🌡 Smart Placement Heatmap Dashboard

A real-time visual intelligence layer for placement market awareness:

- Heatmap of which skills are in highest demand right now
- Which companies are actively hiring vs paused vs frozen
- Which roles have the highest offer volume this season
- Which student profiles are most successful at each company
- College-specific heatmap vs national placement trends
- 6-month skill demand prediction based on market signals

---

### 11. 🔎 Hidden Opportunity Detector

Surfaces placement opportunities students would never find manually:

- Analyses student profile and finds lesser-known companies that are a strong skill match
- Uses the 163-parameter company database to match on tech stack, culture fit, salary range, and growth stage
- Similarity scoring vs dream company — "this company is 87% similar to Google but 4x easier to get into"
- Internship and PPO opportunities from companies not visiting campus
- Growth trajectory analysis of recommended companies
- One-click apply tracking from recommendation

---

### 12. 🗺 Company Relationship Map

An interactive visual ecosystem explorer:

- Shows how companies connect — parent companies, subsidiaries, tech partnerships, and hiring pipelines
- Alumni network overlay — which alumni work where and at what seniority
- Industry cluster view — see all companies in a segment together
- Click any company node to see full 163-parameter intelligence card
- "Companies like this" recommendation engine based on graph proximity
- Identifies companies that share hiring pipelines — get into one, the other becomes easier

---

### 13. ⚔ Competitive Preparation Arena

A gamified real-time competitive preparation environment:

- Live rooms where students compete simultaneously on timed DSA + aptitude + HR rounds
- Global and college-level leaderboards updated in real time
- Achievement badges and streak rewards for consistent participation
- Weekly championship tournaments
- Performance analytics broken down by category after each round
- Simulates the exact pressure environment of a real placement drive

---

### 14. 📉 Candidate Rejection Probability Engine

Tells students exactly why they will be rejected — before they apply:

- Analyses student profile against the company's historical hiring patterns from the 163-parameter database
- Predicts rejection probability with a confidence score
- Categorises rejection reasons: skill gap, CGPA filter, wrong project type, missing tech stack keyword
- Shows which specific changes would move the needle most
- Tracks improvement over time as student addresses flagged gaps
- Reduces blind applications and wasted screening cycles

---

### 15. 💡 AI Project Idea Generator

Generates placement-aligned project ideas personalised to each student:

- Inputs: student's current tech stack, target companies, current skill gaps, and available time
- Output: full project blueprint with problem statement, tech stack, architecture outline, and expected skill outcomes
- Project relevance score per target company — "this project is 91% relevant for a Razorpay backend role"
- Difficulty levels from weekend builds to 3-week capstone projects
- GitHub README template auto-generated per project idea
- Directly addresses the most common rejection reason: generic or irrelevant projects

---

## 🛠 Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **FastAPI** | REST API framework — 19 route modules covering all platform features |
| **LangGraph** | Stateful multi-agent pipeline orchestration for company research |
| **LangChain** | LLM abstraction, prompt management, chain construction |
| **Supabase (PostgreSQL)** | Primary database — company intelligence, user data, missions, portfolio |
| **Redis** | Session-level cache — missions board (1hr TTL), hot query results |
| **Tavily** | Web search API for real-time company research during pipeline runs |
| **LangSmith** | Full LLM observability — every call traced and logged |
| **GitHub REST API** | Live issue fetching for MissionX Labs, PR verification |

### Frontend

| Technology | Purpose |
|---|---|
| **React 18** | Core UI framework |
| **TanStack Router** | File-based routing with type-safe route tree generation |
| **Zustand** | State management for DSA Buddy module |
| **Vite** | Build tool, development server, and proxy configuration |
| **Nginx** | Static file serving and reverse proxy in production |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Full container orchestration for both services |
| **Jenkins** | CI/CD pipeline with zero-downtime deployment strategy |
| **Vercel** | Frontend deployment and global CDN |

### AI / LLM Providers

| Provider | Role |
|---|---|
| **Groq** | Primary provider — fastest free-tier inference |
| **Cerebras** | Primary co-provider — high reliability |
| **Google Gemini** | Fallback — large context window |
| **Together AI** | Fallback with model rotation |
| **Anthropic Claude** | High-quality fallback for complex extraction |
| **OpenRouter** | Recovery provider — widest model rotation, used for retry pass |

---

## ⚡ Key Technical Highlights

```
Field-level caching on 163 parameters
  Most AI pipelines re-run everything. This system tracks each field
  individually — age, confidence, provenance — and only re-extracts
  what has actually degraded. Reduces LLM cost dramatically.

Temporal drift detection
  Every pipeline run autonomously scans for signals that cached
  company data may have become inaccurate. No human scheduling needed.
  CEO mismatch → leadership refresh. New funding → financials refresh.

6-provider LLM failover with circuit breakers
  Designed to complete extraction even when multiple providers are
  simultaneously rate-limited. Prompt fingerprinting prevents duplicate
  failed calls from consuming rate limit budget.

Two-layer PR verification (MissionX Labs)
  Deterministic checks (valid repo, valid fork relationship) combined
  with LLM semantic analysis of the actual code diff against the issue.
  Difficult to game. Practically useful for real engineering assessment.

WebSocket real-time architecture (DSA Buddy Arena)
  Live competitive sessions with multiple concurrent users via WebSocket
  manager. Isolated code execution via dedicated sandbox executor.

300-second timeout alignment
  FastAPI TimeoutMiddleware, Nginx proxy timeout, and CI config all
  aligned to accommodate long-running multi-agent AI workflows.

Predictive provider priority scoring
  LLM provider fallback chain reordered in real-time based on recent
  performance. High success streak → promoted. Failure streak → demoted.
```

---

## 🏁 Getting Started

### Prerequisites

```bash
Python 3.11+
Node.js 18+
Docker + Docker Compose
Redis (local or Upstash cloud)
```

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/placement-intel-portal.git
cd placement-intel-portal
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
# Fill in your keys — see Environment Variables section
```

### 5. Run Locally

```bash
# Terminal 1 — Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

### 6. Or Run with Docker

```bash
docker-compose up --build
```

Visit [http://localhost:80](http://localhost:80)

---

## 🔐 Environment Variables

### Backend `.env`

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# LLM Providers (any combination works — circuit breakers handle missing ones)
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
CEREBRAS_API_KEY=your_cerebras_key
TOGETHER_API_KEY=your_together_key
ANTHROPIC_API_KEY=your_anthropic_key
OPENROUTER_API_KEY=your_openrouter_key

# Search
TAVILY_API_KEY=your_tavily_key

# Cache
REDIS_URL=redis://localhost:6379

# Observability
LANGSMITH_API_KEY=your_langsmith_key
LANGSMITH_PROJECT=placement-intel-portal
```

### Frontend `.env`

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000
```

> You don't need all LLM providers. The system works with any combination — circuit breakers and fallback chains handle missing providers gracefully.

---

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up --build -d

# Stream logs
docker-compose logs -f

# Stop services
docker-compose down
```

The Docker setup includes:
- FastAPI backend container on port 8000
- React frontend served via Nginx on port 80
- Nginx reverse proxy routing `/api` → FastAPI
- 300-second proxy timeout aligned with AI pipeline duration

---

## 🔄 CI/CD Pipeline

Jenkins pipeline with full zero-downtime deployment:

```
Stage 1 → Docker image build
Stage 2 → Container health validation with retry logic
Stage 3 → Port conflict detection and resolution
Stage 4 → Selective container pruning
          (removes only exited containers, never healthy running ones)
Stage 5 → Zero-downtime reconcile deployment strategy
```

Every LLM call is traced in LangSmith for full pipeline observability.

---

## 📊 Platform Stats

```
163    Company intelligence parameters tracked per company
140+   Companies researched and stored in the intelligence database
48     OSS repositories monitored for live GitHub missions
6      LLM providers with automatic failover and circuit breakers
19     FastAPI route modules
15+    Student-facing features across preparation, intelligence, and portfolio
5      DSA Buddy sub-modules
3      Layers of data persistence (Supabase + Redis + local cache)
300s   Maximum AI pipeline timeout supported end-to-end
```

---

## 📄 License

© 2026 Placement Intelligence Platform. Built for educational and placement intelligence purposes.

---

<div align="center">

[![Live Platform](https://img.shields.io/badge/🌐_Live_Platform-Visit_Now-1F4E79?style=for-the-badge)](https://placement-intel-portal.vercel.app/)

*If this project helped you, star it on GitHub ⭐*

</div>
