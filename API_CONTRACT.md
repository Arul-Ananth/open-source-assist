# API Contract Changelog

This document tracks all FastAPI endpoint contracts, request payloads, and response structures for the `open-source-assist` project.

---

## [v0.1.0] - 2026-09-21: Semantic Search & Ingestion Endpoints

### 1. Semantic & Hybrid Repository Search
* **Endpoint**: `POST /api/v1/search`
* **Status**: `200 OK`
* **Description**: Performs dense semantic similarity search over indexed open-source repositories using Qdrant vector database and reranks results using logarithmic popularity normalization combined with the Multiplicative Gate strategy.
  * **Dual-Tier Search Architecture**:
    * **OAuth Authenticated Users (`search_mode: "hybrid"`)**: If the request includes a user's GitHub OAuth Bearer token, the search engine queries both the live GitHub Search API (using the user's isolated 5,000 req/hr personal rate limit) and Qdrant in parallel. Results are merged, deduplicated, scored, and new repositories are asynchronously ingested into Qdrant via background tasks.
    * **Guests / Non-OAuth (`search_mode: "semantic"`)**: Queries local Qdrant vectors only, protecting the system from rate limiting and ensuring zero latency overhead.
* **Headers**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <token>` (Optional - enables Hybrid search when user has linked GitHub OAuth)
* **Request Body** (`RepoSearchRequest`):
  ```json
  {
    "query": "lightweight async web framework for microservices",
    "popularity_weight": 0.3,
    "filters": {
      "language": "Python",
      "min_stars": 50,
      "license": "MIT",
      "topic": "fastapi"
    },
    "limit": 20,
    "offset": 0
  }
  ```
* **Response Body** (`RepoSearchResponse`):
  ```json
  {
    "query": "lightweight async web framework for microservices",
    "total": 1,
    "limit": 20,
    "offset": 0,
    "search_mode": "hybrid",
    "items": [
      {
        "repo_id": 89229960,
        "full_name": "tiangolo/fastapi",
        "html_url": "https://github.com/tiangolo/fastapi",
        "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
        "language": "Python",
        "stars": 75420,
        "forks": 6400,
        "open_issues": 412,
        "license": "MIT",
        "topics": ["fastapi", "asyncio", "python", "rest-api"],
        "pushed_at": "2026-09-20T14:32:00Z",
        "scores": {
          "semantic_score": 0.885,
          "popularity_score": 0.942,
          "final_score": 1.1351,
          "strategy": "MultiplicativeGateStrategy"
        }
      }
    ],
    "strategy": "MultiplicativeGateStrategy",
    "duration_ms": 14.82
  }
  ```

---

### 2. Batch Repository Ingestion (Internal)
* **Endpoint**: `POST /api/v1/internal/ingest`
* **Status**: `201 Created`
* **Description**: Sourcing/ingestion contract for indexing repository records into Qdrant. Computes dense embeddings and batch upserts points into the configured collection.
* **Request Body** (`BatchRepoIngestRequest`):
  ```json
  {
    "repositories": [
      {
        "repo_id": 89229960,
        "full_name": "tiangolo/fastapi",
        "html_url": "https://github.com/tiangolo/fastapi",
        "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
        "language": "Python",
        "stars": 75420,
        "forks": 6400,
        "open_issues": 412,
        "license": "MIT",
        "topics": ["fastapi", "asyncio", "python", "rest-api"],
        "pushed_at": "2026-09-20T14:32:00Z",
        "readme_summary": "High performance ASGI web framework built with Starlette and Pydantic."
      }
    ]
  }
  ```
* **Response Body** (`BatchRepoIngestResponse`):
  ```json
  {
    "inserted_count": 1,
    "collection_name": "open_source_repositories",
    "duration_ms": 182.4
  }
  ```

---

### 3. System Health Check
* **Endpoint**: `GET /health`
* **Status**: `200 OK`
* **Response**:
  ```json
  {
    "status": "healthy",
    "service": "open-source-assist-backend"
  }
  ```

---

## [v0.2.0] - 2026-09-24: Authentication & Verification Endpoints

### 4. User Signup (Initiation)
* **Endpoint**: `POST /api/v1/auth/signup`
* **Status**: `200 OK`
* **Request Body**: `{ "username": "octocat", "email": "user@example.com", "password": "password123", "confirm_password": "password123" }`
* **Response Body**: `{ "message": "Verification code sent to your email" }`
* **Description**: Validates payload and stages an ephemeral OTP with optional username. Does not create a user record in the primary `users` table until verified.

### 5. Verify Signup OTP & Registration Finalization
* **Endpoint**: `POST /api/v1/auth/verify-signup-otp`
* **Status**: `201 Created`
* **Request Body**: `{ "email": "user@example.com", "otp": "123456" }`
* **Response Body**: `{ "access_token": "<jwt>", "token_type": "bearer", "message": "User registered and verified successfully" }`
* **Description**: Verifies the 6-digit registration code, creates the verified user with UUID and staged username in PostgreSQL, consumes the OTP, and returns a signed bearer access token.

### 6. User Login
* **Endpoint**: `POST /api/v1/auth/login`
* **Status**: `200 OK`
* **Request Body**: `{ "email": "user@example.com", "password": "password123" }`
* **Response Body**: `{ "access_token": "<jwt>", "token_type": "bearer" }`

### 7. Request Password Reset
* **Endpoint**: `POST /api/v1/auth/forgot-password`
* **Status**: `200 OK`
* **Request Body**: `{ "email": "user@example.com" }`
* **Response Body**: `{ "message": "If the account exists, a reset code has been sent" }`

### 8. Reset Password
* **Endpoint**: `POST /api/v1/auth/reset-password`
* **Status**: `200 OK`
* **Request Body**: `{ "email": "user@example.com", "otp": "123456", "new_password": "newpassword123" }`
* **Response Body**: `{ "message": "Password reset successfully" }`
* OTPs expire after five minutes and can be redeemed only once.

### 9. Current User Profile
* **Endpoint**: `GET /api/v1/auth/me`
* **Status**: `200 OK`
* **Headers**: `Authorization: Bearer <jwt>`
* **Response Body**: `{ "id": "<uuid>", "email": "user@example.com", "username": "octocat" }`
## [v0.2.0] - 2026-09-22: AI Learning Materials & Citation Agent Endpoint

### 4. Skill-Tailored Online Learning Materials & Citations
* **Endpoint**: `POST /api/v1/learning/materials`
* **Status**: `200 OK`
* **Description**: Executes an AI Agent workflow powered by Gemini API (`gemini-3.5-flash`) and LangGraph to generate personalized step-by-step learning modules and citeable online resources.
* **Request Body** (`LearningMaterialRequest`):
  ```json
  {
    "topic": "FastAPI Async Microservices",
    "skill_level": "intermediate",
    "user_context": "2 years of Python background",
    "limit": 5
  }
  ```
* **Response Body** (`LearningMaterialResponse`):
  ```json
  {
    "topic": "FastAPI Async Microservices",
    "skill_level": "intermediate",
    "summary": "Curated Intermediate-level learning materials for FastAPI Async Microservices.",
    "modules": [],
    "cited_materials": [],
    "duration_ms": 142.5,
    "model_used": "gemini-3.5-flash"
  }
  ```

---

## [v0.3.0] - 2026-09-24: Skill-Aware AI Chatbot Endpoint

### 5. Skill-Calibrated Developer Q&A
* **Endpoint**: `POST /api/v1/chatbot/query`
* **Status**: `200 OK`
* **Description**: Executes a skill-aware Q&A agent workflow powered by LiteLLM (Gemini `gemini-3.5-flash`) and LangGraph. Calibrates explanation depth, code complexity, technical vocabulary, and citations strictly to the user's skill level, experience, tech stack, and learning goals.
* **Headers**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <token>` (Optional)
* **Request Body** (`ChatbotRequest`):
  ```json
  {
    "question": "How do I implement async exception boundaries and context cleanup in FastAPI?",
    "skill_profile": {
      "skill_level": "intermediate",
      "tech_stack": ["Python", "FastAPI", "Docker"],
      "experience_years": 2.5,
      "learning_goals": ["Master microservice architecture and async error isolation"]
    }
  }
  ```
