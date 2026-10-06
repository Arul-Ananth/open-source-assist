# Open Source Assist — System Architecture & Technical Design

This document details the end-to-end system architecture, component topologies, data flows, database schemas, and AI agent workflows for the **Open Source Assist** platform.

---

## 1. High-Level System Architecture

The following diagram illustrates the complete end-to-end architecture across client interfaces, API routing, business services, AI agent graphs, database engines, and external integrations.

```mermaid
flowchart TD
    %% Clients
    subgraph ClientTier["Client Tier (Frontend SPA)"]
        UI["React 18 + Vite + TypeScript"]
        Tailwind["Tailwind CSS + shadcn/ui"]
        Zustand["Zustand Stores (Auth, State)"]
        UI --- Tailwind
        UI --- Zustand
    end

    %% Gateway & API
    subgraph ApiTier["FastAPI Application Tier (Async Python 3.12)"]
        FastAPIApp["FastAPI Main App (ASGI)"]
        CORS["CORS Middleware"]
        Lifespan["Lifespan Startup & OTP Purge Task"]
        FastAPIApp --> CORS
        FastAPIApp --> Lifespan

        subgraph Routers["API Routers (/api/v1)"]
            R_Auth["Auth (/auth)"]
            R_Users["Users (/users)"]
            R_Search["Search & Ingestion (/search)"]
            R_Chatbot["AI Chatbot (/chatbot)"]
            R_Learn["AI Learning (/learning)"]
            R_Assess["Skill Assessment (/assessment)"]
            R_Projects["Projects (/projects)"]
            R_Contrib["Contributors (/contributors)"]
            R_Roadmaps["Roadmaps (/roadmaps)"]
            R_Forum["Forum (/forum)"]
            R_Events["Events (/events)"]
            R_Admin["Admin (/admin)"]
            R_Airflow["Airflow Trigger (/airflow)"]
        end
        FastAPIApp --> Routers
    end

    %% Business Services
    subgraph ServiceTier["Domain & Service Tier"]
        AuthSvc["Auth & OTP Service"]
        SearchSvc["Search & Reranking Service"]
        EmbedSvc["Embedding Service (FastEmbed ONNX)"]
        ChatbotAgent["Skill-Aware Chatbot (LangGraph)"]
        LearnAgent["Learning Materials Agent (LangGraph)"]
        AssessSvc["Skill Assessment & Context Synthesizer"]
        RoadmapSvc["Roadmap & Progress Service"]
        GithubSvc["GitHub Client & Sync Service"]
        ForumSvc["Forum & Moderation Service"]
    end

    %% Data & Orchestration
    subgraph DataTier["Data & Persistence Tier"]
        PG[("PostgreSQL 15+ (Relational DB)")]
        Qdrant[("Qdrant Vector DB (Port 6333/6334)")]
    end

    subgraph PipelineTier["Data Orchestration Tier"]
        Airflow["Apache Airflow (github_sync_weekly DAG)"]
    end

    %% External APIs
    subgraph ExternalTier["External Services"]
        GitHubAPI["GitHub REST API (v3)"]
        GeminiAPI["Google Gemini LLM (via LiteLLM)"]
        SMTP["Email / SMTP Service"]
    end

    %% Client to API
    UI -->|"HTTP REST / JSON (Axios & Fetch)"| FastAPIApp

    %% Routers to Services
    R_Auth --> AuthSvc
    R_Search --> SearchSvc
    R_Chatbot --> ChatbotAgent
    R_Learn --> LearnAgent
    R_Assess --> AssessSvc
    R_Projects --> GithubSvc
    R_Contrib --> GithubSvc
    R_Roadmaps --> RoadmapSvc
    R_Forum --> ForumSvc
    R_Airflow --> Airflow

    %% Services to Components
    SearchSvc --> EmbedSvc
    SearchSvc --> Qdrant
    SearchSvc -.->|"Hybrid Mode (OAuth Users)"| GitHubAPI
    ChatbotAgent --> GeminiAPI
    LearnAgent --> GeminiAPI
    AssessSvc --> GeminiAPI
    AssessSvc --> GithubSvc
    AuthSvc --> SMTP
    GithubSvc --> GitHubAPI

    %% Services to Databases
    AuthSvc --> PG
    RoadmapSvc --> PG
    ForumSvc --> PG
    AssessSvc --> PG
    Airflow -->|"Weekly Scheduled Sync"| GitHubAPI
    Airflow -->|"Upsert Repos & Contributors"| PG
    Airflow -->|"Vector Ingest"| Qdrant
```

---

## 2. Dual-Tier Semantic & Hybrid Search Architecture

