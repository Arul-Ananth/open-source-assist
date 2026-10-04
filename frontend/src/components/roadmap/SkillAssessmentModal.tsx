import { useState, useEffect } from 'react'
import {
  AlertCircle,
  Award,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'
import {
  generateAssessment,
  evaluateAssessment,
  type AssessmentQuestion,
  type EvaluateAssessmentResponse,
  type QuestionAnswerSubmission,
} from '@/lib/assessment-api'

interface SkillAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  username?: string
}

export function SkillAssessmentModal({ isOpen, onClose, username }: SkillAssessmentModalProps) {
  const token = useAuthStore((s) => s.token)
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<EvaluateAssessmentResponse | null>(null)

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setAnswers({})
    try {
      const data = await generateAssessment(
        {
          github_username: username || undefined,
          num_mcqs: 3,
          num_subjective: 2,
        },
        token || undefined,
      )
      setAssessmentId(data.assessment_id)
      setQuestions(data.questions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate assessment questions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && !assessmentId && !result) {
      void handleStart()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }))
  }

  const answeredCount = questions.filter((q) => (answers[q.question_id] || '').trim().length > 0).length
  const allAnswered = questions.length > 0 && answeredCount === questions.length

  const handleSubmit = async () => {
    if (!assessmentId) return
    setEvaluating(true)
    setError(null)
    try {
      const submissionList: QuestionAnswerSubmission[] = questions.map((q) => ({
        question_id: q.question_id,
        question_type: q.question_type,
        user_answer: answers[q.question_id] || '',
      }))

      const evaluation = await evaluateAssessment(
        {
          assessment_id: assessmentId,
          github_username: username || undefined,
          answers: submissionList,
          questions,
        },
        token || undefined,
      )
      setResult(evaluation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation submission failed')
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-lg border border-border bg-surface p-6 shadow-2xl text-foreground max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md border border-accent bg-accent/10 text-accent-text">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold sm:text-lg flex items-center gap-2">
                GitHub Skill Assessment
                {username && <Badge variant="accent">@{username}</Badge>}
              </h2>
              <p className="text-xs text-muted-foreground">
                Grounded in public repositories and technical architecture
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 className="size-8 animate-spin text-accent-text" />
              <p className="text-sm font-semibold">Generating Project-Grounded Questions…</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Analyzing repositories, tech stacks, and architectural patterns to formulate tailored questions.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Assessment Error</p>
                <p className="mt-0.5">{error}</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => void handleStart()}>
                  <RotateCcw className="size-3.5 mr-1" /> Retry
                </Button>
              </div>
            </div>
          )}

          {/* Results Screen */}
          {result && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-lg border border-accent bg-accent/5 p-5 text-center sm:p-6">
                <Award className="mx-auto size-12 text-accent-text mb-2" />
                <h3 className="text-xl font-bold">Assessment Complete</h3>
                <div className="mt-2 flex items-center justify-center gap-3">
                  <span className="font-mono text-3xl font-extrabold text-foreground">
                    {Math.round(result.overall_score_pct)}%
                  </span>
                  <Badge variant="accent" className="capitalize text-xs font-semibold px-2.5 py-1">
                    Level: {result.assessed_skill_level}
                  </Badge>
                </div>
                <p className="mt-3 text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto italic">
                  "{result.generated_user_context}"
                </p>
                {result.user_updated && (
                  <p className="mt-2 text-[11px] font-mono text-success flex items-center justify-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Persisted to user profile context
                  </p>
                )}
              </div>

              {/* Per-question breakdown */}
              <div className="space-y-4">
                <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Question Breakdown & Feedback
                </h4>
                {result.evaluations.map((evalItem, idx) => {
                  const isPassing = evalItem.score_pct >= 70
                  return (
                    <div
                      key={evalItem.question_id}
                      className="rounded-md border border-border bg-background p-4 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-accent-text">
                          Question {idx + 1} ({evalItem.question_type.toUpperCase()})
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isPassing ? (
                            <CheckCircle2 className="size-4 text-success" />
                          ) : (
                            <XCircle className="size-4 text-destructive" />
                          )}
                          <span className="font-mono font-semibold">{Math.round(evalItem.score_pct)}%</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Feedback:</strong> {evalItem.feedback}
                      </p>
                      {evalItem.correct_answer_summary && (
                        <p className="text-muted-foreground">
                          <strong className="text-foreground">Takeaway:</strong> {evalItem.correct_answer_summary}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Question Answering Screen */}
          {!loading && !result && questions.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2">
                <span>
                  Answered: <strong className="text-foreground font-mono">{answeredCount}</strong> of {questions.length}
                </span>
                <span className="font-mono uppercase text-[10px] tracking-wider text-accent-text">
                  AI Grounded Evaluation
                </span>
              </div>

              {questions.map((q, idx) => (
                <div
                  key={q.question_id}
                  className="rounded-md border border-border bg-background p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-accent-text uppercase">
                      Question {idx + 1} · {q.question_type === 'mcq' ? 'Multiple Choice' : 'Subjective'}
                    </span>
                    <div className="flex items-center gap-2">
                      {q.related_project && (
                        <span className="font-mono text-[10px] rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                          Repo: {q.related_project}
                        </span>
                      )}
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {q.difficulty}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm font-medium leading-relaxed">{q.question_text}</p>

                  {/* Multiple Choice Options */}
                  {q.question_type === 'mcq' && q.options && (
                    <div className="grid gap-2 pt-1">
                      {q.options.map((opt) => {
                        const isSelected = answers[q.question_id] === opt.option_id
                        return (
                          <button
                            key={opt.option_id}
                            type="button"
                            onClick={() => handleSelectOption(q.question_id, opt.option_id)}
                            className={`flex items-start gap-3 rounded-md border p-3 text-left text-xs transition-colors ${
                              isSelected
                                ? 'border-accent bg-accent text-on-accent font-semibold shadow-sm'
                                : 'border-border bg-surface text-foreground hover:border-accent/60 hover:bg-background'
                            }`}
                          >
                            <span
                              className={`flex size-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold border ${
                                isSelected
                                  ? 'border-on-accent bg-on-accent text-accent'
                                  : 'border-border bg-background text-muted-foreground'
                              }`}
                            >
                              {opt.option_id}
                            </span>
                            <span className="leading-5">{opt.option_text}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Subjective Input */}
                  {q.question_type === 'subjective' && (
                    <div className="pt-1">
                      <textarea
                        value={answers[q.question_id] || ''}
                        onChange={(e) => handleTextChange(q.question_id, e.target.value)}
                        placeholder="Explain your approach, design principles, and technical implementation..."
                        rows={4}
                        className="w-full rounded-md border border-border bg-surface p-3 text-xs placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border pt-4 mt-4 flex items-center justify-between">
          {result ? (
            <>
              <Button variant="secondary" onClick={() => void handleStart()}>
                <RotateCcw className="size-4 mr-1.5" /> Retake Assessment
              </Button>
              <Button onClick={onClose}>Done</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={!allAnswered || evaluating || loading}
                onClick={() => void handleSubmit()}
                className="gap-1.5"
              >
                {evaluating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Evaluating with AI…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Submit Assessment
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