* **Response Body** (`ChatbotResponse`):
  ```json
  {
    "question": "How do I implement async exception boundaries and context cleanup in FastAPI?",
    "skill_level_used": "intermediate",
    "answer": "Here is an intermediate architectural breakdown addressing 'How do I implement async exception boundaries...'. Focusing on modular separation, async processing, and structured error boundaries.",
    "code_snippets": [
      {
        "language": "python",
        "code": "import asyncio\nimport logging\n\nlogger = logging.getLogger(__name__)\n\nasync def process_task(task_id: int) -> dict[str, str]:\n    logger.info(f'Executing task {task_id}')\n    await asyncio.sleep(0.1)\n    return {'status': 'completed', 'task_id': str(task_id)}",
        "explanation": "Demonstrates asynchronous function execution, non-blocking I/O, and structured logging."
      }
    ],
    "cited_references": [
      {
        "title": "Official Guide & Reference: How do I implement async exception boundar...",
        "url": "https://docs.reference.org/search?q=how+do+i+implement+async+exception+boundar...",
        "material_type": "official_docs",
        "difficulty_level": "intermediate",
        "snippet": "Official technical documentation and API reference.",
        "relevance_rationale": "Authoritative documentation adapted for Intermediate proficiency level.",
        "topics": ["Python", "FastAPI", "Docker"]
      }
    ],
    "suggested_followups": [
      "How can I handle concurrency limits and task cancellation gracefully?",
      "What are the best practices for unit testing this async handler?"
    ],
    "duration_ms": 115.4,
    "model_used": "gemini-3.5-flash"
  }
  ```

