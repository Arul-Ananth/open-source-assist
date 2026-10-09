# Frontend Lag — Findings & Fix Plan

**Status:** v2, after diagnosis. v1 was the pre-diagnosis draft, and hypotheses are now marked CONFIRMED / REJECTED / UNCHECKED.
**Date:** 2026-10-09
**Method:** static code scan, production build analysis, and timing of the live backend calls (local backend and the deployed Render backend). **No browser profile was captured** (no browser tool was available), so React render cost and paint cost are inferred from code only. See "What I could not verify".

## 1. Bottom line

The lag is **mostly not a rendering problem. It is backend and database latency.** The frontend waits on slow API calls and gives little feedback while it waits, so every screen feels laggy.

The database is **Neon (Postgres) in `us-east-2`** and the app is being used from India. Measured from this machine to that database:

| Measurement | Result |
|---|---|
| New DB connection (TLS and auth) | **2.0–2.7 s** |
| One query round trip (`SELECT 1`) | **about 270–300 ms** |
| First query on a fresh connection | 500–615 ms |

Each DB-backed API request makes several sequential round trips (a session, a user lookup for logged-in requests, the data queries, and a `pool_pre_ping` check on each connection checkout). That adds up to seconds:

| Endpoint (local backend, same remote DB) | Time |
|---|---|
| `/api/v1/docs` (no DB) | **47–76 ms** |
| `/api/v1/roadmaps` | 1.7–2.0 s |
| `/api/v1/projects` | 1.5–2.0 s |
| `/api/v1/contributors` | 1.5–1.9 s |
| `/api/v1/forum/threads` | **2.7–3.6 s** |
| `/api/v1/search` (first / second call) | 2.7 s / 0.8 s |
| `/api/v1/github/user-profile/torvalds` (first / cached) | 1.3 s / 0.13 s |
| `/api/v1/events` | **HTTP 500** (not investigated further, see Finding F9) |

The Vite dev proxy adds nothing: `/api/v1/docs` is 94 ms through the proxy, and `/roadmaps` takes the same 1.5 s through the proxy as directly. The Render backend was fast for non-DB calls (health 319 ms warm, 936 ms first), and the profile endpoint was 0.7–1.6 s.

The frontend then makes this worse. It has no code splitting, it makes duplicate requests, it uses hand-rolled fetch in `useEffect` with no cache, and it blocks the UI on slow calls. Those are secondary, and fixing them alone will **not** make DB-backed screens fast.

## 2. Findings

Confidence: **High** = measured. **Medium** = clear from the code, effect not profiled.

