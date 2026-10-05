import { useState, useEffect } from 'react'
import {
  Sparkles,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  Layers,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import {
  generateLearningMaterials,
  type LearningMaterialResponse,
  type SkillLevel,
} from '@/lib/learning-api'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

const QUICK_TOPICS = [
  'Git Merge vs Rebase Workflow',
  'Resolving Git Merge Conflicts',
  'Forking & Pull Request Lifecycle',
  'Interactive Rebase & Commit Squashing',
  'Git Bisect & History Debugging',
  'GitHub Actions for CI/CD Workflows',
]

const FALLBACK_MODULES: LearningMaterialResponse = {
  topic: 'Git Merge vs Rebase Workflow',
  skill_level: 'intermediate',
  summary:
    'Understanding the trade-offs between merging and rebasing is fundamental for clean Git commit histories in open source collaboration.',
  duration_ms: 120,
  model_used: 'fallback-deterministic-engine',
  modules: [
    {
      module_number: 1,
      title: 'The Mechanics of 3-Way Merge',
      description:
        'A git merge ties together the histories of both branches by creating a new merge commit with two parents. It is non-destructive and preserves complete historical context.',
      key_takeaways: [
        'Creates an explicit merge commit documenting when branches converged',
        'Preserves original commit timestamps and commit hashes untouched',
        'Ideal for pull request integration onto main/master',
      ],
      cited_material_urls: ['https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging'],
    },
    {
      module_number: 2,
      title: 'Rebase: Rewriting Branch Base Linearly',
      description:
        'A git rebase replays your branch commits on top of the tip of another branch, resulting in a single linear commit history without merge bubbles.',
      key_takeaways: [
        'Produces a clean linear graph easy to inspect with git log and bisect',
        'Rewrites commit hashes; never rebase commits already pushed to public shared branches',
        'Recommended before opening a PR to keep your feature branch up to date with main',
      ],
      cited_material_urls: ['https://git-scm.com/docs/git-rebase'],
    },
    {
      module_number: 3,
      title: 'Interactive Rebase & Squashing Commits',
      description:
        'Use git rebase -i HEAD~N to clean up messy local commits (fixups, typos) into atomic, well-described commits before submitting for code review.',
      key_takeaways: [
        'Allows squash, reword, drop, and edit operations on local commits',
        'Ensures pull requests present atomic commits that are easy for maintainers to review',
      ],
      cited_material_urls: ['https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges'],
    },
  ],
  cited_materials: [
    {
      title: 'Git SCM - Basic Branching and Merging',
      url: 'https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging',
      material_type: 'official_docs',
      difficulty_level: 'beginner',
      snippet: 'Branching means you diverge from the mainline of development and continue to do work without messing with that mainline.',
      relevance_rationale: 'Official reference documentation explaining the mechanics of 3-way merges.',
      topics: ['git-branch', 'git-merge', 'vcs'],
    },
    {
      title: 'Git SCM - Git Rebase Documentation',
      url: 'https://git-scm.com/docs/git-rebase',
      material_type: 'official_docs',
      difficulty_level: 'intermediate',
      snippet: 'git-rebase - Reapply commits on top of another base tip.',
      relevance_rationale: 'Comprehensive manual page for rebase syntax, options, and safety considerations.',
      topics: ['git-rebase', 'history-rewriting'],
    },
    {
      title: 'GitHub Docs - About Pull Request Merges',
      url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges',
      material_type: 'tutorial',
      difficulty_level: 'intermediate',
      snippet: 'Learn about the different merge methods available on GitHub: Merge commit, Squash and merge, and Rebase and merge.',
      relevance_rationale: 'Explains how GitHub handles merge options in production open source repositories.',
      topics: ['pull-requests', 'code-review', 'collaboration'],
    },
  ],
}

export function AILearningModulesView() {
  const token = useAuthStore((state) => state.token)
  const [topicInput, setTopicInput] = useState('Git Merge vs Rebase Workflow')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LearningMaterialResponse | null>(null)

  const fetchModules = async (topic: string, level: SkillLevel) => {
    setLoading(true)
    setError(null)
    try {
      const response = await generateLearningMaterials(
        {
          topic,
          skill_level: level,
          limit: 3,
        },
        token || undefined,
      )
      setData(response)
    } catch (err) {
      console.warn('Backend learning generator failed, using high-fidelity fallback:', err)
      setError(err instanceof Error ? err.message : 'Unable to connect to AI learning agent')
      // If the topic matches or is custom, set the fallback customized to topic
      setData({
        ...FALLBACK_MODULES,
        topic,
        skill_level: level,
      })
    } finally {
      setLoading(false)
    }
  }

  // Load default topic on initial render
  useEffect(() => {
    void fetchModules('Git Merge vs Rebase Workflow', 'intermediate')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!topicInput.trim()) return
    void fetchModules(topicInput.trim(), skillLevel)
  }

  const handleSelectQuickTopic = (topic: string) => {
    setTopicInput(topic)
    void fetchModules(topic, skillLevel)
  }

  return (
    <div className="space-y-6">
      {/* Control Card */}
      <div className="rounded-md border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold text-foreground">
              AI Learning Material Generator
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
            LangGraph &amp; Gemini 1.5
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Git Cherry-Pick, Resolving Submodules, GitHub Releases..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Skill Level Buttons */}
            <div className="flex rounded-md border border-border bg-background p-1">
              {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setSkillLevel(level)
                    if (topicInput.trim()) {
                      void fetchModules(topicInput.trim(), level)
                    }
                  }}
                  className={cn(
                    'rounded-sm px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                    skillLevel === level
                      ? 'bg-accent text-on-accent font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {level}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !topicInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:brightness-110 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Topic Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Quick topics:</span>
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleSelectQuickTopic(topic)}
                className={cn(
                  'rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-xs transition-colors hover:border-accent hover:text-accent',
                  topicInput === topic ? 'border-accent text-accent' : 'text-muted-foreground',
                )}
              >
                {topic}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Error / Fallback Notice */}
      {error && (
        <div className="flex items-center justify-between rounded-md border border-amber-800/40 bg-amber-950/20 p-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>AI Service notice: {error}. Showing structured curated fallback modules.</span>
          </div>
          <button
            onClick={() => void fetchModules(topicInput, skillLevel)}
            className="flex items-center gap-1 font-mono hover:underline"
          >
            <RotateCcw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-md border border-border bg-surface" />
          <div className="h-44 animate-pulse rounded-md border border-border bg-surface" />
          <div className="h-44 animate-pulse rounded-md border border-border bg-surface" />
        </div>
      )}

      {/* Content View */}
      {data && (
        <div className="space-y-6">
          {/* Overview Banner */}
          <div className="rounded-md border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-accent">
                  CURRICULUM SPECIFICATION
                </span>
                <h1 className="text-xl font-bold text-foreground">{data.topic}</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-xs font-semibold capitalize text-foreground">
                  Level: {data.skill_level}
                </span>
                <span className="rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  Engine: {data.model_used}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {data.summary}
            </p>
          </div>

          {/* Structured Modules */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Sequential Learning Modules ({data.modules.length})
              </h2>
            </div>

            <div className="grid gap-4">
              {data.modules.map((mod) => (
                <div
                  key={mod.module_number}
                  className="rounded-md border border-border bg-surface p-5"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-accent font-mono text-xs font-bold text-on-accent">
                      {mod.module_number}
                    </span>
                    <h3 className="text-base font-semibold text-foreground">{mod.title}</h3>
                  </div>

                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    {mod.description}
                  </p>

                  {/* Key Takeaways */}
                  {mod.key_takeaways && mod.key_takeaways.length > 0 && (
                    <div className="rounded-sm border border-border bg-background p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Core Takeaways
                      </div>
                      <ul className="space-y-1.5">
                        {mod.key_takeaways.map((takeaway, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" />
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cited Resource Badges */}
                  {mod.cited_material_urls && mod.cited_material_urls.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Referenced sources:</span>
                      {mod.cited_material_urls.map((url, uIdx) => (
                        <a
                          key={uIdx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-xs text-accent hover:border-accent hover:underline"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span className="max-w-[200px] truncate">{url}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cited Official Resources */}
          {data.cited_materials && data.cited_materials.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Cited Authoritative Resources ({data.cited_materials.length})
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {data.cited_materials.map((mat, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-md border border-border bg-surface p-4"
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-xs uppercase text-accent">
                          {mat.material_type.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground capitalize">
                          {mat.difficulty_level}
                        </span>
                      </div>
                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-accent"
                      >
                        <span className="text-sm leading-snug group-hover:underline">{mat.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {mat.relevance_rationale}
                      </p>
                      {mat.snippet && (
                        <blockquote className="mt-2 border-l-2 border-border pl-2.5 font-mono text-xs italic text-muted-foreground/80">
                          &ldquo;{mat.snippet}&rdquo;
                        </blockquote>
                      )}
                    </div>

                    {mat.topics && mat.topics.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-2">
                        {mat.topics.map((t) => (
                          <span
                            key={t}
                            className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