The search engine features a dual-tier execution path optimized for both guests and authenticated GitHub users, combining dense vector embeddings with logarithmic popularity re-ranking.

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client
    participant Router as Search Router (/api/v1/search)
    participant SearchService as Search Service
    participant EmbedService as Embedding Service (FastEmbed)
    participant Qdrant as Qdrant Vector DB
    participant GitHub as GitHub REST API
    participant Reranker as Multiplicative Gate Reranker

    User->>Router: POST /api/v1/search (query, filters, popularity_weight)
    Router->>SearchService: search_repositories(request, optional_auth)

    alt OAuth User Present (Hybrid Search Mode)
        par Parallel Execution: Local Vector Retrieval + GitHub Live Search
            SearchService->>EmbedService: embed_query(query) via asyncio.to_thread
            EmbedService-->>SearchService: 384-d dense vector
            SearchService->>Qdrant: search(collection, vector, payload_filters, limit)
            Qdrant-->>SearchService: Top candidate vector points
        and Live GitHub Search API
            SearchService->>GitHub: GET /search/repositories?q={query} (User OAuth Token)
            GitHub-->>SearchService: Live GitHub Repositories
        end
        SearchService->>SearchService: Deduplicate candidates & dispatch background ingestion to Qdrant
    else Guest / Non-OAuth (Semantic Only Mode)
        SearchService->>EmbedService: embed_query(query) [ONNX non-blocking]
        EmbedService-->>SearchService: 384-d dense vector
        SearchService->>Qdrant: search(collection, vector, payload_filters, limit)
        Qdrant-->>SearchService: Top candidate vector points
    end

    SearchService->>Reranker: calculate_score(S_semantic, P_popularity, alpha)
    Note over Reranker: Score = S_semantic * (1 + alpha * P_popularity)
    Reranker-->>SearchService: Ranked and scored repositories
    SearchService-->>Router: Paginated SearchResponse (items, duration_ms, search_mode)
    Router-->>User: 200 OK JSON Response
```

### Key Concurrency Design:
1. **Zero GIL Lock**: FastEmbed runs on ONNX Runtime (C++). Wrapped in `asyncio.to_thread()`, freeing Python's event loop to handle concurrent I/O.
2. **Multiplicative Gate Formulation**:
   $$\text{FinalScore} = S_{\text{semantic}} \times \left(1 + \alpha \cdot P_{\text{popularity}}\right)$$
   Semantic relevance is mandatory (the gate); high star/fork counts cannot elevate irrelevant projects.
3. **Logarithmic Popularity Dampening**:
   $$P_{\text{popularity}} = \min\left(1.0, \frac{\log_{10}(\text{stars} + 1) + 0.5 \cdot \log_{10}(\text{forks} + 1)}{\log_{10}(\text{max\_stars} + 1) + 0.5 \cdot \log_{10}(\text{max\_forks} + 1)}\right)$$

---

## 3. LangGraph AI Agent Architectures

The platform uses **LangGraph** state machines to orchestrate structured, deterministic LLM interactions using Google Gemini and LiteLLM.

### A. Skill-Aware Chatbot Agent (`chatbot_agent.py`)

```mermaid
flowchart LR
    Start([User Question + Skill Profile]) --> Node1["analyze_skill_context_node<br/>- Evaluates Experience, Stack, Level<br/>- Calibrates depth & code style"]
    Node1 --> Node2["generate_answer_node<br/>- Invokes Gemini via LiteLLM<br/>- Enforces StructuredChatbotOutput schema"]
    Node2 --> End([Structured Output<br/>Answer + Code Snippets + Citations])
```

### B. Learning Materials & Citation Agent (`learning_agent.py`)

```mermaid
flowchart LR
    Start([Topic + Skill Level + Context]) --> Node1["analyze_skill_and_topic_node<br/>- Maps curriculum goals<br/>- Determines depth requirements"]
    Node1 --> Node2["generate_materials_node<br/>- Structured output schema via Gemini<br/>- Generates modules & verified citations"]
    Node2 --> End([Learning Modules + Cited Materials])
```

### C. GitHub-Grounded Skill Assessment & Context Synthesis

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer
    participant UI as Skill Assessment Modal
    participant Router as Assessment Router
    participant Service as Assessment Service
    participant GitHub as GitHub Service
    participant Gemini as Gemini AI
    participant DB as PostgreSQL (User Record)

    User->>UI: Request Skill Assessment
    UI->>Router: POST /api/v1/assessment/generate (github_username)
    Router->>Service: generate_assessment()
    Service->>GitHub: fetch_user_repositories(username)
    GitHub-->>Service: Repositories & Tech Stack
    Service->>Gemini: Generate MCQs & Subjective Questions grounded in user repos
    Gemini-->>Service: Tailored Questions
    Service-->>UI: Assessment Questions

    User->>UI: Submit Answers (MCQ selections + subjective reasoning)
    UI->>Router: POST /api/v1/assessment/evaluate (answers)
    Router->>Service: evaluate_assessment()
    Service->>Gemini: Grade answers & synthesize 1-line user_context summary
    Gemini-->>Service: Scores, feedback, and user_context string
    Service->>DB: UPDATE users SET skill_level = ..., user_context = ...
    Service-->>UI: Evaluation Results + Updated Skill Profile
```

