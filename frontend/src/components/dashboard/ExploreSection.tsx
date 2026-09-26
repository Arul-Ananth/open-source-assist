import * as React from 'react'
import {
  Compass,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Button, Card, CardContent, CardFooter, CardHeader, EmptyState, Skeleton } from '@/components/ui'
import { RepoCard, ContributorStackSkeleton, type FormattedRepo } from '@/components/shared'
import { searchBackendProjects, RateLimitError } from '@/lib/github'

export function ExploreSection() {
  const [query, setQuery] = React.useState('open source developer tools')
  const [searchInput, setSearchInput] = React.useState('open source developer tools')
  const [language, setLanguage] = React.useState('')
  const [languageInput, setLanguageInput] = React.useState('')
  const [popularityWeight, setPopularityWeight] = React.useState<number>(0.3)
  const [source, setSource] = React.useState<'backend' | 'github'>('backend')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [repos, setRepos] = React.useState<FormattedRepo[]>([])
  const [rateLimited, setRateLimited] = React.useState(false)

  const fetchRepositories = React.useCallback(
    async (q: string, lang: string, weight: number, src: 'backend' | 'github') => {
      setLoading(true)
      setError(null)
      setRateLimited(false)

      try {
        if (src === 'backend') {
          // Backend vector semantic search with request parameters
          const trimmedLang = lang.trim()
          const data = await searchBackendProjects({
            query: q.trim(),
            popularityWeight: weight,
            filters: trimmedLang ? { language: trimmedLang } : undefined,
            limit: 12,
          })

          const formatted: FormattedRepo[] = (data.items || []).map((r) => ({
            id: r.id,
            fullName: r.full_name,
            owner: r.owner.login,
            ownerAvatarUrl: r.owner.avatar_url,
            url: r.html_url,
            description: r.description,
            stars: r.stargazers_count,
            forks: r.forks_count,
            openIssues: r.open_issues_count,
            language: r.language,
            topics: r.topics || [],
            pushedAt: r.pushed_at,
          }))
          setRepos(formatted)
          setLoading(false)
          return
        }

        // Live GitHub API Search fallback
        const trimmedLang = lang.trim()
        const langQuery = trimmedLang ? ` language:${trimmedLang}` : ''
        const finalQuery = `${q.trim()}${langQuery} stars:>200`.trim()
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(finalQuery)}&sort=stars&order=desc&per_page=12`
        const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })

        if (res.status === 403 || res.status === 429) {
          setRateLimited(true)
          throw new RateLimitError('GitHub API rate limit reached (60 requests/hr per IP).')
        }

        if (!res.ok) {
          throw new Error(`GitHub search failed (${res.status})`)
        }

        const data = await res.json()
        const items: FormattedRepo[] = (data.items || []).map((r: any) => ({
          id: r.id,
          fullName: r.full_name,
          owner: r.owner.login,
          ownerAvatarUrl: r.owner.avatar_url,
          url: r.html_url,
          description: r.description,
          stars: r.stargazers_count,
          forks: r.forks_count,
          openIssues: r.open_issues_count,
          language: r.language,
          topics: r.topics || [],
          pushedAt: r.pushed_at,
        }))
        setRepos(items)
      } catch (err: unknown) {
        if (err instanceof RateLimitError) {
          setRateLimited(true)
        }
        setError(err instanceof Error ? err.message : 'Failed to load repositories')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  React.useEffect(() => {
    fetchRepositories(query, language, popularityWeight, source)
  }, [query, language, popularityWeight, source, fetchRepositories])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(searchInput.trim())
    setLanguage(languageInput.trim())
  }

  const handleClearLanguage = () => {
    setLanguageInput('')
    setLanguage('')
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Compass className="size-6 text-accent-text" />
            Explore Repositories
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search active open-source repositories indexed via Qdrant semantic search or GitHub live.
          </p>
        </div>

        {/* Source selector */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSource((s) => (s === 'backend' ? 'github' : 'backend'))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:border-accent"
          >
            <Sparkles className="size-3.5 text-accent-text" />
            Source: <span className="font-semibold text-accent-text">{source === 'backend' ? 'Semantic (Qdrant)' : 'GitHub Live'}</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl border border-border bg-surface/40 p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          {/* Query input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by topic, framework, or keywords (e.g. 'agent framework', 'async runtime')..."
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Dynamic Language input */}
          <div className="relative sm:w-64">
            <input
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              placeholder="Language (e.g. Rust, Zig, Go)"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent pr-8"
            />
            {languageInput && (
              <button
                type="button"
                onClick={handleClearLanguage}
                aria-label="Clear language filter"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {/* Backend Request Tuning: Popularity Weight */}
        {source === 'backend' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-3.5 text-accent-text shrink-0" />
              <span className="font-mono font-medium text-foreground">Popularity Weight:</span>
              <span className="font-mono text-accent-text font-bold">{(popularityWeight).toFixed(2)}</span>
              <span className="text-[11px] text-muted-foreground hidden md:inline">
                ({popularityWeight <= 0.2 ? 'Relevance Focused' : popularityWeight >= 0.7 ? 'Popularity Focused' : 'Balanced'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Semantic (0.0)</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={popularityWeight}
                onChange={(e) => setPopularityWeight(parseFloat(e.target.value))}
                className="h-1.5 w-32 cursor-pointer accent-accent"
              />
              <span className="text-[10px] text-muted-foreground">Stars (1.0)</span>

              {/* Preset buttons */}
              <div className="hidden lg:flex items-center gap-1.5 ml-2">
                {[
                  { label: 'Relevance', val: 0.1 },
                  { label: 'Balanced', val: 0.3 },
                  { label: 'Popular', val: 0.7 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPopularityWeight(p.val)}
                    className={`rounded px-2 py-0.5 text-[11px] font-mono transition-colors ${
                      Math.abs(popularityWeight - p.val) < 0.05
                        ? 'bg-accent/20 text-accent-text font-semibold border border-accent/40'
                        : 'border border-border/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rate Limit Warning */}
      {rateLimited && (
        <div className="animate-fade-in flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
          <TriangleAlert className="size-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-200">GitHub API Rate Limit Reached</p>
            <p className="text-amber-300/90 mt-0.5">
              Switching to backend semantic vector search to ensure continuous exploration.
            </p>
          </div>
        </div>
      )}

      {/* Active Filter Summary */}
      {(language.trim() || popularityWeight !== 0.3) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Active parameters:</span>
          {language.trim() && (
            <span className="inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-0.5 font-mono text-[11px] text-foreground">
              language: {language.trim()}
              <button
                type="button"
                onClick={handleClearLanguage}
                aria-label="Remove language filter"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {source === 'backend' && (
            <span className="inline-flex items-center rounded bg-surface border border-border px-2 py-0.5 font-mono text-[11px] text-foreground">
              popularity_weight: {popularityWeight.toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* Grid of Results */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </CardHeader>
              <CardContent className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </CardContent>
              <CardFooter className="border-t border-border pt-4">
                <ContributorStackSkeleton />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error && repos.length === 0 ? (
        <EmptyState
          icon={TriangleAlert}
          iconClassName="text-accent-text"
          title="Search could not be completed"
          description={error}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchRepositories(query, language, popularityWeight, source)}
            >
              <RotateCcw className="size-3.5" />
              Retry Search
            </Button>
          }
        />
      ) : repos.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No repositories found"
          description={`No repositories matched query "${query}"${language.trim() ? ` with language "${language}"` : ''}. Try adjusting search terms or parameters.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo, i) => (
            <RepoCard key={repo.id} repo={repo} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

export default ExploreSection