---

## [v0.4.0] - 2026-09-30: GitHub-Grounded Skill Assessment & User Context Synthesis

### 10. Generate Skill Assessment Questions
* **Endpoint**: `POST /api/v1/assessment/generate`
* **Status**: `200 OK`
* **Description**: Dynamically generates Multiple Choice Questions (MCQs) and Subjective questions grounded in the user's GitHub projects and tech stack.
* **Request Body** (`GenerateAssessmentRequest`):
  ```json
  {
    "github_username": "octocat",
    "num_mcqs": 3,
    "num_subjective": 2
  }
  ```
* **Response Body** (`GenerateAssessmentResponse`):
  ```json
  {
    "assessment_id": "assess_a1b2c3d4e5f6",
    "github_username": "octocat",
    "questions": [
      {
        "question_id": "mcq_1",
        "question_type": "mcq",
        "question_text": "In your project 'hello-world', what is the primary benefit of non-blocking async I/O?",
        "related_project": "hello-world",
        "options": [
          { "option_id": "A", "option_text": "Improves non-blocking concurrency and response throughput." }
        ],
        "skill_domain": "Python Architecture",
        "difficulty": "intermediate"
      }
    ],
    "generated_at": "2026-09-30T10:00:00Z"
  }
  ```

### 11. Evaluate Assessment & Synthesize User Context
* **Endpoint**: `POST /api/v1/assessment/evaluate`
* **Status**: `200 OK`
* **Description**: Evaluates submitted MCQ and subjective answers using LiteLLM (Gemini), calculates score breakdown, synthesizes a concise `user_context` line, and updates the `User` database record.
* **Request Body** (`EvaluateAssessmentRequest`):
  ```json
  {
    "assessment_id": "assess_a1b2c3d4e5f6",
    "github_username": "octocat",
    "answers": [
      {
        "question_id": "mcq_1",
        "question_type": "mcq",
        "user_answer": "A"
      },
      {
        "question_id": "subj_1",
        "question_type": "subjective",
        "user_answer": "We isolate exception boundaries using custom middleware and Docker secrets."
      }
    ]
  }
  ```
* **Response Body** (`EvaluateAssessmentResponse`):
  ```json
  {
    "assessment_id": "assess_a1b2c3d4e5f6",
    "overall_score_pct": 92.5,
    "assessed_skill_level": "intermediate",
    "generated_user_context": "Intermediate Python & FastAPI developer with solid understanding of async microservice boundaries and Docker deployment.",
    "evaluations": [
      {
        "question_id": "mcq_1",
        "question_type": "mcq",
        "score_pct": 100.0,
        "feedback": "Correct selection!",
        "correct_answer_summary": "Option A"
      }
    ],
    "user_updated": true,
    "duration_ms": 154.2,
    "model_used": "gemini-3.5-flash"
  }
  ```

---

## [v0.5.0] - 2026-10-02: GitHub Metrics & Contributor Aggregation Endpoints