---

## 4. Airflow Data Ingestion Pipeline (`github_sync_dag.py`)

Scheduled weekly synchronization of top open-source projects, maintainers, and contributors:

```mermaid
flowchart LR
    subgraph DAG["Airflow DAG: github_sync_weekly (Runs every 7 days)"]
        T1["create_tables<br/>Ensures DB tables exist"] --> T2["full_sync<br/>Fetches curated repos & commits from GitHub API"]
        T2 --> T3["contributor_refresh<br/>Pulls top contributors, profiles & social details"]
    end

    T2 -->|"Upsert Repositories"| PG[("PostgreSQL")]
    T2 -->|"Batch Embed & Upsert Vectors"| Qdrant[("Qdrant Vector DB")]
    T3 -->|"Upsert Contributors"| PG
```

---

## 5. Relational Database Schema Architecture (PostgreSQL)

The relational schema is managed with **SQLAlchemy 2.0 (Async)** and **Alembic** migrations:

```mermaid
erDiagram
    USERS ||--o{ USER_ROADMAP_PROGRESS : tracks
    USERS ||--o{ FORUM_POSTS : writes
    USERS ||--o{ FORUM_THREADS : starts
    USERS ||--o{ FORUM_BANS : receives
    USERS ||--o{ OTPS : requests

    ROADMAPS ||--|{ ROADMAP_STEPS : contains
    ROADMAP_STEPS ||--o{ USER_ROADMAP_PROGRESS : references

    FORUM_THREADS ||--|{ FORUM_POSTS : contains

    USERS {
        uuid id PK
        string email UK
        string username
        string github_username
        string github_access_token
        string user_context
        string skill_level
        string password_hash
        string role
        string account_status
        boolean is_active
        jsonb context
        timestamp created_at
        timestamp updated_at
    }

    OTPS {
        uuid id PK
        string email
        string hashed_otp
        string purpose
        jsonb metadata_payload
        boolean is_used
        timestamp expires_at
        timestamp created_at
    }

    PROJECTS {
        integer id PK
        string name
        string owner
        string description
        string html_url
        string language
        integer stars
        integer forks
        integer open_issues
        jsonb topics
        timestamp created_at
        timestamp updated_at
    }

    CONTRIBUTORS {
        integer id PK
        string username UK
        string name
        string avatar_url
        string github_url
        string bio
        string location
        string email
        string twitter_username
        integer public_repos
        integer followers
        timestamp created_at
        timestamp updated_at
    }

    ROADMAPS {
        integer id PK
        string name
        string description
        timestamp created_at
        timestamp updated_at
    }

    ROADMAP_STEPS {
        integer id PK
        integer roadmap_id FK
        integer day_number
        string title
        string description
        integer expected_duration_hours
        integer step_order
        timestamp created_at
    }

    USER_ROADMAP_PROGRESS {
        integer id PK
        uuid user_id FK
        integer step_id FK
        string status
        timestamp completed_at
        timestamp created_at
    }

    FORUM_THREADS {
        integer id PK
        uuid user_id FK
        string title
        string category
        boolean is_pinned
        boolean is_locked
        timestamp created_at
        timestamp updated_at
    }

    FORUM_POSTS {
        integer id PK
        integer thread_id FK
        uuid user_id FK
        string content
        timestamp created_at
        timestamp updated_at
    }

    FORUM_BANS {
        integer id PK
        uuid user_id FK
        string reason
        timestamp banned_until
        timestamp created_at
    }

    EVENTS {
        integer id PK
        string title
        string description
        string event_type
        string external_url
        timestamp start_time
        timestamp end_time
        timestamp created_at
    }
```

---

## 6. Vector Database Architecture (Qdrant)

The vector search subsystem isolates semantic representations and filters into an optimized Qdrant collection:

```mermaid
flowchart TD
    subgraph QdrantServer["Qdrant Vector Engine (Docker / Qdrant Cloud)"]
        subgraph Collection["Collection: open_source_repositories"]
            HNSW["HNSW Vector Index<br/>- Dimensions: 384 (FastEmbed BAAI/bge-small-en-v1.5)<br/>- Metric: Cosine<br/>- m: 16<br/>- ef_construct: 100"]

            subgraph PayloadIndexes["Inverted Payload Indexes"]
                IdxLang["language (Keyword)"]
                IdxLic["license (Keyword)"]
                IdxTop["topics (Keyword List)"]
                IdxStars["stars (Integer Range)"]
                IdxForks["forks (Integer Range)"]
            end
        end

        StorageEngine["MVCC & Write-Ahead Log (WAL) Storage"]
        Collection --> StorageEngine
    end

    FastEmbed["FastEmbed Local Runtime"] -->|"Batch Vectors"| HNSW
    FilterCriteria["Filter Engine"] --> PayloadIndexes
```

