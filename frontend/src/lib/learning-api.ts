/**
 * Client API for AI Learning Materials Generator & Citation Agent.
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export type MaterialType =
  | 'official_docs'
  | 'tutorial'
  | 'article'
  | 'github_repo'
  | 'interactive_course'

export interface CitedMaterial {
  title: string
  url: string
  material_type: MaterialType
  difficulty_level: SkillLevel
  snippet: string
  relevance_rationale: string
  topics: string[]
}

export interface LearningModule {
  module_number: number
  title: string
  description: string
  key_takeaways: string[]
  cited_material_urls: string[]
}

export interface LearningMaterialRequest {
  topic: string
  skill_level?: SkillLevel
  user_context?: string
  preferred_types?: MaterialType[]
  limit?: number
}

export interface LearningMaterialResponse {
  topic: string
  skill_level: SkillLevel
  summary: string
  modules: LearningModule[]
  cited_materials: CitedMaterial[]
  duration_ms: number
  model_used: string
}

export async function generateLearningMaterials(
  payload: LearningMaterialRequest,
  token?: string,
): Promise<LearningMaterialResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch('/api/v1/learning/materials', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const detail = errorBody?.detail || `Failed to generate learning materials (HTTP ${response.status})`
    throw new Error(detail)
  }

  return response.json()
}
