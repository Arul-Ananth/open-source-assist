/**
 * Client API for GitHub-grounded Skill Assessment and user context synthesis.
 */

export interface MCQOption {
  option_id: string
  option_text: string
}

export interface AssessmentQuestion {
  question_id: string
  question_type: 'mcq' | 'subjective'
  question_text: string
  related_project?: string | null
  options?: MCQOption[] | null
  skill_domain: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface GenerateAssessmentRequest {
  github_username?: string
  num_mcqs?: number
  num_subjective?: number
}

export interface GenerateAssessmentResponse {
  assessment_id: string
  github_username?: string | null
  questions: AssessmentQuestion[]
  generated_at: string
}

export interface QuestionAnswerSubmission {
  question_id: string
  question_type: 'mcq' | 'subjective'
  user_answer: string
}

export interface QuestionEvaluationResult {
  question_id: string
  question_type: 'mcq' | 'subjective'
  score_pct: number
  feedback: string
  correct_answer_summary: string
}

export interface EvaluateAssessmentRequest {
  assessment_id: string
  github_username?: string | null
  answers: QuestionAnswerSubmission[]
  questions?: AssessmentQuestion[] | null
}

export interface EvaluateAssessmentResponse {
  assessment_id: string
  overall_score_pct: number
  assessed_skill_level: 'beginner' | 'intermediate' | 'advanced'
  generated_user_context: string
  evaluations: QuestionEvaluationResult[]
  user_updated: boolean
  duration_ms: number
  model_used: string
}

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`/api/v1/assessment${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const message =
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : `Assessment API error (${response.status})`
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

/**
 * Generate dynamic MCQ and subjective questions grounded in the user's GitHub projects.
 */
export async function generateAssessment(
  params: GenerateAssessmentRequest,
  token?: string,
): Promise<GenerateAssessmentResponse> {
  return request<GenerateAssessmentResponse>('/generate', token, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * Evaluate submitted answers, calculate score, synthesize user context, and persist to user profile.
 */
export async function evaluateAssessment(
  params: EvaluateAssessmentRequest,
  token?: string,
): Promise<EvaluateAssessmentResponse> {
  return request<EvaluateAssessmentResponse>('/evaluate', token, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