---

## 7. Authentication & Security Flow

The system employs HMAC-hashed OTP verification, bcrypt password hashing, and stateless JWT tokens:

```mermaid
sequenceDiagram
    autonumber
    actor Client as User / Browser
    participant API as FastAPI Auth Router
    participant OTP_Svc as OTP & Security Service
    participant Mailer as SMTP / Mail Service
    participant DB as PostgreSQL

    rect rgb(20, 25, 35)
        Note over Client, DB: User Registration (2-Step OTP Verification)
        Client->>API: POST /api/v1/auth/signup (email, username, password)
        API->>OTP_Svc: Stage registration & generate 6-digit OTP
        OTP_Svc->>DB: INSERT into otps (email, hashed_otp, purpose="signup", metadata={username, password_hash})
        OTP_Svc->>Mailer: Send verification email with 6-digit OTP
        API-->>Client: 200 OK ("Verification code sent")

        Client->>API: POST /api/v1/auth/verify-signup-otp (email, otp)
        API->>OTP_Svc: Verify OTP against stored HMAC hash
        OTP_Svc->>DB: Validate OTP expiry (< 5 min) and consumed status
        OTP_Svc->>DB: INSERT into users (email, username, password_hash)
        OTP_Svc->>DB: UPDATE otps SET is_used = true
        API-->>Client: 201 Created (access_token, token_type="bearer", user)
    end

    rect rgb(25, 30, 45)
        Note over Client, DB: Authenticated Requests
        Client->>API: GET /api/v1/auth/me (Authorization: Bearer <token>)
        API->>API: Decode JWT & validate signature
        API->>DB: SELECT user by ID
        API-->>Client: 200 OK (User Profile)
    end
```

---

## 8. Frontend Architecture & State Management

The frontend is a single-page application built on React 18, TypeScript, and Vite following clean UI token styling:

```mermaid
flowchart TD
    subgraph UIComponents["UI & View Layer"]
        App["App.tsx / Router"]
        Home["HomePage (Hero, Features, Community, ProjectFinder)"]
        Dash["DashboardPage (Overview, Explore, Roadmap, Forum, Events, Contributors)"]
        Modals["Modals (SkillAssessmentModal, AI Chatbot, AuthDialog)"]
        App --> Home
        App --> Dash
        App --> Modals
    end

    subgraph StateStores["Global State Layer (Zustand & React Query)"]
        AuthStore["useAuthStore<br/>- user, token, isAuthenticated<br/>- login, signup, logout<br/>- persistSession (localStorage)"]
        ThemeStore["Theme State<br/>- Dark Mode (.dark class on html)<br/>- Light Mode overrides"]
    end

    subgraph ApiClients["API Client Abstractions (/src/lib)"]
        AuthApi["auth-store.ts (/api/v1/auth)"]
        SearchApi["search-api.ts (/api/v1/search)"]
        AssessApi["assessment-api.ts (/api/v1/assessment)"]
        ChatbotApi["chatbot-api.ts (/api/v1/chatbot)"]
        RoadmapApi["roadmap-api.ts (/api/v1/roadmaps)"]
    end

    UIComponents --> StateStores
    UIComponents --> ApiClients
    StateStores --> ApiClients
```

---

## 9. Technology Stack Summary

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Zustand | Interactive developer dashboard, assessment modals, search exploration UI. |
| **API Backend** | FastAPI, Uvicorn, Pydantic v2, Python 3.12 (`uv`) | High-concurrency async REST API, contract validation, dependency injection. |
| **Relational DB** | PostgreSQL 15+, SQLAlchemy 2.0 (Async), Alembic, asyncpg | Transactional records for users, authentication OTPs, roadmaps, and community forums. |
| **Vector DB** | Qdrant Server (HTTP 6333 / gRPC 6334) | 384-dimensional dense semantic vector indexing and filtered similarity searches. |
| **Local Embeddings**| FastEmbed (BAAI/bge-small-en-v1.5, ONNX Runtime) | Sub-millisecond CPU-based vector generation with zero Python GIL lock. |
| **AI Workflows** | LangGraph, LiteLLM, Google Gemini (`gemini-3.5-flash`) | Structured skill calibration, personalized curriculum generation, and assessment grading. |
| **Data Pipelines**| Apache Airflow (`dags/github_sync_dag.py`) | Weekly automated sync of GitHub repositories, contributors, and contact details. |
| **Security** | PyJWT, Passlib (bcrypt), HMAC-SHA256, CORS middleware | Stateless bearer tokens, single-use 5-minute expiring OTP digests. |
