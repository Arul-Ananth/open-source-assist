export interface PersonalizedStepPayload {
  day_number: number
  title: string
  description?: string
  expected_duration_hours?: number
  step_order?: number
}

export interface PersonalizedStepResponse {
  id: number
  day_number: number
  title: string
  description?: string | null
  expected_duration_hours?: number | null
  step_order: number
  completed: boolean
}

export interface PersonalizedRoadmapResponse {
  roadmap_id: number
  name: string
  description?: string | null
  steps: PersonalizedStepResponse[]
}

export interface ProgressRecordResponse {
  id: number
  user_id: string
  roadmap_id: number
  step_id: number
  completed: boolean
  completed_at?: string | null
}

/**
 * Ensures that a personalized roadmap and its steps exist in the PostgreSQL database,
 * and fetches the current user's recorded step completions.
 */
export async function syncPersonalizedRoadmap(params: {
  userId?: string | null
  language: string
  skillLevel: string
  steps: PersonalizedStepPayload[]
}): Promise<PersonalizedRoadmapResponse | null> {
  try {
    const res = await fetch('/api/v1/roadmaps/personalized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: params.userId || undefined,
        language: params.language,
        skill_level: params.skillLevel,
        steps: params.steps,
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as PersonalizedRoadmapResponse
  } catch {
    return null
  }
}

/**
 * Persists a completed or uncompleted step status directly into PostgreSQL user_roadmap_progress.
 */
export async function recordStepProgress(params: {
  userId: string
  roadmapId: number
  stepId: number
  completed?: boolean
  token?: string | null
}): Promise<ProgressRecordResponse | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (params.token) {
      headers.Authorization = `Bearer ${params.token}`
    }
    const res = await fetch('/api/v1/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: params.userId,
        roadmap_id: params.roadmapId,
        step_id: params.stepId,
        completed: params.completed ?? true,
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as ProgressRecordResponse
  } catch {
    return null
  }
}
