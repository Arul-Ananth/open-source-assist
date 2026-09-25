/**
 * Typed client for the OpenSource Assist semantic search backend.
 *
 * Contract mirrors `backend/schemas/search.py` (RepoSearchRequest / RepoSearchResponse).
 * Override the target server with VITE_API_BASE_URL (no trailing slash handling needed
 * beyond what we do here); defaults to the local uvicorn dev server.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '')

export interface RepoSearchFilters {
  language?: string
  min_stars?: number
  license?: string
  topic?: string
}

export interface RepoSearchRequest {
  query: string
  popularity_weight?: number
  filters?: RepoSearchFilters
  limit?: number
  offset?: number
}

export interface RepoScoreBreakdown {
  semantic_score: number
  popularity_score: number
  final_score: number
  strategy: string
}

export interface SearchRepoItem {
  repo_id: number
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  open_issues: number
  license: string | null
  topics: string[]
  pushed_at: string | null
  scores: RepoScoreBreakdown
}

export interface RepoSearchResponse {
  query: string
  total: number
  limit: number
  offset: number
  items: SearchRepoItem[]
  strategy: string
  duration_ms: number
}

export class BackendUnavailableError extends Error {
  constructor(message = 'Search service is unreachable. Make sure the backend is running, then retry.') {
    super(message)
    this.name = 'BackendUnavailableError'
  }
}

/** Centralized Query Key Factory for the semantic search endpoint. */
export const searchKeys = {
  all: ['semantic-search'] as const,
  query: (query: string) => ['semantic-search', query] as const,
}

/**
 * Run a natural-language semantic search against the backend.
 * Aborts propagate untouched so TanStack Query can cancel in-flight requests.
 */
export async function searchRepositories(
  request: RepoSearchRequest & { signal?: AbortSignal },
): Promise<RepoSearchResponse> {
  const { signal, ...body } = request

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new BackendUnavailableError()
  }

  if (!res.ok) {
    throw new Error(`Search API error (${res.status}). Please try again.`)
  }

  return (await res.json()) as RepoSearchResponse
}