### 12. Get Aggregated GitHub User Profile & Contribution Heatmap
* **Endpoint**: `GET /api/v1/github/user-profile/{username}`
* **Status**: `200 OK`
* **Description**: Fetches public GitHub user metrics, activity, badges, unlocked tiers, and contribution heatmap.
* **Response Body**:
  ```json
  {
    "user": {
      "login": "octocat",
      "name": "Mona Lisa Octocat",
      "avatar_url": "https://github.com/octocat.png",
      "html_url": "https://github.com/octocat",
      "bio": "GitHub mascot",
      "public_repos": 8,
      "followers": 1500,
      "following": 9,
      "created_at": "2011-01-25T18:44:36Z",
      "location": "San Francisco",
      "company": "@github"
    },
    "points": {
      "total": 1250,
      "rank": "Top 12% · Silver Contributor",
      "tier": "Silver",
      "breakdown": {
        "repos": 280,
        "commits": 450,
        "events": 300,
        "followers": 220
      }
    },
    "languages": [
      { "name": "TypeScript", "count": 5, "percentage": 62.5, "color": "#3178c6" },
      { "name": "Python", "count": 3, "percentage": 37.5, "color": "#3572A5" }
    ],
    "badges": [
      { "id": "repo_architect", "name": "Repo Architect", "unlocked": true, "unlocked_at": "September 2026" }
    ],
    "recent_activity": [
      {
        "id": "act_1",
        "type": "push",
        "title": "Pushed 2 commits",
        "repo": "octocat/Hello-World",
        "repo_url": "https://github.com/octocat/Hello-World",
        "detail": "Fix typos and update README",
        "time_display": "2 hours ago",
        "icon": "GitCommit"
      }
    ],
    "heatmap": {
      "total_contributions": 142,
      "current_streak_days": 4,
      "weeks": [
        [
          { "date": "2026-09-01", "count": 3, "level": 2 }
        ]
      ]
    }
  }
  ```

### 13. Batch Get Cached Repository Contributors
* **Endpoint**: `POST /api/v1/github/contributors/batch`
* **Status**: `200 OK`
* **Request Body** (`ContributorsBatchRequest`):
  ```json
  {
    "repos": ["tiangolo/fastapi", "pallets/flask"]
  }
  ```
* **Response Body** (`ContributorsBatchResponse`):
  ```json
  {
    "contributors": {
      "tiangolo/fastapi": [
        {
          "login": "tiangolo",
          "avatar_url": "https://avatars.githubusercontent.com/u/1326112",
          "html_url": "https://github.com/tiangolo",
          "contributions": 2840
        }
      ]
    },
    "rate_limited": false
  }
  ```

---

## [v0.6.0] - 2026-10-03: GitHub OAuth Authentication Endpoints

### 14. Get GitHub OAuth URL
* **Endpoint**: `GET /api/v1/auth/github/url`
* **Status**: `200 OK`
* **Response Body** (`GitHubAuthUrlResponse`):
  ```json
  {
    "configured": true,
    "url": "https://github.com/login/oauth/authorize?client_id=...&scope=read:user,user:email",
    "has_pat": true
  }
  ```

### 15. GitHub OAuth Code Exchange & Login
* **Endpoint**: `POST /api/v1/auth/github/callback`
* **Status**: `200 OK`
* **Request Body** (`GitHubCodeRequest`):
  ```json
  {
    "code": "gh_oauth_temp_code_123"
  }
  ```
* **Response Body** (`AuthResponse`):
  ```json
  {
    "access_token": "<jwt_access_token>",
    "token_type": "bearer",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "user@github.com",
      "username": "octocat",
      "role": "user",
      "account_status": "active"
    }
  }
  ```

### 16. Development PAT Login
* **Endpoint**: `POST /api/v1/auth/github/pat-login`
* **Status**: `200 OK`
* **Description**: Authenticates or links a development user session using the server-configured GitHub Personal Access Token.
* **Response Body** (`AuthResponse`):
  ```json
  {
    "access_token": "<jwt_access_token>",
    "token_type": "bearer",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "dev@opensourceassist.org",
      "username": "dev-user",
      "role": "admin",
      "account_status": "active"
    }
  }
  ```

---

## [v0.7.0] - 2026-10-04: Community & Administrator Events Endpoints

### 17. List Community Events
* **Endpoint**: `GET /api/v1/events`
* **Status**: `200 OK`
* **Query Parameters**:
  * `event_type`: Filter by event category (`Meetup`, `Hackathon`, `Conference`)
  * `mode`: Filter by format (`Online`, `Offline`)
  * `company`: Search by organizing entity
  * `limit`: Page limit (default `100`)
  * `offset`: Page offset (default `0`)
* **Response Body** (`EventListResponse`):
  ```json
  {
    "events": [
      {
        "id": 1,
        "name": "Global Open Source Summit 2026",
        "type": "Conference",
        "date": "2026-11-15",
        "time": "14:00",
        "mode": "Online",
        "location": "",
        "organizer": "Open Source Initiative",
        "application_url": "https://summit.opensource.org"
      }
    ]
  }
  ```

