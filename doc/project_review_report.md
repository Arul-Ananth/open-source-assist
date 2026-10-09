# Open Source Assist — Project Review Report

**Scope:** whole repo (`backend/`, `frontend/`, `dags/`, `alembic/`, Docker/nginx/Render/Vercel, CI, docs).
**Method:** static read-through. Nothing was executed and no code was changed.

> [!NOTE]
> **Coverage.** I read these files in full: all of `backend/core`, `main.py`, auth/admin/forum/roadmap/user/search/github/airflow/chatbot/projects routes, and the auth, OTP, OAuth, mail, qdrant, embedding, search, scoring, github (client, service, sync), event, forum, roadmap, user, chatbot and learning-agent services. I also read the user and event models, Docker, compose, nginx, `render.yaml`, CI, the DAG, and `conftest.py`.
> I only skimmed `doc_service.py`, `assessment_service.py`, the schemas, the seed/deploy scripts, and the large frontend components (`RedeemSection`, `RoadmapPage`, `ForumSection`, and similar). I only sampled the frontend via `auth-store.ts` and grep scans.
> Items marked **(verify)** are strong inferences from reading that I did not confirm by running the code.

## 0. Executive summary

The project works as a demo and has a sensible layout. It has a clear router/service/model split, async SQLAlchemy, a CI job that runs against PostgreSQL, and sensible OTP hashing. It is **not safe to expose publicly** as it stands, and it **will not scale horizontally** without changes.

| Area | Verdict |
|---|---|
| Authorization | **Critical.** Many write endpoints have no auth at all. Several others accept a `user_id` from the client (IDOR). |
| Auth flow | Account-takeover paths via GitHub login, no rate limiting, and a non-atomic OTP check. |
| Correctness | A few real bugs, including one that probably breaks the admin forum list. |
| Scaling | Per-process caches, a silent in-memory Qdrant fallback, startup DDL in every worker, and a per-process rate limiter. |
| Duplication / complexity | Two parallel user systems, repeated LLM boilerplate, repeated event mapping, and abstractions with one or two implementations. |
| Testing / CI | Backend only. The test env setup is likely ineffective. There are no frontend tests, lint or type checks in CI. |

**Counts:** 14 critical/high, 18 medium, about 25 low/cleanup.

