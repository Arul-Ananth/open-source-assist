# Fix Plan â€” Open Source Assist

Source: [project_review_report.md](project_review_report.md). Finding IDs (S1, L1, H2, and so on) refer to that report.
**Out of scope per your request:** rate limiting, throttling, and email-bombing protection.

## Guiding rules
- One phase = one PR (or a small set). Each PR must leave the app working and tests green.
- Every behavior fix gets a test. Start with the negative-authorization test matrix (Phase 1), so later phases can't regress it.
- Delete code before adding code. Phase 5 removes a lot, which shrinks the surface for the other phases. I still keep it late so the risky security work isn't blocked by refactors.

## Phase overview

| Phase | Goal | Findings | Effort | Risk |
|---|---|---|---|---|
| 0 | Safe test harness | T1 | 0.5 d | Low |
| 1 | Close authorization holes | S1, S2, S3 | 1.5 d | Medium (breaks unauthenticated clients) |
| 2 | Fix login and OAuth flows | S4, S5 (partial), S6, S7 | 2 d | Medium (frontend change) |
| 3 | Correctness bugs | L1â€“L6 | 2 d | Low |
| 4 | Schema and startup, ready for scale-out | H1â€“H3, H5, H6 | 2â€“3 d | **High** (DB migrations, deploy) |
| 5 | Remove duplication and over-engineering | D1â€“D5, C1â€“C12 | 3 d | Medium |
| 6 | Performance | P1â€“P15 | 1.5 d | Low |
| 7 | CI, tooling, docs | T2â€“T4 | 1.5 d | Low |

Phases 0 â†’ 1 â†’ 2 should be done in order. After Phase 2, Phases 3, 5 and 6 can run in parallel. Phase 4 needs a maintenance window.

---

## Phase 0 â€” Safe test harness *(do first)*
**Why first:** every later change relies on tests, and today the tests may touch the wrong database (T1).