### 18. Create Event (Admin Only)
* **Endpoint**: `POST /api/v1/admin/events`
* **Status**: `201 Created`
* **Headers**: `Authorization: Bearer <admin_jwt>`
* **Request Body** (`EventCreateRequest`):
  ```json
  {
    "name": "FastAPI Workshop",
    "organizer": "Python Community",
    "type": "Workshop",
    "mode": "Online",
    "location": "",
    "date": "2026-12-01",
    "time": "18:00",
    "application_url": "https://meetup.com/fastapi-workshop"
  }
  ```
* **Response Body** (`EventItem`): Same as event item structure.

### 19. Delete / Clean Up Ended Events (Admin Only)
* **Endpoint**: `DELETE /api/v1/admin/events/ended`
* **Status**: `200 OK`
* **Headers**: `Authorization: Bearer <admin_jwt>`
* **Response Body**:
  ```json
  {
    "deleted_count": 4,
    "message": "Successfully pruned 4 past events"
  }
  ```

---

## [v0.8.0] - 2026-10-04: Community Forum & Discussion Endpoints

### 20. List Forum Threads
* **Endpoint**: `GET /api/v1/forum/threads`
* **Status**: `200 OK`
* **Query Parameters**: `category` (optional), `limit` (default `50`), `offset` (default `0`)
* **Response Body**:
  ```json
  {
    "threads": [
      {
        "id": "thread_abc123",
        "title": "Best practices for contributing to Rust crates",
        "category": "Discussions",
        "author_username": "ferris",
        "created_at": "2026-10-03T12:00:00Z",
        "replies_count": 8,
        "views_count": 142
      }
    ]
  }
  ```

### 21. Create Discussion Thread
* **Endpoint**: `POST /api/v1/forum/threads`
* **Status**: `201 Created`
* **Headers**: `Authorization: Bearer <jwt>`
* **Request Body**:
  ```json
  {
    "title": "Tips on getting PR reviews in popular repos",
    "category": "Mentorship",
    "body": "What are your recommended strategies for polite follow-ups?"
  }
  ```

---

## [v0.9.0] - 2026-10-05: Roadmaps & Progress Tracking Endpoints

### 22. List Curated Roadmaps
* **Endpoint**: `GET /api/v1/roadmaps`
* **Status**: `200 OK`
* **Response Body**:
  ```json
  [
    {
      "id": "roadmap_python_backend",
      "title": "Python Microservices Contributor",
      "description": "Step-by-step pathway from basic scripting to production async libraries.",
      "level": "intermediate",
      "estimated_weeks": 8,
      "steps_count": 6
    }
  ]
  ```

### 23. Record Step Progress
* **Endpoint**: `POST /api/v1/progress`
* **Status**: `200 OK`
* **Headers**: `Authorization: Bearer <jwt>`
* **Request Body**:
  ```json
  {
    "roadmap_id": "roadmap_python_backend",
    "step_id": "step_async_patterns",
    "completed": true
  }
  ```
* **Response Body**:
  ```json
  {
    "progress_id": "prog_xyz",
    "status": "completed",
    "updated_at": "2026-10-05T15:30:00Z"
  }
  ```

---

## [v0.10.0] - 2026-10-05: Projects & Contributor Directory Endpoints

### 24. List Synced Projects
* **Endpoint**: `GET /api/v1/projects`
* **Status**: `200 OK`
* **Query Parameters**: `language`, `search`, `limit` (default `20`, max `500`), `offset`
* **Response Body**:
  ```json
  {
    "projects": [
      {
        "id": "proj_fastapi",
        "full_name": "tiangolo/fastapi",
        "description": "FastAPI framework, high performance, easy to learn",
        "stars": 75420,
        "forks": 6400,
        "language": "Python",
        "open_issues": 412,
        "html_url": "https://github.com/tiangolo/fastapi"
      }
    ],
    "total": 120
  }
  ```

### 25. Trigger Airflow Ingestion DAG
* **Endpoint**: `POST /api/v1/airflow/trigger`
* **Status**: `202 Accepted`
* **Description**: Manually triggers the `github_sync_weekly` Apache Airflow DAG to synchronize repositories and refresh contributor vectors.
* **Response Body**:
  ```json
  {
    "status": "triggered",
    "dag_id": "github_sync_weekly",
    "execution_date": "2026-10-05T16:00:00Z"
  }
  ```