### F1 — Remote database with high latency, and many round trips per request *(CONFIRMED, High, the main cause)*
- DB host is `ep-polished-wind-…-pooler.c-7.us-east-2.aws.neon.tech`. The probe measured about 280 ms per round trip and 2–2.7 s to connect.
- [database.py](file:///c:/Dev/open-source-assist/backend/core/database.py) uses `pool_pre_ping=True` and `pool_recycle=300`. Pre-ping costs **one extra round trip on every pool checkout**. Recycling every 5 minutes, plus Neon closing idle connections, means the app often pays the 2–2.7 s connect cost on the first request after idle.
- [dependencies.py](file:///c:/Dev/open-source-assist/backend/api/dependencies.py) runs a `select(User)` on **every authenticated request** (+1 round trip), and `get_db` opens a session even for guests.
- Services issue queries one after another, for example `ForumService.list_threads` runs a count query, the list query, and `selectinload` of authors. `get_thread_with_posts` and the admin forum view add more. Several routes re-fetch rows after `commit()`.
- `expire_on_commit=False` is already set, so extra `refresh` calls are largely unnecessary.

### F2 — No caching of read-mostly data, in the browser or the backend *(CONFIRMED, High)*
- Only 7 `useQuery/useMutation` usages exist, versus 29 raw `fetch(` calls and 36 `useEffect`s. Most screens load data in `useEffect` + `useState` (`ForumSection`, `DocsSection`, `EventsSection`, `ExploreSection`, `RoadmapPage`, and others).
- Switching dashboard sections **unmounts and remounts** the section (`DashboardPage` uses a ternary), so each visit refetches from scratch and pays the full 1.5–3.5 s again. Roadmaps, docs and events change rarely and should be cached.
- No stale-while-revalidate: users see a spinner or blank on each visit.

### F3 — Duplicate and wasteful requests *(CONFIRMED by code, Medium-High)*
- [ForumSection.tsx L166-L176](file:///c:/Dev/open-source-assist/frontend/src/components/dashboard/ForumSection.tsx#L166-L176): one effect on `[activeCategory, sortBy]` and a second "debounced search" effect on `[searchQuery]`. **Both fire on mount**, so the thread list loads **twice** on first render (four times in dev because of `StrictMode`), each costing about 3 s. The selected thread is then fetched a third time. Every keystroke after the 300 ms debounce reloads the whole list and shows the loading state.
- Thread **view** increments a counter in the DB on every GET (backend), adding a write round trip on thread open.
- The 24+ raw fetch call sites each build their own headers and error handling, with no shared dedupe.
- [github.ts](file:///c:/Dev/open-source-assist/frontend/src/lib/github.ts#L72-L116): `fetchTopContributorsBatch` calls `api.github.com` **directly from the browser, one repo at a time, in sequence**, unauthenticated (60 requests/hour per IP). Dozens of repos means seconds of serial waiting, then a rate-limit error. The backend already has a batch endpoint for this.
- `searchProjects()` tries the backend (2.7 s cold) and then **falls back to GitHub** on failure or empty results, adding more latency on the home page.

### F4 — First-load bundle is a single large chunk *(CONFIRMED, High that it exists, Medium on impact)*
`vite build` output:
- **JS:** one file, `index-*.js`, **673.66 kB (185 kB gzip)**. Vite warns it is over 500 kB.
- **CSS:** `index-*.css` **165.69 kB (42.9 kB gzip)**.
- Zero `React.lazy` or dynamic `import()` in `src`. [App.tsx](file:///c:/Dev/open-source-assist/frontend/src/App.tsx) and [DashboardPage.tsx](file:///c:/Dev/open-source-assist/frontend/src/page/DashboardPage.tsx) import every page and every section eagerly. Admin code, the roadmap, learning, forum, the 700-line static `git-assist-*` data bundles and `lucide-react` icons all ship to a visitor who only sees the landing page.
- This hurts first load and parse time on mid-range devices, but at 185 kB gzip it does **not** by itself explain "everything is laggy" after load.

### F5 — Large components with local state and big render trees *(CONFIRMED by code, Medium, not profiled)*
- [OverviewSection.tsx](file:///c:/Dev/open-source-assist/frontend/src/components/dashboard/OverviewSection.tsx#L345-L380): the 53×7 (371 cells) heatmap is rendered **inline in the parent**, and `hoveredDay` state lives in the same component. **Every `mouseenter`/`mouseleave` over a cell re-renders the whole Overview (all cards, badges, activity) and all 371 cells**, with 371 inline style objects and handlers. That is real hover jank. Fix: memoize the heatmap and keep hover state inside it, or use CSS `title` / one delegated handler.
- `ForumSection` (783 lines), `RedeemSection` (about 841), `RoadmapPage` (about 740), `ContributorsSection` (about 690), `AuthDialog` (about 585) mix fetching, state, and layout. Any state change re-renders the whole section.
- Memoization: 23 `memo/useMemo/useCallback` uses across 92 files, which is low for this size, but I did not profile whether it matters. **UNCHECKED** as a cause.
- 17 index-as-key usages and 110 `.map(` render loops. Lists are not virtualized (contributors page allows up to 500 items). **UNCHECKED.**

### F6 — Visual effects *(PARTIALLY CONFIRMED, Low-Medium)*
- `backdrop-blur-md` on **two always-visible sticky headers** (landing `Nav`, dashboard topbar), plus `.nav-bubble`/`.glass-panel` blur(12–14 px). A full-width blurred sticky header repaints on every scroll frame, which is a known jank source on integrated GPUs and on large screens.
- Nav animates `max-width, height, margin, border-radius, box-shadow` (layout-affecting properties) when scrolled.
- `blur-3xl` decorative blob in the Overview card. 29 `transition-all` usages.
- Several infinite animations (`animate-float-slow`, `animate-pulse-dot` in the Hero) and `animate-pulse` skeletons. The `Reveal` and `AnimatedNumber` components are fine (they use `IntersectionObserver` and `requestAnimationFrame` correctly). Scroll listeners in `Nav` and `BackToTop` are `passive` and only set state when the value changes, which is acceptable.
- These add up on weak GPUs but are **not** the main cause. They need a Performance profile to rank.

### F7 — Whole-app subscription / state issues *(REJECTED as a major cause)*
- All 23 Zustand store usages use selectors (none are `useAuthStore()` without a selector). `QueryClient` is created once with `useState`. The theme-switch trick is fine. Hero typewriter is a 55 ms interval for about 20 ticks and then stops.

### F8 — Dev-mode and local-environment effects *(CONFIRMED, Medium)*
- `React.StrictMode` doubles effects and renders in dev, which doubles the F3 duplicate requests.
- **Localhost IPv6 delay:** the backend listens on `127.0.0.1` only, but `localhost` resolves to `::1` first on this machine (the Vite dev server listens on `::1:5173`). The first request to `http://localhost:8000` took **2.3 s**, and later ones 55 ms. Vite's proxy target is `http://localhost:8000` ([vite.config.ts](file:///c:/Dev/open-source-assist/frontend/vite.config.ts#L16)). Behavior depends on Node's address selection, but pointing the proxy at `127.0.0.1` removes the risk.
- Even trivial endpoints cost about 55 ms locally (PowerShell client overhead is part of this).

### F9 — Related correctness problems seen while diagnosing *(Medium)*
- `GET /api/v1/events` returned **HTTP 500** against the local backend, so the Events screen may be failing, which looks like lag or a hung screen to the user. **Root cause not captured:** the backend was stopped by a server restart before I could read its traceback. Likely candidates are schema drift (the app creates tables with `create_all` and raw `ALTER`s; `events.name` was added in a later migration) or bad data. Needs the server log.
- [use-github-profile.ts](file:///c:/Dev/open-source-assist/frontend/src/lib/use-github-profile.ts#L87-L95): the profile hook has a **hard-coded personal email and GitHub username** (`Arul-Ananth`) as fallbacks, so any user without a matching username is shown that profile's data. It should show an empty state instead.
- Token and auth state are duplicated between Zustand and `localStorage` (separate security work, not lag).

### F10 — Render / hosting latency *(Medium)*
- Render free plan sleeps after inactivity. A cold start is typically 30–60 s. I measured a warm backend (health 319 ms), so I did not observe a cold start. This causes "first visit after idle is very slow" and is not fixable in code beyond showing proper loading UI or upgrading the plan or using a keep-alive.
- Backend in Render (Oregon per `render.yaml`) talking to Neon `us-east-2`: that hop is short, but the user's browser is in India, so every API call pays browser → Render US latency (about 200–300 ms) **before** any DB time.

## 3. Hypothesis scorecard (from v1)

| ID | Hypothesis | Verdict |
|---|---|---|
| H1 | Single bundle, no code splitting | **CONFIRMED** (F4), moderate impact |
| H2 | Giant components re-render too much | **CONFIRMED in one place** (heatmap hover, F5), rest UNCHECKED |
| H3 | Whole-store Zustand subscriptions | **REJECTED** (F7) |
| H4 | Heavy always-running animation and scroll work | **MOSTLY REJECTED**, minor (F6) |
| H5 | Network waterfalls and duplicate requests | **CONFIRMED** (F2, F3) |
| H6 | Slow backend calls | **CONFIRMED, primary cause** (F1) |
| H7 | Large lists without virtualization | UNCHECKED |
| H8 | Dev-mode overhead | **CONFIRMED, minor** (F8) |
| H9 | Unoptimized images and fonts | **Partly:** 3 of 16 `<img>` have `loading="lazy"`, remote GitHub avatars have no sizes. Fonts are many files but the browser only downloads the needed unicode-range subsets. Low impact. |
| H10 | Expensive CSS | **PARTLY CONFIRMED** (F6), minor |

## 4. What I could not verify
- Real in-browser render profile (Chrome Performance and React Profiler). Everything under F5 and F6 is code reading.
- Whether the lag is worse in dev, on the deployed Vercel site, or both. The measurements above are from this machine to the local backend and Render.
- The cause of the Events 500 (server restarted; traceback lost).
- Cold-start behavior on Render.

## 5. Fix plan (ordered by measured impact)

### Tier 1 — Cut backend and database latency *(fixes the main cause)*

| # | Fix | Expected effect | Where |
|---|---|---|---|
| 1.1 | **Co-locate backend and DB.** Move the Neon project to the region closest to the backend and users (for example `ap-south-1` Mumbai or `ap-southeast-1` Singapore), or move the backend to `us-east-2`. Today the DB round trip is about 280 ms from the dev machine. | Largest single win. Every query gets 2–10× cheaper. | Infra |
| 1.2 | **Remove `pool_pre_ping`**, or replace it with a longer `pool_recycle` plus retry on stale-connection errors. Raise `pool_recycle` below Neon's idle timeout and keep a couple of warm connections (`pool_size`, `pool_timeout` as settings). | −1 round trip per request. Fewer 2 s reconnects. | [database.py](file:///c:/Dev/open-source-assist/backend/core/database.py) |
| 1.3 | **Use the Neon pooler correctly.** The URL already uses the `-pooler` host. Make sure asyncpg uses `statement_cache_size=0` (PgBouncer transaction mode) so prepared statements do not break or add re-prepare round trips. | Stability, fewer retries. | [config.py](file:///c:/Dev/open-source-assist/backend/core/config.py) / engine args |
| 1.4 | **Avoid DB work for guests and on every request.** Create the session lazily, and cache `(user_id → active status, role)` for 30–60 s in process memory so an authenticated GET does not always pay the user lookup. | −1 round trip on most authenticated requests. | [dependencies.py](file:///c:/Dev/open-source-assist/backend/api/dependencies.py) |
| 1.5 | **Collapse sequential queries.** Forum list: one query using a window `count() OVER ()` and a joined author. Admin forum view: use eager-loaded relations. Drop the `refresh` / re-fetch after commit where `expire_on_commit=False` already holds the data. Run independent queries with `asyncio.gather` only on separate sessions (a single async session cannot run them concurrently). | 2–4 round trips saved on the slowest endpoints (forum 3 s → about 1 s at current latency). | forum, roadmap, event, project services |
| 1.6 | **HTTP caching for read-mostly endpoints:** `Cache-Control: public, max-age=60, stale-while-revalidate=300` (or an in-process TTL cache) for `/roadmaps`, `/docs`, `/events`, `/projects`, `/contributors`. | Repeat visits drop to about 0 DB round trips. | routes |
| 1.7 | **Stop writing on GET:** do not increment `views_count` synchronously on thread open (fire-and-forget, or batch). | −1 write round trip on thread open. | [forum.py](file:///c:/Dev/open-source-assist/backend/api/routes/forum.py#L113) |
| 1.8 | **Warm the connection at startup** and keep the Render instance awake (a scheduled ping or paid plan) so users do not pay the 2 s connect or a 30–60 s cold start. | Removes the "first request is very slow" case. | `lifespan`, hosting |
| 1.9 | Investigate and fix the **Events 500** from the server log, and confirm schema state (`alembic upgrade head`). | Events screen works. | backend |

### Tier 2 — Make the frontend cache and de-duplicate *(fixes the repeat-visit and "everything refetches" feel)*

| # | Fix | Where |
|---|---|---|
| 2.1 | **Move every section's data loading to React Query** (`useQuery` with query keys, `staleTime` 1–10 min, `placeholderData: keepPreviousData` for search and filters). Replace the `useEffect + fetch + useState` patterns. Revisiting a section then shows cached data immediately and refreshes in the background. | forum, docs, events, explore, roadmap, contributors, learning, admin sections |
| 2.2 | **Keep visited dashboard sections mounted or cached** (query cache is enough, so unmount is fine once 2.1 is done). | `DashboardPage` |
| 2.3 | **Fix the ForumSection double-load:** one query keyed by `{category, sort, debouncedSearch}`, with the debounce done in a `useDebouncedValue` hook, so mount fires once and typing does not show a full loading state. Select the first thread from the cached list. | [ForumSection.tsx](file:///c:/Dev/open-source-assist/frontend/src/components/dashboard/ForumSection.tsx#L166-L176) |
| 2.4 | **Replace the browser-side GitHub calls** (`fetchTopContributorsBatch`, GitHub search fallback) with the backend batch endpoint, in one request. Delete the sequential loop and the localStorage cache. | [github.ts](file:///c:/Dev/open-source-assist/frontend/src/lib/github.ts) |
| 2.5 | **One `apiClient`** (base URL, auth header, error normalization, `AbortSignal` support), replacing the 29 raw `fetch` sites. | `frontend/src/lib/*-api.ts` |
| 2.6 | **Prefetch on intent:** `queryClient.prefetchQuery` when hovering sidebar items, and prefetch Overview and roadmap data right after login. | `DashboardPage`, login flow |
| 2.7 | **Remove the hard-coded personal username and email fallback** and show an empty or "connect GitHub" state. | [use-github-profile.ts](file:///c:/Dev/open-source-assist/frontend/src/lib/use-github-profile.ts#L87-L95) |

### Tier 3 — Perceived performance *(makes slow calls feel fast)*

| # | Fix |
|---|---|
| 3.1 | Skeleton loaders that match the final layout for every section (some exist: Badges, Docs, Recent Activity, AILearning). Never show a blank area or a bare spinner. |
| 3.2 | Optimistic updates for forum replies, upvotes, and roadmap step completion (React Query `onMutate`). |
| 3.3 | Show stale data while refreshing (a small "refreshing" indicator) instead of the full loading state. |
| 3.4 | For Render cold starts: a friendly "Waking up the server…" message after 3 s, with a retry, instead of an unexplained hang. |

### Tier 4 — Bundle and render cost

| # | Fix | Expected effect |
|---|---|---|
| 4.1 | **Code-split:** `React.lazy` + `Suspense` for `HomePage`, `DashboardPage`, `AdminPage`, and each dashboard section (`RoadmapPage`, `ForumSection`, `RedeemSection`, `ContributorsSection`, `LearningSection`, `DocsSection`). Lazy-load `data/git-assist-*.ts`. Add `manualChunks` for `react`, `@tanstack/react-query`, `lucide-react`. Target: landing page main chunk well under 200 kB raw. | Faster first load and parse. |
| 4.2 | **Heatmap:** extract a `memo`'d `<ContributionHeatmap>` that owns `hoveredDay` state (or use CSS `title` only and drop the state). Precompute cell colors. | Removes hover jank on Overview. |
| 4.3 | **Split the 600–840 line components** by responsibility (data hook, list, detail, form), and memoize list items (`ForumThreadRow`, repo cards, contributor cards). Use stable keys instead of index. | Smaller re-render scope. |
| 4.4 | **Virtualize or paginate** long lists (contributors up to 500) with `@tanstack/react-virtual` or server-side paging. | Smooth scrolling on big lists. |
| 4.5 | **CSS cost:** drop `backdrop-blur` on the sticky headers (use a solid `bg-background/95`), animate only `transform`/`opacity` in `Nav` (not `max-width/height/margin`), remove `blur-3xl` blob, replace most `transition-all` with specific properties, add `content-visibility: auto` to off-screen sections, and add `prefers-reduced-motion` handling for the infinite animations. | Smoother scrolling on weak GPUs. |
| 4.6 | **Images:** `loading="lazy"` and `decoding="async"` plus explicit `width`/`height` on avatars and logos. Compress `cat-logo.png`, `chatbot-logo.png` (check sizes). | Less layout shift and transfer. |
| 4.7 | **Dev experience:** point the Vite proxy at `http://127.0.0.1:8000` and bind uvicorn consistently (also `--host 0.0.0.0`/`::`). | Removes the 2 s first-request stall in dev. |

### Tier 5 — Guardrails
- Add a bundle-size budget check to CI (fail over, for example, 250 kB gzip main chunk) and add `vite-bundle-visualizer` to a dev script.
- Add basic API timing logs (request ID plus duration plus DB time) to the backend so slow endpoints are visible without guessing.
- Capture a Lighthouse and Performance profile before and after Tier 4 to confirm the render and bundle changes.

## 6. Suggested order of work and expected result

1. **1.1, 1.2, 1.3, 1.9** (infra and engine settings, 0.5–1 day, plus the Neon region decision): the biggest improvement for the least code.
2. **1.4–1.7, 2.3, 2.7** (query reduction, forum double-load, hard-coded user fallback): about 1 day.
3. **2.1, 2.2, 2.5, 2.6, 3.x** (React Query migration, shared client, skeletons): 2–3 days. This is the largest frontend change.
4. **4.1, 4.2, 4.5, 4.7** (code splitting, heatmap, CSS cost, proxy): about 1 day.
5. The rest of Tier 4 and Tier 5 afterwards.

**Rough expectation:** with the DB co-located (about 20–40 ms per round trip instead of about 280 ms) and Tier 1 query reduction, DB-backed endpoints should drop from 1.5–3.5 s to well under 300 ms. With Tier 2 caching, repeat visits to a section should be near instant. These numbers are estimates until re-measured.

## 7. Open questions for you
1. **Where is the Neon project hosted vs. where do you and your users run?** Moving it to a region near the backend is the highest-impact change. Can I change the Neon project region (this means creating a new project and migrating data), or must it stay in `us-east-2`?
2. Is the slow experience on `npm run dev`, on the Vercel site, or both? (Both are affected by the DB latency. The Vercel site also pays Render and cold-start latency.)
3. Are you on the Render free plan (cold starts), or a paid instance?
4. Can I look at the backend console or log when the Events page fails? I need the traceback for the 500.
5. Do you want me to start with Tier 1 (backend and DB) or with the frontend caching work in Tier 2?