| # | Task | Details |
|---|---|---|
| 0.1 | Fix `conftest.py` env ordering | In [conftest.py](file:///c:/Dev/open-source-assist/backend/tests/conftest.py), set `os.environ[...]` (force, not `setdefault`) for `DATABASE_URL`, `JWT_SECRET_KEY`, `ENVIRONMENT=testing`, `QDRANT_COLLECTION_NAME`, **before** anything imports `backend.core.config`. Remove the `from backend.core.config import settings` / `if settings.DATABASE_URL` block. |
| 0.2 | Safety guard | In a session-scoped autouse fixture, assert the DB name ends with `_test` (or is SQLite), else `pytest.exit(...)`. |
| 0.3 | Test DB URL source | Read `TEST_DATABASE_URL` (default `postgresql+asyncpg://postgres:postgres@localhost:5432/open_source_assist_test`). CI already uses this DB name. |
| 0.4 | Shared fixtures | Move the duplicated `auth_session` / `override_get_db` setup (copied in `test_auth.py`, `test_admin.py`, and others) into `conftest.py`: `db_session`, `client`, `make_user(role=...)`, `auth_headers(user)`. |

**Acceptance:** with a real `DATABASE_URL` in `.env`, `pytest` never connects to it (verify by pointing `.env` at a dead host, and tests still pass). Existing tests are unchanged and green.

---

## Phase 1 â€” Close authorization holes (S1, S2, S3)

### 1.1 Write the failing tests first
Add `tests/test_authz_matrix.py`. Use a parametrized list of `(method, path, payload)` for every non-public route. Assert anonymous â†’ 401, normal user â†’ 403 on admin/internal routes. Mark them `xfail` until each fix lands, then remove the markers.

### 1.2 Route protection

| Route group | Required access | Change |
|---|---|---|
| `POST /sync`, `/sync/contributors` ([github.py](file:///c:/Dev/open-source-assist/backend/api/routes/github.py)) | Admin | Add `Depends(get_current_admin)`. |
| `POST /airflow/trigger` | Admin | Same. (Or delete in Phase 5 if Airflow isn't deployed.) |
| `POST /internal/ingest` ([search.py](file:///c:/Dev/open-source-assist/backend/api/routes/search.py)) | Service/admin | Admin dependency. If Airflow or a script calls it, add an optional `INTERNAL_API_KEY` header check (`secrets.compare_digest`) as a second accepted credential. |
| `POST /chatbot/query`, `/learning/*` | Logged-in user | `Depends(get_current_user)`. Cost control without rate limiting: also cap request size (`max_length` on `question`/`topic`/`user_context`) and `limit`. |
| `/assessment/*` | Keep optional auth | Already optional. Cap input sizes. |
| `GET /github/user-profile/{username}`, `/github/contributors*` | Logged-in user | Add dependency. Also validate the input (see 1.4). |
| `/roadmaps` POST/PATCH/DELETE, `/roadmaps/{id}/steps*` | Admin | Roadmap templates are shared content. |
| `GET /roadmaps`, `GET /roadmaps/{id}` | Public | Unchanged. |
| `POST /roadmaps/personalized`, `/progress*`, `/users/{id}/progress*`, `/users/{id}/roadmaps/{id}/progress` | Logged-in user, **self only** | See 1.3. |
| `/users/*` | See D1 | See 1.5. |

**Structural safeguard:** attach protection at router level, for example `APIRouter(dependencies=[Depends(get_current_admin)])` for admin-only routers, so a new route can't be left open by accident. Split `github.py` into `github_admin.py` (sync) and `github_public.py`.

### 1.3 Remove client-supplied identity (S2)
- Delete `user_id` from `PersonalizedRoadmapSyncRequest` and `ProgressCreate` in [schemas/roadmaps.py](file:///c:/Dev/open-source-assist/backend/schemas/roadmaps.py). Use `current_user["user_id"]`.
- Replace `/users/{user_id}/progress` with `/me/progress` and `/me/roadmaps/{roadmap_id}/progress`. Keep the old paths for one release as deprecated aliases that require `user_id == caller`, else 403.
- `PATCH /progress/{progress_id}`: load the row and check `entry.user_id == caller`, else 404 (don't leak existence).
- **Frontend:** update [roadmap-api.ts](file:///c:/Dev/open-source-assist/frontend/src/lib/roadmap-api.ts) and callers to stop sending `user_id`. Ensure every call sends the `Authorization` header.

### 1.4 Input validation on proxy endpoints
- `username`: regex `^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$`. Repo `full_name`: `^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$`. Return 422 otherwise.
- Cap `repos` at 20 items for both contributor endpoints.
- Remove the `is_local = {"admin","demo",...}` special case (see L6).

### 1.5 PAT login (S3)
- **Delete** `POST /auth/github/pat-login` and the `has_pat` field from `/auth/github/url`. Remove `loginWithConnectedGitHub` and the matching button in the frontend ([auth-store.ts](file:///c:/Dev/open-source-assist/frontend/src/lib/auth-store.ts), `AuthDialog.tsx`).
- If a dev shortcut is genuinely needed: register the route only `if settings.ENVIRONMENT == "development"`, and add a startup check that refuses to boot in production with it enabled.

**Acceptance:** the authz matrix test is fully green with no `xfail`. Manually: `curl -X POST /api/v1/sync` â†’ 401. The frontend roadmap, progress, forum and chatbot flows still work when logged in.

**Risk:** unauthenticated clients (the frontend's guest views for chatbot or learning) will start getting 401. Decide per route (see Open decisions) and handle it gracefully in the UI by showing the login dialog.

---

## Phase 2 â€” Auth flows (S4, S5-partial, S6, S7)

### 2.1 GitHub OAuth hardening (S4)
In [github_oauth_service.py](file:///c:/Dev/open-source-assist/backend/services/github_oauth_service.py) and [api/auth.py](file:///c:/Dev/open-source-assist/backend/api/auth.py):
1. **Verified emails only.** Remove the `emails_list[0]` fallback. If no verified email is available, return a clear error ("Add a verified email to your GitHub account").
2. **Link by GitHub ID.** Add `users.github_id BIGINT UNIQUE NULL` (migration in Phase 4's Alembic flow, or ship the Alembic migration now). Lookup order: `github_id` â†’ verified email. When linking an existing email account for the first time, only do so if GitHub's email is `verified`.
3. **Respect bans.** Delete the `if not user.is_active: user.is_active = True` line. Reject login when `is_active` is false or `account_status != "active"`, same as password login.
4. **`state` and CSRF.**
   - `GET /auth/github/url`: generate `state = secrets.token_urlsafe(32)` server-side. Store it in a signed, short-lived (10 min), HttpOnly cookie, or sign it as a JWT (`typ=oauth_state`, `exp`). Don't accept a client `state`.
   - Callback: require and verify `state`, else 400.
5. **Redirect URI.** Remove the client-controlled `redirect_uri` param from `/github/url` and the POST body. Use `settings.GITHUB_REDIRECT_URI` only (or an allowlist from config).
6. **Collapse the two callbacks.** Keep one flow (see 2.2 for token delivery) and delete the other.

### 2.2 Stop putting the JWT in the URL (S7)
- GET callback creates a **one-time login code** (random, 60s TTL, stored in DB table `oauth_login_codes` or reuse the `otps` table with a new purpose). It redirects to `/?oauth_code=<code>` only.
- New `POST /auth/github/exchange {code}` â†’ returns `AuthResponse` (JWT) and consumes the code atomically (`DELETE ... RETURNING`).
- Frontend: on load, if `oauth_code` is in the URL, POST it, store the session, then `history.replaceState` to clear the query string. Remove `oauth_token`/`email`/`username` parsing.
- Don't leak internals in redirects: replace `?oauth_error=<str(exc)>` with fixed error codes (`oauth_error=denied|failed|no_verified_email`).

### 2.3 OTP correctness (no rate limiting)
In [otp_service.py](file:///c:/Dev/open-source-assist/backend/services/otp_service.py):
- **Atomic consume.** `SELECT ... FOR UPDATE` on the row, verify, delete, commit in one transaction. This removes the double-use race.
- *Optional, cheap, and not rate limiting:* add `attempts INT DEFAULT 0` and invalidate the OTP after 5 wrong tries. It closes the brute-force path without any rate-limit infrastructure. Skip it if you prefer. I'd still do it because it's about 10 lines.
- **Stop logging OTPs.** Delete both `logger.info("[AUTH] ... OTP ...")` lines in [mail_service.py](file:///c:/Dev/open-source-assist/backend/services/mail_service.py#L54). For dev, log the OTP only when `ENVIRONMENT == "development"` and SMTP is unconfigured.
- **Enumeration consistency.**
  - `signup`: always respond "If this email can be registered, a code was sent". Don't reveal existing accounts.
  - `reset_password`: return the same generic "Invalid or expired code" for unknown email and wrong OTP.
  - `login`: when the user doesn't exist, run `verify_password` against a precomputed dummy hash so timing matches.
- **Mail off the request path.** Send via FastAPI `BackgroundTasks` for now (a real queue comes in Phase 4). Failures are logged. The endpoint returns the generic message either way.
- `reset_password`: reject inactive or suspended accounts, and **invalidate existing tokens** (see 2.5).

### 2.4 Config and secret safety (S6)
In [config.py](file:///c:/Dev/open-source-assist/backend/core/config.py), add a `model_validator(mode="after")`. When `ENVIRONMENT == "production"`, raise if:
- `JWT_SECRET_KEY` is the default placeholder or shorter than 32 chars.
- `CORS_ALLOW_ORIGINS` contains `*`.
- Postgres is built from the default `postgres/postgres` credentials.
- Then, in [main.py](file:///c:/Dev/open-source-assist/backend/main.py): `docs_url/redoc_url/openapi_url=None` when production (or gated by `ENABLE_DOCS`). Set CORS methods and headers to explicit lists. Filter empty origin entries.
- [render.yaml](file:///c:/Dev/open-source-assist/render.yaml): `CORS_ALLOW_ORIGINS` â†’ the real frontend origin (`sync: false`).
- [docker-compose.prod.yml](file:///c:/Dev/open-source-assist/docker-compose.prod.yml): require `${POSTGRES_PASSWORD:?set it}` (no default). Add `QDRANT__SERVICE__API_KEY`. Bind the frontend to the proxy only. Wire in `nginx-ssl.conf` or terminate TLS upstream.
- [docker-compose.yml](file:///c:/Dev/open-source-assist/docker-compose.yml) (dev): bind Qdrant to `127.0.0.1`.

### 2.5 Token model
- Add `jti` and `iat` to the JWT. Add `users.token_version INT DEFAULT 0` and include `tv` in the token. `get_optional_current_user` rejects a token whose `tv` differs from the user's. Bump `token_version` on password reset, ban and deactivate. This gives you server-side revocation with no extra store.
- Replace `python-jose` with `PyJWT` (same API shape, about 10 lines in [jwt.py](file:///c:/Dev/open-source-assist/backend/core/jwt.py)). Require `exp` and `sub`, and pin `algorithms=["HS256"]`.
- Replace `passlib` with direct `bcrypt` (or `argon2-cffi`) in [security.py](file:///c:/Dev/open-source-assist/backend/core/security.py). Delete the `bcrypt.__about__` shim. Keep verification compatible with existing `$2b$` hashes, so no user migration is needed. Enforce a max password length of 72 bytes in the schema.
- Encrypt `github_access_token` at rest with Fernet (`GITHUB_TOKEN_ENC_KEY`), or stop persisting it. Widen the column to `Text`. Stop copying it into the per-request user dict. Fetch it only where search needs it.

### 2.6 Frontend token storage (S7)
Move the JWT out of `localStorage` into memory plus an HttpOnly, `SameSite=Lax`, `Secure` cookie. This is the real fix, but it is the largest change. **Decision needed.** The minimal version stores the token only under `osa-token` (drop the duplicate inside `osa-user`), reads it only from the store, and adds a strict CSP header in nginx or Vercel.

**Acceptance:** tests for: unverified-email OAuth rejected; banned user cannot log in through GitHub; replayed or concurrent OTP consumed once; wrong-state callback â†’ 400; token invalid after password reset; production settings validation raises with defaults; no OTP strings appear in logs.

---

## Phase 3 â€” Correctness bugs (L1â€“L6)

| # | Fix | Files | Test |
|---|---|---|---|
| 3.1 | **L1** Admin forum list: unpack `(threads, total)`. Add `limit/offset` query params. Use eager-loaded `thread.author`/`post.author`, with no per-row queries (also fixes P1). | [admin.py](file:///c:/Dev/open-source-assist/backend/api/admin.py#L82-L117), [forum_service.py](file:///c:/Dev/open-source-assist/backend/services/forum_service.py) | New `test_admin_forum_list` |
| 3.2 | **L2** Atomic counters: `update(ForumThread).values(views_count=ForumThread.views_count + 1)`, same for `reply_count` and `upvotes`. | forum_service.py | Concurrent-increment test using `asyncio.gather` |
| 3.3 | **L2** Upvote dedupe: new table `forum_post_votes(post_id, user_id, PK(post_id, user_id))`. Upvote is idempotent, and add `DELETE` to un-vote. Count from the table, or maintain the counter inside the same transaction. | models, migration, forum route | Double-upvote returns the same count |
| 3.4 | **L2** Views: increment on GET, but only for logged-in users or at most once per (user, thread, hour) using the same pattern as 3.3. Simplest option: drop `views_count` writes on GET and keep a counter endpoint. **Decision needed.** | forum route | â€“ |
| 3.5 | **L3** `is_banned` becomes read-only (`expires_at` filter in the query). A separate purge handles expired rows. Pass `reason` and `expires_at` through the admin ban API. Decide whether `ForumBan` and `account_status` stay separate (see Open decisions). | forum_service.py, admin.py, schemas/admin.py | Ban expiry test |
| 3.6 | **L4** Search ranking. See details below. | [search_service.py](file:///c:/Dev/open-source-assist/backend/services/search_service.py), [scoring_strategy.py](file:///c:/Dev/open-source-assist/backend/services/scoring_strategy.py) | Update `test_scoring.py`, `test_search_api.py` |
| 3.7 | **L5** Username uniqueness: normalize to lowercase on write, add a unique index on `lower(username)` (backfill and dedupe first, with a migration that renames collisions as `name_<n>`). Login by email **or** username, but reject usernames that look like emails. Ensure `verify_password` returns `False` for non-bcrypt hashes (`oauth:github:...`) instead of raising, and gives a clear "use GitHub login" error. | models, auth_service, security | Login with an OAuth-only account â†’ 401, not 500 |
| 3.8 | **L6** Event handling: fix the description bug (store a real description, with a schema field), replace `_is_ended` + `delete_ended_events` with a SQL `WHERE`, stop swallowing exceptions, and add a `timezone` field (default `Asia/Kolkata`). Escape `%`/`_` in `ilike` filters via a helper. | event_service.py, schemas/events.py | Ended-event deletion with boundary times |
| 3.9 | **L6** GitHub stats: remove fabricated values. Use real values or omit them. Streak = consecutive days with events from the actual data. Rank labels use fixed thresholds with no invented percentile ("Top 5%"). Remove the "sentry"/"ocean" badge hack and substring `"ai"` matching. Count `merged_prs` from `payload.pull_request.merged`. Use UTC consistently. Remove the `is_local` special case. | [github_service.py](file:///c:/Dev/open-source-assist/backend/services/github_service.py#L240-L621) | Unit tests with a recorded events fixture |
| 3.10 | **L6** Sync reliability: commit per project, preserve existing contributor fields when `get_user` fails, don't overwrite with `None`. Run only as a job (see Phase 4). | [github_sync_service.py](file:///c:/Dev/open-source-assist/backend/services/github_sync_service.py) | Partial-failure test |
| 3.11 | **L6** `GitHubClient` throttle: guard `_wait_before_request` with an `asyncio.Lock`. | github_client.py | â€“ |
| 3.12 | **L6** Misc: remove the duplicated Windows loop-policy call in `main.py`. `purge_task.cancel()` followed by `await` with `suppress(CancelledError)`. Single `APP_VERSION` constant. | main.py | â€“ |

**3.6 detail (search):**
1. Make both strategies return a score in [0, 1]. For `MultiplicativeGate` use `s * (1 + w*p) / (1 + w)`. Document it.
2. Remove the hard-coded `>= 0.7 â†’ LinearHybrid` switch. Strategy comes from `request.strategy`, otherwise the default.
3. Unknown strategy name â†’ 422 (Pydantic `Literal`/`Enum`).
4. Live GitHub results: don't invent `0.85`. Embed the live candidates' text with the same embedder and compute a real cosine score, or rank them in a separate, labelled "live" section.
5. Only ingest live results into the shared index when the result is a verified GitHub API response (it already is), and only through an internal service path, not user-triggered writes without a size cap. Cap at 15 items (already) and ensure dedupe by `repo_id`.
6. Browse mode: use Qdrant `scroll` with `order_by` (stars) or a payload-based sort so the order is deterministic and offset paging is stable.

**Acceptance:** all new tests pass. `GET /admin/forum/threads` returns 200 with data. Scores always lie within [0, 1].

---

## Phase 4 â€” Schema, startup and scale-out readiness (H1â€“H6)
*High risk: back up the database and rehearse on a copy first.*

### 4.1 Alembic as the only schema authority (H2)
1. **Baseline.** On a copy of production, run `alembic upgrade head`, then compare `alembic revision --autogenerate` against the live schema. Capture the drift as one revision, `*_reconcile_schema`. This must include everything `init_db`'s 16 `ALTER`s add (forum columns and indexes, `forum_bans` columns). Make every statement idempotent (`IF NOT EXISTS` via `op.execute`) so it is safe on both fresh and existing databases.
2. **Rename the confusing revision IDs** only if no environment has run them. Otherwise leave them as they are. They form a valid linear chain.
3. **Remove from the app:** `create_all` and the `migrations` list in [database.py](file:///c:/Dev/open-source-assist/backend/core/database.py), the `init_db()` call in `lifespan`, and the DAG task `create_tables`.
4. **Run migrations once per release:** Render â†’ `preDeployCommand: uv run alembic upgrade head`. Docker/EC2 â†’ a one-shot `migrate` service in compose (`restart: "no"`) that the backend `depends_on` with `condition: service_completed_successfully`.
5. **Tests use Alembic** for the schema (or at least one CI job does `alembic upgrade head` then runs the suite). This closes the gap where tests use `create_all`.

New migrations needed by earlier phases (bundle into the numbered sequence): `users.github_id`, `users.token_version`, `forum_post_votes`, unique index on `lower(username)`, `otps.attempts` (optional), `oauth_login_codes`, `events.description`/`timezone`, and the widening of `github_access_token`.

### 4.2 Qdrant: fail fast, no silent in-memory fallback (H1)
In [qdrant_service.py](file:///c:/Dev/open-source-assist/backend/services/qdrant_service.py):
- Remove `_is_server_reachable` (blocking socket), `get_client()` and the in-memory fallback. A single `get_client()` builds `AsyncQdrantClient(url=..., api_key=...)` once.
- Dev convenience stays explicit: if `QDRANT_URL == ":memory:"` (only allowed when `ENVIRONMENT != "production"`).
- `check_health()` does a real call. Add `GET /ready` that checks Postgres (`SELECT 1`) and Qdrant, returning 503 on failure. Keep `/health` as a shallow liveness check.
- `lifespan` logs a clear error and **exits** in production if Qdrant is unreachable (or starts degraded, with `/ready` returning 503 and search returning 503, not empty results). **Decision needed.** Don't swallow search errors into `points = []` ([search_service.py L125-L127](file:///c:/Dev/open-source-assist/backend/services/search_service.py#L125-L127)). Return 503 so the outage is visible.
- Remove the per-request `collection_exists` check (P5). Do it once at startup.

### 4.3 Startup side effects out of workers (H3)
- Delete `_seed_curated_catalog` from the service. Move seeding to `backend/scripts/seed_qdrant.py` (reuse `curated_data.py`), run in the release step after migrations.
- Delete `_otp_purge_loop`. Replace with an opportunistic `DELETE FROM otps WHERE expires_at < now()` inside `generate_and_store_otp`, plus the same purge for expired forum bans, so no scheduler is required.
- Warm the embedding model once in `lifespan` (P4), which fails fast if the model can't download.

### 4.4 Shared state (H4)
- **No Redis for now** (no rate limiting needed). Keep the GitHub caches in-process but make them bounded with `cachetools.TTLCache(maxsize=1000, ttl=600)` and a per-key `asyncio.Lock` to avoid stampedes. Document that each instance has its own cache, which is acceptable for a read-through cache. If you later add Redis, only the cache class changes.
- The GitHub request throttle only matters for the sync job. Run the sync as a **single** scheduled job, so per-process throttling is fine.
- Run `--workers 1` per container and scale with container replicas (or keep 2 for CPU, but only after the embedding model memory cost is measured).

### 4.5 Jobs off the request path (H5)
Pick the lightest option that fits. **Decision needed:**
- **A. Cron (recommended).** Render Cron Job / GitHub Actions schedule / EC2 cron runs `python -m backend.scripts.sync_github` weekly. `POST /sync` (admin) becomes "enqueue" by inserting a row in a `sync_jobs` table with status. A worker or cron picks it up, with a `pg_advisory_lock` so only one runs. `GET /sync/status` reports progress. This removes Airflow (C7).
- **B. Keep Airflow.** Provision it in compose and document it. The `/airflow/trigger` route stays, admin only.
- Mail: `BackgroundTasks` (done in Phase 2) is enough until volume grows.
- Search background ingestion (`BackgroundTasks`): acceptable, but log failures with counts. It's fire-and-forget by design.

### 4.6 Deployment hygiene (H6)
- Pick **one** primary deployment target (Render or Docker/EC2) and delete or mark the other as unmaintained: root `vercel.json` vs `frontend/vercel.json`, `start.*`/`stop.*` duplicates in `devops/`, `[tool.vercel]` in `pyproject.toml`.
- [Dockerfile.backend](file:///c:/Dev/open-source-assist/Dockerfile.backend): multi-stage build (build deps only in the builder), non-root user, pinned `uv` and Python image tags, `HEALTHCHECK` on `/health`, `--proxy-headers --forwarded-allow-ips=<nginx>`. Pin `qdrant/qdrant:vX.Y` in both compose files.
- Compose: backend `healthcheck`, and frontend `depends_on: backend: condition: service_healthy`.
- nginx: add security headers (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, CSP), block `/docs`, `/redoc` and `/openapi.json` in production, and wire TLS.
- DB pool settings (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`) go in config. Document the PgBouncer or Neon pooler requirement when `replicas Ã— workers Ã— (pool_size + overflow)` approaches the DB limit.
- Untrack `data/` (`git rm -r --cached data/`), add it to `.gitignore`.

**Acceptance:** a fresh DB reaches the correct schema purely through `alembic upgrade head`. Starting 4 workers simultaneously doesn't run any DDL or seeding. Killing Qdrant makes `/ready` return 503 and search return 503, with no silent divergence. The sync job can't run twice concurrently.

---

## Phase 5 â€” Remove duplication and over-engineering (D1â€“D5, C1â€“C12)
Each step is a separate commit so it can be reverted independently. Do it only after Phases 1â€“2 are merged. Several of these deletions make earlier work simpler.

| # | Action | Notes |
|---|---|---|
| 5.1 | **Delete System B** (`/users/register`, `/users/login`, `user_service` auth functions, `UserCreate/UserLogin/UserLoginResponse`). Keep a slim `/me` profile update (`PATCH /auth/me`) for `username`, `skill_level` and `user_context`. | D1. First confirm via frontend grep and access logs that nothing calls them. |
| 5.2 | **Unify `user_context` vs `context`**: pick `user_context` (string, used by the UI). Migrate any data from `context` JSON, then drop the column. | D1 |
| 5.3 | **Single LLM client** `backend/services/llm_client.py`: `structured_completion(schema, system, user, *, timeout=30, retries=2)`, which handles model-id prefixing, parsed/JSON fallback, and error mapping. Replace the 4â€“5 copies. | D2. Add input delimiters (`<user_input>...</user_input>`) in prompts. |
| 5.4 | **Drop LangGraph and LangChain**: turn both "agents" into plain async functions using `STRATEGY[level]`. Remove `langgraph`, `langchain` from dependencies. | C1 |
| 5.5 | **Scoring**: replace the ABC, registry and factory with two pure functions plus a `Literal["multiplicative_gate","linear_hybrid"]` request field. | C2. Update `test_scoring.py`. |
| 5.6 | **Events**: a single `EventItem.from_model()`. Delete `_event_item`, `_to_event_item`, the alias `getattr` probing, the `EventService` wrapper class, and `models/event_model.py`. Import `Event` from `models.event`. | D3, D4 |
| 5.7 | **Remove redundant `getattr(user, "role", "user")` calls** (about 20 sites) and use attributes directly. | D3 |
| 5.8 | **Contributors**: delete `PRESEEDED_CONTRIBUTORS` and `_owner_fallback`. Serve contributors from the synced `contributors` table. The live proxy (`/github/contributors*`) becomes a fallback only if the table has no row. Pick one pipeline (C6). Merge the duplicate GET and POST batch endpoints into one. | C5, C6 |
| 5.9 | **GitHub clients**: one shared `httpx.AsyncClient` (in `lifespan`, exposed via a dependency) with common header construction. Fold `GitHubService` HTTP calls into `GitHubClient`. | D4, P7 |
| 5.10 | **Service style**: pick module-level async functions or classes, and convert the minority. Suggest functions (the `roadmap_service` style) because the static-method classes are pure namespaces. | D4 |
| 5.11 | **Routing layout**: move `api/auth.py` and `api/admin.py` into `api/routes/`. Collapse the duplicate `/` and `/health` handlers. | D4 |
| 5.12 | **Dependencies**: remove `psycopg[binary]`, `aiosqlite` (unless the tests really use it), `langchain`, `langgraph`, `python-jose`, `passlib`, and `alembic` stays. Verify each with grep and by running the tests after removal. Check the odd version pins (`fastapi>=0.141.1`, `typescript ^7.0.2`) are real. | D5 |
| 5.13 | **Airflow**: decided in 4.5. If option A, delete `dags/`, `routes/airflow.py`, `AIRFLOW_*` settings and tests. | C7 |
| 5.14 | **Logging**: replace the 18 `print()` calls with `logging`. Add a `core/logging.py` that configures the format and level, and a request-ID middleware. | D4 |
| 5.15 | **Cleanup**: inline function-level imports. Fix the mid-file `logger` in `search_service.py`. Remove unused imports. Delete the `mockRoadmapData.ts` dead file, the unwired audit scripts (or wire them to `package.json`), and `backend-engineer.md` / `frontend-engineer.md` (move to `doc/` if you want to keep them). | D4, C12 |
| 5.16 | **Frontend**: one `apiClient` (base URL, auth header, error normalization, 401 handler). Replace the 24 raw `fetch` calls with it and with React Query hooks. Split the 600+ line components (`RedeemSection`, `RoadmapPage`, `ForumSection`, `ContributorsSection`, `AuthDialog`, `DashboardPage`) by responsibility. `React.lazy` for dashboard sections and the `data/git-assist-*.ts` bundles. Normalize `account_status`/`accountStatus` to one name. | C11, P15 |

**Acceptance:** the test suite is green, `pip`/`uv` install size is smaller, and `grep` finds no references to the deleted modules.

---

## Phase 6 â€” Performance (P1â€“P15)
Most items are already covered above. Remaining ones:
- **P1** (done in 3.1), **P5/P6** (done in 4.2), **P7** (5.9), **P9** (4.4), **P10** (3.8).
- **P3** Don't open a DB session for guests: make the session dependency lazy inside the user dependency when a token is present. For hot paths, use a small TTL cache for `(user_id, token_version) â†’ status` with a 30â€“60s TTL. Skip unless profiling shows a need.
- **P4** Cache query embeddings (`functools.lru_cache`-style on the normalized query, 1k entries).
- **P8** Bounded TTL cache plus single-flight (4.4).
- **P11** Incremental contributor sync (ETag / `last_synced_at` older than N days only).
- **P12** Hoist the popularity constants.
- **P13** Pool config (4.6).
- **P14** SMTP in the background (2.3). Optionally reuse a connection per batch.
- **Measure first:** add timing logs (request ID plus duration) and check `EXPLAIN` on the forum list and event filters. Add indexes only where measured: `forum_threads(category, last_activity_at)`, `events(event_date, event_time)`, and trigram indexes if you keep `%term%` search.

---

## Phase 7 â€” CI, tooling, docs (T2â€“T4)
1. **Tests to add** (beyond those in earlier phases): events (public + admin), projects/contributors, OTP expiry/replay, mail service (fake SMTP), forum permissions and bans, roadmap CRUD authorization, GitHub sync partial failure, and the search 503 behavior.
2. **Tooling:** add `ruff` (lint and format) and `mypy` (or `pyright`) config to `pyproject.toml`, plus `pre-commit`. Fix the findings in one mechanical commit, separate from the logic changes.
3. **CI jobs:**
   - Backend: `ruff check`, `mypy`, `alembic upgrade head` â†’ test suite with coverage (fail under a modest threshold, e.g. 70%).
   - Frontend: `npm ci`, `tsc --noEmit`, `eslint`, `vite build`, and add Vitest with a few smoke tests for the auth store and the API client.
   - Security: `pip-audit`, `npm audit --omit=dev`, secret scan (gitleaks).
   - Docker: build both images (no push) to catch build breaks.
   - Pin third-party actions by SHA.
4. **Docs:** one README (setup, env vars, how to run migrations, seed, and tests), one `ARCHITECTURE.md`, and OpenAPI generated and exported as the API contract. Delete `doc/deployment_and_operations.md` **or** `deploy/DEPLOYMENT.md` (keep one). Update docs for each behavior change made above (auth model, OAuth flow, job model).
5. **Observability (light):** structured JSON logs, request ID, and the `/ready` endpoint. Metrics are optional.

---

## Cross-cutting: migration inventory

| Migration | Phase | Notes |
|---|---|---|
| `users.github_id` (unique, nullable) | 2 | Backfill lazily on next GitHub login. |
| `users.token_version` | 2 | Default 0. |
| `lower(username)` unique index | 3 | Dedupe collisions first. |
| `forum_post_votes` | 3 | New table. |
| `otps.attempts` (optional), `oauth_login_codes` | 2 | |
| `events.description`, `events.timezone` | 3 | Backfill `description = name` for old rows. |
| `users.github_access_token` â†’ `Text` | 2 | |
| Reconcile schema (forum columns and indexes) | 4 | Idempotent. |
| Drop `users.context` | 5 | After the data migration. |

## Rollout order and risk notes
1. Phase 0 â†’ 1 â†’ 2: ship together or back to back. These are the exposure fixes, so don't deploy the app publicly before they land.
2. Phase 1 and 2 change the API contract. Release the frontend and backend **together**, or keep the deprecated aliases for one release.
3. Phase 4 touches production data. Take a backup, rehearse on a copy, and deploy in a quiet window. Make the new migrations idempotent so a re-run is safe. Keep the old startup `ALTER`s in place until the reconcile migration has run in every environment, then remove them in a follow-up deploy.
4. Phase 5 is large: don't mix it with behavior changes in the same PR.
5. Rollback: every PR is independently revertible. Migrations have `downgrade()` (CI already checks upgrade, downgrade, upgrade).

## Open decisions (need your answer before the affected phase)

| # | Question | My default |
|---|---|---|
| 1 | Should chatbot, learning and assessment stay open to guests, or require login? (Phase 1) | Require login for chatbot and learning (they cost money). Keep assessment optional. |
| 2 | Is `/users/*` (System B) used by anything? (Phase 1/5) | Delete it. |
| 3 | Is Airflow deployed or planned? (Phase 4.5) | No â†’ cron job, remove Airflow. |
| 4 | Token storage: memory plus HttpOnly cookie, or keep `localStorage` with the minimal cleanup? (2.6) | Cookie, if you accept the CORS and CSRF handling it requires. Otherwise the minimal cleanup. |
| 5 | Qdrant down in production: refuse to start, or run degraded with 503s? (4.2) | Run degraded with `/ready` = 503. |
| 6 | Keep `ForumBan` and `account_status` as two concepts? (3.5) | Keep both, but document them: forum ban = can't post, `account_status` = can't log in. |
| 7 | Forum view counts: per-user dedupe or drop the counter? (3.4) | Dedupe by user per hour. |
| 8 | Primary deploy target: Render or Docker/EC2? (4.6) | Whichever is live today. I'd remove the other's config. |
| 9 | Add the optional OTP attempt counter (not rate limiting)? (2.3) | Yes. |

## Suggested first PR (can start immediately after your go-ahead)
**Phase 0 + the first half of Phase 1:** fix `conftest.py`, add the authz matrix test, and protect `/sync*`, `/airflow/*` and `/internal/*`, plus delete `pat-login`. These are small, high-value changes, and they don't touch the database schema or require frontend work apart from removing the PAT login button.