### Top 10 to fix first
1. Unauthenticated, destructive endpoints. See [S1](#s1--missing-authentication-on-write-endpoints).
2. IDOR via client-supplied `user_id`. See [S2](#s2--idor--client-supplied-user_id).
3. `POST /auth/github/pat-login` logs anyone in as the server's GitHub token owner. See [S3](#s3--github-pat-login-is-a-public-backdoor).
4. GitHub OAuth account takeover through unverified email. See [S4](#s4--oauth-account-takeover-via-unverified-email).
5. No rate limiting or attempt limit on OTP and login. See [S5](#s5--no-rate-limiting--otp-brute-force).
6. Production CORS is `*` with credentials. See [S6](#s6--cors--secrets-defaults).
7. The silent in-memory Qdrant fallback corrupts data across workers. See [H1](#h1--silent-in-memory-qdrant-fallback).
8. `init_db()` runs raw DDL on every worker at startup and swallows errors. See [H2](#h2--startup-ddl-in-every-worker-and-three-schema-mechanisms).
9. Test config is applied too late, so tests may run against the dev database. See [T1](#t1--test-environment-setup-is-ineffective).
10. The admin forum thread list is probably broken. See [L1](#l1--admin-forum-thread-list-iterates-a-tuple-verify).

---

## 1. Security

### S1 — Missing authentication on write endpoints
**Severity: Critical.** These routes use no `Depends(get_current_*)`:

| Endpoint | File | Impact |
|---|---|---|
| `POST /sync`, `POST /sync/contributors` | [github.py](file:///c:/Dev/open-source-assist/backend/api/routes/github.py#L38-L84) | Anyone can trigger long-running GitHub syncs that burn your PAT quota and DB. The docstring says "Used by Airflow and Admin". |
| `POST /airflow/trigger` | [airflow.py](file:///c:/Dev/open-source-assist/backend/api/routes/airflow.py#L13) | Anyone can trigger DAG runs. |
| `POST /internal/ingest` | [search.py](file:///c:/Dev/open-source-assist/backend/api/routes/search.py#L48-L64) | Anyone can write arbitrary vectors and payloads into Qdrant (index poisoning). The path says "internal" but nothing enforces it. |
| `POST /chatbot/query`, learning route | [chatbot.py](file:///c:/Dev/open-source-assist/backend/api/routes/chatbot.py), [learning.py](file:///c:/Dev/open-source-assist/backend/api/routes/learning.py) | Unauthenticated paid LLM calls (Gemini cost abuse). |
| All of `/roadmaps*` (create, patch, delete, steps) | [roadmaps.py](file:///c:/Dev/open-source-assist/backend/api/routes/roadmaps.py) | Anyone can edit or delete shared roadmaps. |
| All of `/users/*` | [users.py](file:///c:/Dev/open-source-assist/backend/api/routes/users.py) | See S2. |
| `GET /github/user-profile/{username}` | [github.py](file:///c:/Dev/open-source-assist/backend/api/routes/github.py#L129) | An open proxy that spends your server GitHub token on arbitrary usernames. It is cached, but there is no limit on distinct keys. |

**Fix:** put admin or service-token dependencies on `/sync*`, `/airflow/*` and `/internal/*` (a `get_current_admin` dependency already exists). Require login on LLM routes plus per-user rate limits. Put the dependency on the router (`APIRouter(dependencies=[Depends(...)])`) so a new route can't be added unprotected by accident.

### S2 — IDOR / client-supplied `user_id`
**Severity: Critical.**
- `PATCH /users/{user_id}` and `DELETE /users/{user_id}` take no auth. Anyone can deactivate or rewrite anyone's profile if they know the UUID. UUIDs are exposed by the admin and forum APIs.
- `GET /users/{user_id}` returns any user's record without auth.
- `POST /progress`, `PATCH /progress/{id}`, `GET /users/{user_id}/progress` and `POST /roadmaps/personalized` (via `payload.user_id`) are not tied to the caller's identity. See [roadmaps.py](file:///c:/Dev/open-source-assist/backend/api/routes/roadmaps.py#L182-L240).

**Fix:** derive `user_id` from the JWT (`current_user["user_id"]`), never from the request. Delete the `user_id` fields from these request schemas.

### S3 — GitHub PAT login is a public backdoor
**Severity: Critical.** [`POST /auth/github/pat-login`](file:///c:/Dev/open-source-assist/backend/api/auth.py#L246-L273) takes no input. It logs the caller in as the owner of `settings.GITHUB_TOKEN`. The docstring says "in development", but there is no `ENVIRONMENT` check. Anyone who reaches a deployed instance with `GITHUB_TOKEN` set (Render sets it) gets a JWT for that user. `/auth/github/url` also advertises `has_pat`.
**Fix:** remove it, or hard-gate it with `settings.ENVIRONMENT == "development"` and fail startup if the endpoint is enabled in production.

### S4 — OAuth account takeover via unverified email
**Severity: High.**
- [`fetch_github_user`](file:///c:/Dev/open-source-assist/backend/services/github_oauth_service.py#L113-L131) falls back to `emails_list[0]`, even when it is **unverified**. It then merges accounts by email in `authenticate_or_register` (L148). An attacker who adds a victim's email to a GitHub account, unverified, can log in as the victim's local account.
- It also synthesizes `login@users.noreply.github.com`, which is safe on its own but can collide.
- Existing accounts that are suspended or banned get silently **re-activated**: `if not user.is_active: user.is_active = True` (L167). This undoes an admin ban. It also ignores `account_status`.
- OAuth `state` is optional and never validated server-side, so the callback has no CSRF protection. `get_github_oauth_url` accepts a caller-chosen `redirect_uri`, which makes it an open-redirect or code-exfiltration surface.

**Fix:** use only `primary and verified` emails. Link accounts by `github_id`, not by email. Never reactivate banned users. Generate `state` server-side, bind it to a short-lived cookie or store, and verify it. Allowlist `redirect_uri`.

### S5 — No rate limiting / OTP brute force
**Severity: High.**
- A 6-digit OTP (1M values) with a 5-minute window and **no attempt counter** can be brute-forced. See [otp_service.py](file:///c:/Dev/open-source-assist/backend/services/otp_service.py#L55-L94). Verification also isn't atomic: two parallel requests can both succeed before the delete. Use `DELETE ... RETURNING`, or `SELECT ... FOR UPDATE`.
- `/auth/login`, `/signup`, `/forgot-password` and LLM routes have no throttling, so there is no brute force or email-bombing protection. Signup and forgot-password also let someone spam any address.
- **User enumeration** is inconsistent:
  - `signup` returns "User with this email already exists".
  - `reset_password` returns "No account found".
  - `login` skips bcrypt when the user doesn't exist, so response time reveals account existence. Hash a dummy value in that branch.
  - `forgot_password` is correct, but its response time differs because only real users send mail.
- [`mail_service`](file:///c:/Dev/open-source-assist/backend/services/mail_service.py#L54) **logs the OTP in plaintext** (`logger.info("[AUTH] Verification OTP for %s: %s")`). This defeats hashing the OTP at rest.
- `OTPService.generate_and_store_otp` commits the OTP and then sends mail inline. A slow SMTP server (10s timeout) holds a request and a pool connection. If the send fails the route returns 400/500 after the OTP is stored. Move mail to a background task or queue.

### S6 — CORS / secrets defaults
**Severity: High.**
- [render.yaml](file:///c:/Dev/open-source-assist/render.yaml#L29-L32): `CORS_ALLOW_ORIGINS="*"` plus `CORS_ALLOW_CREDENTIALS=true`. Starlette will not reflect `*` with credentials, so it is misconfigured at best. Bearer tokens in headers make it less exploitable, but set explicit origins. [main.py](file:///c:/Dev/open-source-assist/backend/main.py#L83) also uses `allow_methods/headers=["*"]`.
- [config.py](file:///c:/Dev/open-source-assist/backend/core/config.py#L86-L89) defaults `JWT_SECRET_KEY` to a public placeholder, and `POSTGRES_PASSWORD="postgres"`. In production nothing prevents starting with the default. Add a validator that fails startup when `ENVIRONMENT == "production"` and the secret is the default or shorter than 32 bytes.
- `/docs`, `/redoc` and `/openapi.json` are exposed in prod (and proxied by nginx).
- [docker-compose.prod.yml](file:///c:/Dev/open-source-assist/docker-compose.prod.yml) has default `postgres/postgres` credentials. Qdrant has no API key, and in [docker-compose.yml](file:///c:/Dev/open-source-assist/docker-compose.yml) it is published on `0.0.0.0:6333/6334` with no auth. Frontend is `0.0.0.0:3000` over plain HTTP (`nginx-ssl.conf` exists but isn't wired into compose).

### S7 — Token and credential handling
**Severity: Medium.**
- **JWTs travel in the URL.** The GitHub callback redirects to `/?oauth_token=...&email=...`. See [auth.py](file:///c:/Dev/open-source-assist/backend/api/auth.py#L202-L210). URLs end up in history, referrers, proxy logs and analytics. Use a one-time code that the frontend exchanges via POST, or an HttpOnly cookie.
- **JWT and user are stored in `localStorage`** ([auth-store.ts](file:///c:/Dev/open-source-assist/frontend/src/lib/auth-store.ts#L59-L89)). That is XSS-exfiltratable. The token is stored twice (`osa-token` and inside `osa-user.token`). The token is also copied into the zustand `user` object.
- **No revocation or refresh.** Access tokens last 120 minutes with no `jti`, no refresh token and no logout invalidation. Ban or deactivate takes effect through a per-request DB read, which is fine, but a password reset doesn't invalidate existing tokens.
- **`github_access_token` is stored in plaintext** in `users` (`String(255)`). `get_optional_current_user` copies it into the per-request dict. Encrypt at rest, or don't persist it. Also, new GitHub tokens can exceed 255 characters.
- **`python-jose`** is poorly maintained and has had CVEs. Prefer `PyJWT`. `passlib` is unmaintained, and [security.py](file:///c:/Dev/open-source-assist/backend/core/security.py#L11-L15) monkey-patches `bcrypt.__about__` to keep it working, while [user_service.py](file:///c:/Dev/open-source-assist/backend/services/user_service.py#L15-L20) uses `bcrypt` directly (see D1). Use bcrypt or argon2 directly.
- Error messages leak internals: [chatbot.py](file:///c:/Dev/open-source-assist/backend/api/routes/chatbot.py#L34) returns `str(exc)` in a 500. The OAuth routes return `str(exc)` too, which can contain upstream HTTP details.
- `X-Forwarded-*` headers are set by nginx, but uvicorn is run without `--proxy-headers/--forwarded-allow-ips`. This matters once you add IP-based rate limiting.

### S8 — Input handling
**Severity: Medium/Low.**
- `ilike(f"%{user_input}%")` ([event_service.py](file:///c:/Dev/open-source-assist/backend/services/event_service.py#L40-L46), [forum_service.py](file:///c:/Dev/open-source-assist/backend/services/forum_service.py#L261)) does not escape `%` and `_`. Wildcard-only searches force a full scan. The leading `%` also prevents index use.
- GitHub path building: `f"/repos/{full_name}/contributors"` and `f"/users/{username}"` are built from user input with no validation (`github_service.get_contributors_batch`, `get_user_profile_stats`). Validate with a strict regex to prevent path traversal into other API paths. The `repos` list is also unbounded, so one request can fan out many GitHub calls.
- `GET /contributors` allows `limit` up to 500. Admin forum list has no pagination.
- Registration through `/users/register` bypasses email verification and password policy (see D1).

---

## 2. Logic bugs and correctness

### L1 — Admin forum thread list iterates a tuple (verify)
[`ForumService.list_threads`](file:///c:/Dev/open-source-assist/backend/services/forum_service.py#L244-L276) returns `(threads, total)`. [admin.py L241-L246](file:///c:/Dev/open-source-assist/backend/api/admin.py#L241-L246) does `threads = await ForumService.list_threads(db)` and then `for thread in threads ... thread.id`. That iterates the tuple, giving a `list` and an `int`, and raises `AttributeError`. There is also no admin forum-list test in `test_admin.py`. It is also capped at the default `limit=50` even if fixed.

### L2 — Counter races (lost updates)
`views_count`, `reply_count` and `upvotes` all use read-modify-write (`x = (x or 0) + 1`). See [forum_service.py L114, L232, L240](file:///c:/Dev/open-source-assist/backend/services/forum_service.py). Concurrent requests lose increments, and this gets worse with several workers. Use `UPDATE ... SET col = col + 1`.
Related issues:
- `increment_views` runs a **DB write on every GET** of a thread ([forum.py L113](file:///c:/Dev/open-source-assist/backend/api/routes/forum.py#L113)) and is open to view-spamming. Debounce or count via cache.
- `upvote_post` has **no per-user de-duplication**, so one user can upvote unlimited times. It needs a `(post_id, user_id)` unique table.
- `reply_count` can drift because `delete_post` adjusts it separately from the delete, and `delete_thread` cascades.

### L3 — Forum ban semantics
- `is_banned` **writes** (deletes expired bans and commits) inside a read check. Side effects in a predicate make it racy.
- `ban_user` ignores `ForumBan.reason`/`expires_at` from the API: the admin route never passes `reason`.
- The `ForumBan` and `User.account_status` (`suspended`/`banned`) are two overlapping ban concepts.

### L4 — Search ranking issues
In [search_service.py](file:///c:/Dev/open-source-assist/backend/services/search_service.py):
- `MultiplicativeGateStrategy` returns `s * (1 + w*p)`, which can be up to 2.0. The docs and the `[0,1]` contracts imply a bounded score, and the LinearHybrid strategy is bounded, so scores are inconsistent across strategies.
- A hard-coded switch `popularity_weight >= 0.7 → LinearHybridStrategy` silently overrides the configured default (L148-L151). The strategy therefore changes discontinuously at 0.7.
- Live GitHub results get a **fabricated** `semantic_score = 0.85` (L208), so live repos are ranked as if they were highly relevant regardless of the query.
- Browse mode (`get_all_candidates`) uses `scroll`, which returns arbitrary order and a constant `score=1.0`. Then it re-sorts by `final_score`, which depends only on popularity, so "page 2" is computed from a candidate window of `max(100, offset+limit+20)` and is not stable.
- Pagination happens after merging and slicing in memory (`offset+limit+20` candidates). A deep offset gets silently truncated.
- `get_scoring_strategy(name)` silently falls back to the default on an unknown name instead of raising a 422.
- The `existing_names` de-dupe lowercases only for GitHub items, and `full_name` may be empty for qdrant items.
- `_safe_background_ingest` ingests live results into the shared index using the **user's** OAuth results. These are user-scoped searches written to a global collection, and combined with S1 the index can be poisoned.

### L5 — Auth edge cases
- `AuthService.login` matches `or_(User.email == normalized, User.username == normalized)`, but usernames aren't unique (the `username` column is `index=True`, not `unique`). Two users can share a username, and `scalar()` returns one arbitrarily, or raises if `scalar` finds more than one row (verify per SQLAlchemy version). Usernames are also not lower-cased on write, so `.lower()` on lookup misses mixed-case usernames. A user whose username equals someone else's email string could also shadow login.
- GitHub-created users get `password_hash="oauth:github:<random>"`. Calling `verify_password` on that string can raise instead of returning False, since it isn't a valid bcrypt hash. It's an unauthenticated 500 for `/auth/login` or `/users/login` with that email (verify).
- `request_signup` stores the plaintext-derived bcrypt hash in the OTP payload, which is fine, but the password length (bcrypt 72-byte truncation) isn't validated, so check the schema.
- `verify_signup_otp` checks for an existing user, then consumes the OTP, then inserts. It handles `IntegrityError`, which is good, but the OTP is already consumed on that path.
- `reset_password` doesn't check `is_active` or `account_status`.

### L6 — Misc
- [`GitHubService.get_user_profile_stats`](file:///c:/Dev/open-source-assist/backend/services/github_service.py#L240-L621) **fabricates data**:
  - `streak_days = 6 if len(events) > 10 else (3 if ...)` is not a streak.
  - Rank labels such as "Top 5% · Gold Contributor" are invented percentiles.
  - The "Security Sentinel" badge triggers on repo names containing "sentry" or "ocean" (hard-coded to someone's repos), and the "AI" badge on `"ai" in name`, which matches "email", "main", "chaining".
  - `merged_prs` = count of any `PullRequestEvent` (opened, closed and so on).
  - The heatmap mixes `updated_at` of repos with events.
  - `is_local` short-circuits for `{"admin","demo","test","guest","contributor"}`. A real GitHub user named `test` gets fake data.
  - Users see made-up achievements presented as real.
- `datetime.date.today()` and `now()` mix naive local time with UTC in the heatmap and badge dates.
- [event_service._is_ended](file:///c:/Dev/open-source-assist/backend/services/event_service.py#L23-L27) catches **all** exceptions and returns `False`, which hides bad data. Events are always interpreted in IST (`Asia/Kolkata` is hard-coded). There is no per-event timezone.
- `delete_ended_events` loads **all** events into Python to filter by time. Do it in SQL.
- Event `description` is overwritten with the event `name` ([event_service.py L79](file:///c:/Dev/open-source-assist/backend/services/event_service.py#L79)), so the description column holds no real description.
- `CORS_ALLOW_ORIGINS.split(",")` doesn't drop empty entries.
- `main.py` sets the Windows event-loop policy twice (module level and under `__main__`). The Selector policy is also deprecated in newer Python.
- `QdrantService.get_client()` (sync name, builds a real-server client unconditionally) coexists with `get_client_async()` (fallback logic). Callers that use the former skip the fallback.
- `QdrantService._is_server_reachable` runs a **blocking** `socket.connect_ex` inside an `async` call (up to `QDRANT_TIMEOUT_SECONDS`) and blocks the event loop.
- [github_client.py](file:///c:/Dev/open-source-assist/backend/services/github_client.py#L48-L53): `_wait_before_request` has a check-then-set race when requests overlap, so the interval isn't enforced across concurrent calls. It also sleeps on the secondary rate limit for up to 60s inside a request path.
- [github_sync_service.sync_github](file:///c:/Dev/open-source-assist/backend/services/github_sync_service.py#L98-L152) makes 1 + N×(1 + contributors) sequential GitHub calls (25–50 repos × 10 contributors → 250–500 calls, 1 req/s ≈ 4–8 minutes) and holds one DB transaction open for the whole time. It commits only at the very end, so one failure loses everything. Run it as a background job and commit per project. The `/sync` HTTP route will time out through nginx (120s).
- [`_sync_project_contributors`](file:///c:/Dev/open-source-assist/backend/services/github_sync_service.py#L88-L93) catches all exceptions for `get_user` and stores `{}`. It silently wipes enriched contributor fields on a transient error, since the upsert overwrites existing values with `None`.
- The DAG [`create_tables`](file:///c:/Dev/open-source-assist/dags/github_sync_dag.py#L12-L14) runs `init_db()` (DDL) as an Airflow task. Use migrations instead. `asyncio.run` in each task, with the engine pooled at module import, can bind connections to the wrong loop. Use `NullPool` there.
- `learning_agent`/`chatbot_agent` build `model_used` as `"{model}-chatbot-generator"` when no key is set. The chatbot raises when no key is set, so that branch is dead.

---

## 3. Duplicated, redundant and dead code

### D1 — Two parallel user/auth systems
- **System A:** [`api/auth.py`](file:///c:/Dev/open-source-assist/backend/api/auth.py) + `AuthService` + `core/security.py` + `core/jwt.py`. It has OTP-verified signup, JWT, role and status checks, and passlib.
- **System B:** [`api/routes/users.py`](file:///c:/Dev/open-source-assist/backend/api/routes/users.py) + `user_service.py`. It has `/users/register` and `/users/login`, no OTP, no token (`UserLoginResponse` has no token), a direct `bcrypt` implementation, no email normalization (so `A@x.com` and `a@x.com` become two accounts), and no `account_status` check on login.
- B's registration is a **bypass of A's email verification**, and B's login returns no token, so it appears unused by the frontend. **Delete B**, or fold the genuinely needed profile endpoints into A behind `get_current_user`.
- `User` has both `user_context: str` and `context: JSON`. `UserUpdate.context` writes the JSON column, while `auth.py` and `/auth/me` read `user_context`. Two sources of truth for one idea.

### D2 — LLM call boilerplate repeated 4–5×
The pattern is: build `gemini/` model id → `litellm.acompletion(... response_format=...)` → check `message.parsed` → else `model_validate_json` → fall back. It is copy-pasted in [chatbot_agent.py](file:///c:/Dev/open-source-assist/backend/services/chatbot_agent.py#L62-L116), [learning_agent.py](file:///c:/Dev/open-source-assist/backend/services/learning_agent.py#L197-L242), and twice in `assessment_service.py`. Extract one `llm_client.structured_completion(schema, system, user)` with timeout, retries and error mapping. Currently there is **no timeout, retry, or token cap** on any call.
Other issues with these services:
- Prompts embed raw user text with no delimiting, so prompt injection is possible. This matters because the output is rendered in the UI.
- Unused imports (`MaterialType`, `CitedMaterial`, `ChatbotRequest` pieces in `chatbot_agent.py`, `ChatPromptTemplate` in `learning_agent.py`).
- The fallback "learning materials" point to fabricated URLs (`docs.reference.org/search?q=...`, `realpython.com/search` for any topic). They are presented to users as "citeable" sources.

### D3 — Event mapping duplicated, with defensive `getattr` aliasing
`_to_event_item` in [events.py](file:///c:/Dev/open-source-assist/backend/api/routes/events.py#L14-L33) and `_event_item` in [admin.py](file:///c:/Dev/open-source-assist/backend/api/admin.py#L49-L79) are the same function. Both probe `event.event_date`/`event.date`, `event.name`/`event.description`, `organizer`/`company_organization`, and `type`/`event_type`, but the model has exactly one of each. `event_service._starts_at` and `_event_dict` do the same with `applicationUrl`, `date`/`event_date`, and so on. This is leftover from schema renames. Pick one canonical name, delete the aliases, and put the mapper in one place (a `from_orm` classmethod on the schema).
- Broader pattern: `getattr(user, "role", "user")`, `getattr(user, "account_status", "active")` and `getattr(post, "upvotes", 0)` on **columns that always exist** (about 20 sites; `admin.py`, `auth.py`, `dependencies.py`, `auth_service.py`, `forum.py`). It hides typos and defeats type-checking.

### D4 — Redundant files and structures
- [`models/event_model.py`](file:///c:/Dev/open-source-assist/backend/models/event_model.py) just re-exports `models/event.py` ("for compatibility"). There is nothing to be compatible with. Delete it.
- Inconsistent naming: `user_model.py`, `otp_model.py`, `forum_model.py`, `event_model.py` vs `project.py`, `contributor.py`, `roadmap.py`.
- Two routing styles: `backend/api/auth.py` and `backend/api/admin.py` sit outside `backend/api/routes/`.
- Two routers use `prefix=""` / no prefix, and `github.py` mixes `/sync` and `/github/*` at one level. `/search` and `/internal/ingest` share a router.
- Class-wrapped static methods (`AuthService`, `OTPService`, `ForumService`, `GitHubOAuthService`, `AdminService`) coexist with module-function services (`roadmap_service`, `user_service`, `project_service`). `EventService` is a class built from `staticmethod(function)` assignments, which is a pure wrapper ([event_service.py L130-L140](file:///c:/Dev/open-source-assist/backend/services/event_service.py#L130-L140)). Pick one style.
- `GitHubClient` (httpx, retries, rate-limit), `GitHubService` (httpx, no retries), and `GitHubOAuthService` (httpx) all hand-build headers and create their own `AsyncClient` per call. That means a new TCP/TLS connection per request. There should be one shared client with connection pooling.
- Two GitHub rate-limit and cache strategies (`GitHubClient` throttle vs `github_service` dict caches).
- `api/dependencies.py` provides `get_search_service` and `get_qdrant_service` that return module singletons. That is DI ceremony, with the singletons still imported directly elsewhere (`search_service` imports `qdrant_service` directly).
- Two `/auth/github/callback` handlers (GET redirect and POST JSON) with nearly identical bodies. Two separate `GitHubClient`-style endpoints for batch contributors (`GET` and `POST` `/github/contributors*`) share logic but duplicate schemas.
- `main.py` has two health routes (`/health` and `/`), `render.yaml`/`vercel.json` (root and `frontend/vercel.json`) hold overlapping rewrite configs. `start.bat/.ps1` and `stop.*` exist at root **and** under `devops/`.
- `.dockerignore`, `data/qdrant_*` (Qdrant lock/`meta.json`/sqlite files, including `data/qdrant_lock_test/`) are **committed**. Add `data/` to `.gitignore` and untrack it.
- `backend-engineer.md` / `frontend-engineer.md` are agent persona prompts living inside source dirs. Keep them in `doc/` or out of the repo.
- `search_service.py` has a mid-file `logger = ...` between imports, and `schemas/__init__.py` (159 lines) re-exports schemas, which is a maintenance burden.
- Imports inside functions (`import re`, `import urllib.parse`, `from sqlalchemy import or_`, `from sqlalchemy import text`) with no circular-import reason.
- 18+ `print()` calls in `main.py` and scripts instead of `logging`. `main.py` mixes `print` with the logger used elsewhere. No logging config exists at all (no format, level, or request ID).
- `backend/core/jwt.py` shadows the name `jwt` against the `jose.jwt` import inside it. It works, but is confusing.

### D5 — Dependencies and unused stack
[pyproject.toml](file:///c:/Dev/open-source-assist/pyproject.toml):
- **Three DB drivers:** `asyncpg` (used), `psycopg[binary]` (no usage found), and `aiosqlite` (tests?). Remove what isn't needed.
- `langchain` (the full meta-package) is pulled in for one `ChatPromptTemplate` import that is unused. `langgraph` is used only to run two deterministic nodes in sequence (see C1). `litellm` is heavyweight and pulls in a large transitive tree.
- `alembic` is declared, but `init_db()` also does `create_all` and raw `ALTER`s (H2). Many deps are unpinned (`sqlalchemy`, `langchain`, `langgraph`, `litellm`, `pytest`), so builds drift (`uv.lock` helps, but `>=` ranges with `fastapi>=0.141.1` and `typescript ^7.0.2` are unusual versions. Check these are real and intended.)
- `[tool.vercel]` entrypoint is in `pyproject.toml` while Render is the actual backend target (`render.yaml`) and `vercel.json` points to Render. Remove the Vercel Python config if it's unused.
- No linter/type-checker config at all (`ruff`, `mypy`/`pyright` are absent).

---

## 4. Unnecessary complexity / abstractions unlikely to pay off

| # | Item | Why it's over-built | Suggestion |
|---|---|---|---|
| C1 | **LangGraph state graphs** in [chatbot_agent.py](file:///c:/Dev/open-source-assist/backend/services/chatbot_agent.py) and [learning_agent.py](file:///c:/Dev/open-source-assist/backend/services/learning_agent.py) | Each is a linear 2-node graph (`analyze → generate`). The "analysis" node is a pure function that picks a string by skill level, with no LLM, branching, loops or tools. It adds a heavy dependency, a `TypedDict` state, and compile-at-import for zero capability. | Replace with a plain function: `strategy = STRATEGY[level]` then one LLM call. Reintroduce LangGraph only when a real multi-step, branching agent exists. |
| C2 | **Strategy pattern + ABC + registry + factory** in [scoring_strategy.py](file:///c:/Dev/open-source-assist/backend/services/scoring_strategy.py) | Two strategies that are each a one-line formula, with `name` property boilerplate, a registry dict, and a factory that silently falls back. The `SearchService.__init__` also takes an injectable strategy that the router never injects, and the search logic hard-codes a third selection rule. | Two pure functions, selected by an `Enum` field on the request. Add an ABC only when a third real strategy exists. |
| C3 | **Qdrant "resilient fallback to embedded in-memory"** in [qdrant_service.py](file:///c:/Dev/open-source-assist/backend/services/qdrant_service.py#L77-L110) | Dev convenience that turns a production outage into **silent data divergence** (see H1). Also requires raw-socket probing and the separate `get_client`/`get_client_async` methods. | Fail fast in production (`ENVIRONMENT == "production"`). If a dev fallback is needed, make it an explicit setting (`QDRANT_URL=":memory:"`). |
| C4 | **Auto-seeding the Qdrant collection** from `curated_data.py` on startup | Hidden side effect on boot, which races across workers (H3), and it hides "collection is empty" as a normal state. Embeds ~284 lines of hard-coded repos in a service module. | A one-off `scripts/seed_*.py`, which already exists for other data. |
| C5 | **`PRESEEDED_CONTRIBUTORS` dict** (60 lines of hard-coded avatar/URLs) in [github_service.py](file:///c:/Dev/open-source-assist/backend/services/github_service.py#L32-L88) | Hard-coded fake `contributions` numbers returned as if they were API data. Contains a bad entry (`TomAugspurger` has no `html_url`, so it violates the response schema). There is also an unrelated duplicate "contributors" table synced into Postgres by `github_sync_service`. | Remove. Read from the synced `contributors` table or the cache. |
| C6 | **Two contributor pipelines** | (a) Airflow sync → Postgres `projects`/`contributors` → `/projects`, `/contributors`; (b) live-proxy with in-memory cache → `/github/contributors`. They serve overlapping features through different stores. | Choose one source of truth. |
| C7 | **Heavy Airflow dependency for one weekly job** ([dags/](file:///c:/Dev/open-source-assist/dags/github_sync_dag.py), `AIRFLOW_*` settings, `/airflow/trigger`) | Airflow isn't in compose, `render.yaml` or CI, so the "Run sync" button depends on an external service that isn't provisioned here. | A cron-triggered job (Render cron / GitHub Actions / APScheduler with a DB lock) and drop the Airflow settings and route. |
| C8 | **`OTP` as a DB "ephemeral key-value store" + 60s purge loop** in `main.py` | Re-implements Redis TTL semantics in Postgres with a per-worker `while True` loop. Expired OTPs are already rejected at verify time. | A periodic cleanup via the same cron job, or `DELETE` expired rows opportunistically on insert. |
| C9 | **`EventService` class wrapper**, `event_model.py` re-export, alias-probing `getattr` | See D3/D4. | Delete the wrapper and aliases. |
| C10 | **`schemas/__init__.py` mass re-export** and `UserCreate/UserLogin/UserLoginResponse` for the dead system | See D1/D4. | Import from the specific module. |
| C11 | **Frontend 700–840 line components** (`RedeemSection` 841, `RoadmapPage` 740, `ForumSection` 732, `ContributorsSection` 690, `AuthDialog` 585, `DashboardPage` 536) and 700-line static `data/git-assist-*.ts` bundles | Hard to test or review; these mix fetching, state, layout and constants. The tutorial and knowledge bundles (about 1.4k lines) ship in the main bundle. | Split by responsibility, lazy-load `data/*` and dashboard sections (`React.lazy`), and move content to JSON or the backend. |
| C12 | **`mockRoadmapData.ts`**, `browser-audit.mjs`, `check-contrast.mjs` | `mockRoadmapData.ts` has no importers (my grep found none). The audit scripts aren't wired to any `package.json` script or CI (verify). | Delete the dead mock, or wire up the scripts. |

> [!TIP]
> Rule of thumb for the cleanup: **keep an abstraction only if it has at least two real call sites or two real implementations today.** Items C1–C3, C7, C9 and C12 fail that test.

---

## 5. Performance

| # | Issue | Location | Fix |
|---|---|---|---|
| P1 | **N+1 queries in admin forum view.** For each thread it loads the thread (again), the author, and for each post another `select(User)`. `load_posts` already `selectinload`s authors, and then the code ignores `post.author`. For 50 threads × 20 posts, that is over 1000 queries. | [admin.py L82-L117](file:///c:/Dev/open-source-assist/backend/api/admin.py#L82-L117) | Use `thread.author`/`post.author` that are already eager-loaded. One query with `selectinload`, paginated. |
| P2 | **`ForumService.create_thread` / `add_reply` re-query** the author or thread after commit. **`get_thread` and the user lookup** are repeated in nearly every handler. | [forum_service.py](file:///c:/Dev/open-source-assist/backend/services/forum_service.py#L89-L124) | Use `RETURNING`, or `refresh` with `attribute_names`. |
| P3 | **A DB lookup on every authenticated request** (`get_optional_current_user` does `select(User)`), including public search for optional-auth routes. Fine at small scale, but it opens a pooled session and runs a query per call. | [dependencies.py](file:///c:/Dev/open-source-assist/backend/api/dependencies.py#L48) | Acceptable. If needed, cache `(user_id → status)` briefly in Redis. Avoid opening the session at all when there's no token. Note `get_db` creates the session eagerly even for guests. |
| P4 | **Embedding model loads lazily on the first request** (large ONNX download and load, several seconds) and runs on the default thread pool. With `--workers 2`, each worker holds its own copy. | [embedding_service.py](file:///c:/Dev/open-source-assist/backend/services/embedding_service.py) | Warm up in `lifespan`. Cap the thread pool. Consider a separate embedding service. Cache query embeddings. |
| P5 | **`collection_exists` round trip before every search** (`search_candidates`, `get_all_candidates`). | [qdrant_service.py L301, L343](file:///c:/Dev/open-source-assist/backend/services/qdrant_service.py) | Check once at startup. |
| P6 | **Blocking `socket.connect_ex`** inside async code. | [qdrant_service.py L62-L75](file:///c:/Dev/open-source-assist/backend/services/qdrant_service.py#L62-L75) | Remove (C3), or use `asyncio.open_connection`. |
| P7 | **A new `httpx.AsyncClient` per call**, with no connection reuse: `github_service` (x3 per profile), `github_oauth_service`, `airflow`. | various | A shared client created in `lifespan`. |
| P8 | **Profile stats make 3 GitHub calls per distinct username**, with a 10-minute in-memory cache and no stampede protection. Concurrent first hits all go upstream. | [github_service.py](file:///c:/Dev/open-source-assist/backend/services/github_service.py#L240) | Single-flight lock per key, shared cache (Redis), and auth required. |
| P9 | **Unbounded in-memory caches** `_CONTRIBUTORS_CACHE` and `_USER_STATS_CACHE`. They only evict on expiry-on-read, so there is a slow memory leak and an attack vector (S1) via many distinct usernames. | [github_service.py L28-L29](file:///c:/Dev/open-source-assist/backend/services/github_service.py#L28-L29) | Bounded TTL cache (`cachetools.TTLCache`) or Redis. |
| P10 | **`delete_ended_events` and `list_events`** fetch all rows, and `GET /admin/forum/threads` has no pagination. `list_events(limit=100)` default is a silent cap. | [event_service.py](file:///c:/Dev/open-source-assist/backend/services/event_service.py#L120-L127) | Filter in SQL (`event_date < today OR (event_date = today AND event_time < now)`), and paginate. |
| P11 | **Sequential awaits** in `_sync_project_contributors` (`get_user` per contributor) and the sync loop. Combined with the 1 req/s throttle that is intentional, so batch via GraphQL or only enrich changed contributors. | [github_sync_service.py](file:///c:/Dev/open-source-assist/backend/services/github_sync_service.py) | Incremental sync (`If-None-Match`/ETag), bounded concurrency. |
| P12 | **Scoring candidate window**: `CANDIDATE_SEARCH_LIMIT=100`, then a full Python sort, for every request. Fine now, but `normalize_popularity` recomputes `log10` constants per item. | [search_service.py](file:///c:/Dev/open-source-assist/backend/services/search_service.py#L49-L72) | Hoist constants. Consider Qdrant `FormulaQuery` or payload-based rescoring. |
| P13 | **DB pool** `pool_size=10, max_overflow=20` × 2 workers × N instances. On Neon/RDS free tiers (about 20–100 connections) this exhausts the limit when scaled out. Also `pool_recycle=300` with `pool_pre_ping` adds a round trip per checkout. | [database.py L20-L26](file:///c:/Dev/open-source-assist/backend/core/database.py#L20-L26) | Make pool sizes settings. Use PgBouncer (or Neon's pooler) when running several instances. |
| P14 | **SMTP** connects from scratch per message, inside the request. | [mail_service.py](file:///c:/Dev/open-source-assist/backend/services/mail_service.py) | Background task or a queue. |
| P15 | **Frontend**: 24 raw `fetch(` calls although `@tanstack/react-query` is installed. Look for duplicate requests, no cache or dedupe, and `github.ts` caching contributors in `localStorage` while fetching **sequentially** (comment at L68). The 1.4k lines of static tutorial data are in the main bundle. | `frontend/src/lib/*` | Use React Query consistently, one API client with auth interceptor, code-splitting. |

---

## 6. Horizontal-scaling blockers

The Dockerfile runs `uvicorn --workers 2`, and Render/compose can run more instances. **Everything below already misbehaves with 2 workers**, and gets worse with more instances.

### H1 — Silent in-memory Qdrant fallback
If Qdrant is unreachable when a worker first needs it, that worker permanently switches to a private `:memory:` store (`self._client` is cached, and never retried). It then auto-seeds the curated data. **Each worker/instance can have a different index**, and writes from `/internal/ingest` and background ingestion go into a store that vanishes on restart. Search results will differ per request depending on which worker answers. There is no health signal either: `check_health()` returns `True` for the in-memory client.
**Fix:** fail fast in non-dev. Expose `is_in_memory` on `/health`. Retry the real connection.

### H2 — Startup DDL in every worker, and three schema mechanisms
[`init_db()`](file:///c:/Dev/open-source-assist/backend/core/database.py#L36-L67) runs `create_all` **plus 16 raw `ALTER TABLE ... IF NOT EXISTS` statements** at every process start. Each `except Exception: pass` hides real failures. It also duplicates Alembic.
- Concurrent startup of N workers/instances races on DDL (deadlocks and lock waits on `ALTER TABLE`).
- Schema is defined in three places that can disagree: ORM models, `init_db` ALTERs, and Alembic versions. CI tests the migrations (`upgrade/downgrade/upgrade`) but **tests create the schema with `create_all`**, so the migrations are never exercised against the app.
- Alembic revision IDs: `20260930_0002` comes after `20260929_0003`, and `20261006_0004` follows `0002`. The chain is linear, but naming implies branching. The numbers are confusing.
- **Fix:** remove `create_all` and the ALTERs from the app. Run `alembic upgrade head` as a release step (init container or pre-deploy command), once. Delete the DAG `create_tables` task.

### H3 — Startup side effects in every worker
`lifespan` runs `ensure_collection_exists()` (which may auto-seed and embed 100+ repos, racing across workers) and starts `_otp_purge_loop` in **every** worker. The purge is idempotent, but it multiplies DB load, and the process-local task has no leader election. See C4 and C8.

### H4 — Process-local state
| State | Where | Effect with >1 instance |
|---|---|---|
| `_CONTRIBUTORS_CACHE`, `_USER_STATS_CACHE` | [github_service.py](file:///c:/Dev/open-source-assist/backend/services/github_service.py#L28-L29) | Each instance has its own cache, so GitHub quota use multiplies. Users see different "rate_limited"/fallback results. |
| GitHub request throttle (`_last_request_at`) | [github_client.py](file:///c:/Dev/open-source-assist/backend/services/github_client.py#L39) | Per-instance, so N instances multiply the request rate (and the secondary rate-limit risk). |
| Embedding model | `EmbeddingService._model` | N copies in RAM (hundreds of MB). |
| Qdrant client / in-memory index | `QdrantService` | See H1. |
| `BackgroundTasks` ingestion | [search.py](file:///c:/Dev/open-source-assist/backend/api/routes/search.py) | Runs in the request's process. Lost on restart or deploy, with no retry, no visibility and no back-pressure. |
| Frontend `localStorage` contributor cache | [github.ts](file:///c:/Dev/open-source-assist/frontend/src/lib/github.ts#L46-L59) | Fine (per-browser). |

**Fix:** Redis (or Postgres) for shared caches and rate limits, with a job queue (arq/RQ/Celery or a Postgres-backed queue) for sync, ingest and mail.

### H5 — Long-running work on the request path
`POST /sync` (minutes, one DB transaction), SMTP sends, LLM calls with no timeout, and the 15s synchronous Airflow call. Behind nginx `proxy_read_timeout 120s` and Render's request timeout, these fail midway on scale-out or restarts. Make them async jobs that return a job ID.

### H6 — Deployment topology
- Render free plan (single instance, sleeps), `autoDeploy: true`, `--workers` not set on Render but `2` in Docker. The two deployment targets (Render + Docker/EC2) use different start commands, config, CORS and workers. Pick one.
- No backend healthcheck in `docker-compose.prod.yml` (the frontend `depends_on` doesn't wait for readiness). `/health` is shallow, so it never checks DB or Qdrant. Add readiness (`/ready`) separate from liveness.
- No graceful shutdown handling for background tasks. `purge_task.cancel()` is never awaited.
- `uvicorn` isn't run with `--proxy-headers`. Add trusted proxy config before relying on client IPs.
- Docker image: runs as **root**, `uv:latest` and `qdrant:latest` are unpinned, `build-essential` stays in the final image (no multi-stage build), and there is no `HEALTHCHECK`. `Dockerfile.backend` also doesn't copy `dags/`.
- nginx `default.conf`: no TLS, no security headers, no rate limiting (`limit_req`), and `/docs` is public.

---

## 7. Testing, CI and tooling

### T1 — Test environment setup is ineffective
[conftest.py](file:///c:/Dev/open-source-assist/backend/tests/conftest.py#L29-L36) imports `backend.core.config.settings` **before** the `os.environ.setdefault` loop. `Settings()` is instantiated at import time, so the test defaults never take effect (including `JWT_SECRET_KEY`, `QDRANT_COLLECTION_NAME=test_repositories`, `ENVIRONMENT=testing`). The test file also does `if settings.DATABASE_URL:`, which is always truthy since `DATABASE_URL` is a property that always returns a string, so the "test" DB URL is just whatever `.env` points to. A developer with a real `DATABASE_URL` in `.env` may run tests against that database, and tests call `Base.metadata.create_all` there. The `.env` file exists at repo root (it is correctly untracked).
**Fix:** set the env **before** importing `settings`. Don't import it in `conftest`. Add a guard that aborts if the DB name doesn't end in `_test`.

### T2 — Coverage gaps
There are 13 backend test files and **zero frontend tests**. These have **no tests** as far as I can see: `/users/*`, events (public), projects/contributors, `github_sync_service`, `mail_service`, OTP expiry and replay, forum ban/upvote/permission paths, roadmap CRUD, authorization negatives (anonymous → 401/403 on admin and write routes), and the `/admin/forum/threads` route that I believe is broken (L1). A "401 for every non-public route" parametrized test would have caught S1/S2.
- Tests that override `get_db` with `create_all` each time are slow, and don't exercise Alembic.
- Tests monkeypatch `settings` attributes and the `httpx.AsyncClient` class, which is fragile. Prefer dependency injection.

### T3 — CI
[ci.yml](file:///c:/Dev/open-source-assist/.github/workflows/ci.yml) has a backend job only. Missing: frontend `tsc`/build/lint, `ruff`, type checking, dependency audit (`pip-audit`, `npm audit`), Docker build, secret scanning, and coverage. It triggers on `master` and `feature/**`. Actions aren't pinned by SHA. There is no CD or migration gating for Render and EC2.

### T4 — Code-quality tooling
No `ruff`/`black`/`mypy`, no `pre-commit`, no `.editorconfig`. Some files use `from __future__ import annotations` and some don't. Mixed formatting (some tabs, trailing whitespace in docstrings, over-long lines). No structured logging, request IDs, or metrics. `print` in the app. No `/metrics` or tracing.

---

## 8. Documentation and repo hygiene
- Many overlapping docs: `README.md`, `ARCHITECTURE.md`, `API_CONTRACT.md`, `doc/*`, `deploy/DEPLOYMENT.md`, `doc/deployment_and_operations.md`. Deployment is described in at least two. I didn't diff them, but with this much duplication they are likely stale. Docs claim the router has "zero business logic" (`search.py`), while other routers (`events.py`, `admin.py`, `auth.py`, `forum.py`) contain mapping and business logic. `API_CONTRACT.md` should be generated from OpenAPI.
- The app version `0.1.0` is hard-coded twice in `main.py`.
- The `data/` directory and `.pytest_cache` clutter. `devops/` and root-level `start.*`/`stop.*` are redundant. Two `vercel.json` files.
- Gemini model names in config (`gemini-3.5-flash`, `gemini-3.5-flash-lite`) differ between `config.py` and `render.yaml`, and should be verified as valid current model IDs.

---

## 9. Frontend notes (sampled)
- Auth state is duplicated in zustand (`user`, `token`) and `localStorage` (`osa-user`, `osa-token`), plus `github.ts` reads `osa-token` from `localStorage` directly instead of the store. `accountStatus` and `account_status` both exist on `User`, and the code normalizes both ways. Settle on one.
- `fetchProfile` hard-codes `/api/v1/auth/me`. Many modules build URLs by hand rather than through one API client. `vite.config.ts` hard-codes the dev proxy target, and `vercel.json` hard-codes the backend host.
- The `role` and `accountStatus` stored in `localStorage` are display hints only. Make sure the UI never relies on them for authorization. The admin routes are protected server-side, which is correct.
- TypeScript version `^7.0.2` and several other versions should be confirmed as real, installable versions.
- No error boundary, no tests, and a11y is spot-checked only by a script (`check-contrast.mjs`) that isn't wired in.

---

## 10. Suggested remediation roadmap

**Phase 0 — stop the bleeding (do before any public exposure)**
1. Lock `/sync*`, `/airflow/*`, `/internal/*` behind admin. Require auth and rate limits on LLM routes. Delete or gate `pat-login`.
2. Remove `/users/*` (System B), or require JWT and derive `user_id` from the token. Do the same for `/progress`, `/roadmaps*` writes.
3. Fix OAuth: verified emails only, link by `github_id`, server-side `state`, allowlisted redirect, never reactivate banned users, no token in the URL.
4. Add OTP attempt limits and an atomic consume. Stop logging OTPs. Add login and signup rate limiting.
5. Production config validation (secret length, explicit CORS origins, no default DB password, docs off).
6. Fix `conftest` env ordering and add a `_test` DB guard.

**Phase 1 — correctness**
7. Fix L1 (admin forum list). Use atomic SQL counters. Add an upvote uniqueness table. Fix the ranking inconsistencies (L4). Remove fabricated stats, or label them clearly (L6).

**Phase 2 — scaling**
8. Alembic-only schema, run once per release. Remove startup DDL, auto-seed and the purge loop from `lifespan`.
9. Fail fast on Qdrant in production. Move caches and rate limits to Redis. Move sync, ingest and mail to a job queue. Add `/ready`.
10. Shared `httpx` client, a bounded cache, a configurable DB pool and PgBouncer.

**Phase 3 — simplification**
11. Delete D1/D3/D4 duplicates, extract the single LLM client, and drop LangGraph, Airflow, the scoring ABC and `PRESEEDED_CONTRIBUTORS` (C1–C7). Remove unused dependencies.
12. Split the giant frontend components, adopt React Query throughout, and lazy-load the static data.

**Phase 4 — quality gates**
13. Add `ruff` and `mypy`, a frontend CI job, a negative-authorization test matrix, `pip-audit`/`npm audit`, and a non-root multi-stage Docker image with pinned tags.

---

## Appendix — What is done well
- Clear `api → services → models` layering, with Pydantic schemas on I/O.
- OTPs are stored as HMACs with a constant-time compare. Bcrypt hashing is run in a thread (`asyncio.to_thread`) at login. Signup defers user creation until the OTP is verified.
- `get_current_admin` enforces role server-side, and admin self-modification is blocked. Deactivated users are rejected per request.
- `DATABASE_URL` normalization handles the `postgres://`, `sslmode` and `channel_binding` quirks.
- Qdrant payload indexes and batched upserts are set up sensibly. Popularity uses log scaling to avoid mega-repo dominance.
- CI runs against real PostgreSQL and checks Alembic upgrade/downgrade.
- Sensible use of `selectinload` in most forum read paths (the admin view is the exception).

---

## Addendum (2026-10-09): corrections after the frontend diagnosis
- Some of my earlier text searches used a non-recursive pattern, so a few counts in this report were too low. Corrected figures: the frontend has **29** raw `fetch(` calls (not 24), and the backend counts for `print()`, `except Exception` and `getattr` are lower bounds. The conclusions do not change.
- `mockRoadmapData.ts` still has no importers after a recursive re-check.
- Additional finding from the frontend diagnosis: the Neon database is in us-east-2, and database round trips from India are about 280 ms. This is the main cause of the frontend lag. See `frontend_performance_plan.md`.
- `use-github-profile.ts` contains a hard-coded personal email and GitHub username fallback.
