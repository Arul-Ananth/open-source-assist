# Open Source Assist — System Documentation

Welcome to the comprehensive technical documentation for **Open Source Assist** — an intelligent, full-stack platform designed to accelerate open-source discovery, developer mentorship, skill assessment, and community collaboration.

The platform combines an asynchronous **FastAPI** backend with local **Qdrant Vector Database** indexing, **Google Gemini 3.5 Flash** (via LiteLLM & LangGraph), and a responsive **React + TypeScript + Vite** frontend.

## ⚡ Quick Start

To start all services (PostgreSQL schema check, FastAPI backend, and Vite frontend) with a single command:

**Windows (PowerShell):**
```powershell
.\start.ps1
```

**Windows (Command Prompt / Double Click):**
```cmd
start.bat
```

To stop all running services:
```powershell
.\stop.ps1
# or
stop.bat
```

Services started:
* **Frontend UI**: [http://localhost:5173](http://localhost:5173)
* **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Health**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 📚 Documentation Index

| Document | Description |
| :--- | :--- |
| **[1. System Architecture (End-to-End)](ARCHITECTURE.md)** | Full-stack platform architecture, component topology, LangGraph AI workflows, Airflow DAGs, and database ER schemas. |
| **[2. Search Module Architecture](doc/search_module/architecture.md)** | Subsystem architecture, separation of concerns, concurrency model, Python GIL avoidance, and Qdrant Server topology. |
| **[3. Search & Ranking Engine](doc/search_module/search_and_ranking.md)** | Mathematical formulation of semantic similarity, logarithmic popularity normalization, and the Strategy pattern. |
| **[4. Teammate Integration Guide](doc/integration/search_integration_backend.md)** | Integration guide for teammate modules (Ingestion, RAG, and Auth hooks). |
| **[5. Deployment & Operations](doc/deployment_and_operations.md)** | Docker Compose configuration, Qdrant Cloud deployment, environment configuration, database seeding, and testing with `uv`. |
| **[6. API Contract & Changelog](API_CONTRACT.md)** | Formal versioned API contracts, HTTP endpoints, status codes, and request/response JSON schemas. |
| **[7. Database Design & Schemas](doc/database_design.md)** | Complete PostgreSQL relational ER diagrams, constraints reference, and Qdrant vector database topology. |

---

## 🚀 Platform Capabilities

* **Dual-Tier Semantic & Hybrid Search**:
  * Dense semantic vector retrieval over indexed open-source repositories using local 384-dimensional ONNX embeddings (`BAAI/bge-small-en-v1.5`).
  * Logarithmic popularity dampening and **Multiplicative Gate** re-ranking ($\text{FinalScore} = S_{\text{semantic}} \times [1 + \alpha \cdot P_{\text{popularity}}]$).
  * Seamless fallback from live GitHub Search API (OAuth users) to local Qdrant vectors (guest users).
* **Personalized AI Roadmaps & Skill Assessments**:
  * Dynamic GitHub-grounded MCQ and subjective question generation.
  * Automated scoring and context synthesis powered by Google Gemini via LangGraph.
  * Interactive roadmap step progression and milestone tracking.
* **Community Events & Admin Management**:
  * Event calendar for upcoming open-source meetups, conferences, and hackathons.
  * Dedicated administrator panel for scheduling, editing, and managing events.
* **Projects & Contributor Ecosystem**:
  * Curated directory of trending open-source projects.
  * Contributor discovery with avatars, GitHub activity stats, and commit counts.
* **Skill-Aware AI Mentorship & Discussions**:
  * AI chatbot calibrated to individual developer experience levels.
  * Community discussion forum with threaded replies and admin moderation.

---

## 🔐 Authentication & Security

The backend provides comprehensive PostgreSQL-backed authentication and authorization:

* **Email & Password**:
  * `POST /api/v1/auth/signup` (Dispatches 6-digit OTP via SMTP)
  * `POST /api/v1/auth/verify-signup-otp` (Validates OTP and registers user)
  * `POST /api/v1/auth/login` (Returns Bearer JWT)
  * `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/reset-password`
  * `GET /api/v1/auth/me` (Current user profile and permissions)
* **GitHub OAuth**:
  * `GET /api/v1/auth/github/url`
  * `GET /api/v1/auth/github/callback` & `POST /api/v1/auth/github/callback`
  * `POST /api/v1/auth/github/pat-login` (Development fallback)
* **Email Delivery**:
  * Built using `aiosmtplib` in [`backend/services/mail_service.py`](backend/services/mail_service.py) supporting STARTTLS and SSL.


