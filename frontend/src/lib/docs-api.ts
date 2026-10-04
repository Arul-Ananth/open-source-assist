/**
 * API client for the Official Documentation Hub and personalized docs recommendations.
 */

export interface DocCategory {
  id: string
  label: string
  description: string
}

export interface DocumentItem {
  id: string
  title: string
  description: string
  url: string
  category: string
  source: string
  tags: string[]
  target_skill_level: 'beginner' | 'intermediate' | 'advanced' | 'all'
  is_recommended: boolean
  recommendation_reason?: string | null
}

export interface DocsCatalogResponse {
  categories: DocCategory[]
  items: DocumentItem[]
  total_count: number
  user_skill_level?: string | null
  user_context?: string | null
  is_personalized: boolean
}

export interface FetchDocsParams {
  category?: string
  query?: string
}

/**
 * Fetch official documentation from FastAPI with personalized skill level ranking.
 */
export async function fetchDocuments(
  params?: FetchDocsParams,
  token?: string,
): Promise<DocsCatalogResponse> {
  const queryParams = new URLSearchParams()
  if (params?.category && params.category !== 'all') {
    queryParams.set('category', params.category)
  }
  if (params?.query && params.query.trim()) {
    queryParams.set('query', params.query.trim())
  }

  const qs = queryParams.toString()
  const url = `/api/v1/docs${qs ? `?${qs}` : ''}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const message =
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : `Failed to fetch documentation (${response.status})`
    throw new Error(message)
  }

  return response.json() as Promise<DocsCatalogResponse>
}
