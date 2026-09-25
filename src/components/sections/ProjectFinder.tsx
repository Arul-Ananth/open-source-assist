import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RotateCcw, Search, SearchX, TriangleAlert } from 'lucide-react'
import {
  searchRepositories,
  searchKeys,
  BackendUnavailableError,
  type SearchRepoItem,
} from '@/lib/search'
import { fetchTopContributorsBatch, projectKeys, RateLimitError } from '@/lib/github'
import { Card, CardContent, CardFooter, CardHeader, Button, Input, Skeleton, EmptyState } from '@/components/ui'
import { RepoCard, ContributorStackSkeleton, type FormattedRepo } from '@/components/shared'

const DEFAULT_QUERY = 'beginner-friendly open source libraries for building web apps'

const QUICK_TOPICS = [
  'web frameworks',
  'vector databases',
  'machine learning',
  'async runtimes',
  'microservices',
] as const

function formatRepo(item: SearchRepoItem): FormattedRepo {
  const owner = item.full_name.split('/')[0]
  return {
    id: item.repo_id,
    fullName: item.full_name,
    owner,
    ownerAvatarUrl: `https://github.com/${owner}.png?size=64`,
    url: item.html_url,
    description: item.description,
    stars: item.stars,
    forks: item.forks,
    openIssues: item.open_issues,
    language: item.language,
    topics: item.topics.slice(0, 3),
    pushedAt: item.pushed_at ?? new Date().toISOString(),
  }
}

export function ProjectFinder() {
  const [inputValue, setInputValue] = useState('')
  const [query, setQuery] = useState(DEFAULT_QUERY)

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: searchKeys.query(query),
    queryFn: ({ signal }) => searchRepositories({ query, limit: 6, signal }),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, err) => {
      if (err instanceof BackendUnavailableError || err instanceof RateLimitError) return false
      return failureCount < 1
    },
  })

  const repos = useMemo(() => (data?.items ?? []).map(formatRepo), [data])
  const repoNames = repos.map((r) => r.fullName)

  // One batched call for all repos (cached + owner fallback inside).
  const contributorsQuery = useQuery({
    queryKey: projectKeys.contributors(repoNames),
    queryFn: ({ signal }) => fetchTopContributorsBatch(repoNames, signal),
    enabled: repoNames.length > 0,
    staleTime: 60 * 60 * 1000,
    retry: (failureCount, err) => {
      if (err instanceof RateLimitError) return false
      return failureCount < 1
    },
  })

  const contributorsMap = contributorsQuery.data ?? {}

  const runSearch = (raw: string) => {
    const next = raw.trim()
    if (next.length === 0 || next === query) return
    setQuery(next)
  }

  return (
    <section id="finder" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-24 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Discover — semantic search</p>
          <h2 className="section-h2 section-underline max-w-[24ch]">
            Describe what you want to build
          </h2>
          <p className="section-body mt-6">
            Search open-source repositories by meaning, not keywords — powered by
            vector embeddings and popularity-aware ranking. Sign up to save
            favorites and get a roadmap built around your stack.
          </p>
        </div>
        <span className="chip-neutral hidden font-mono md:inline-flex">module: search</span>
      </div>

      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          runSearch(inputValue)
        }}
      >
        <Input
          type="search"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="e.g. lightweight async web framework for python"
          aria-label="Search open-source repositories"
          maxLength={500}
          className="h-11 flex-1"
        />
        <Button type="submit" size="lg" disabled={isFetching} className="h-11">
          <Search className="size-4" aria-hidden="true" />
          {isFetching ? 'Searching…' : 'Search'}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">try:</span>
        {QUICK_TOPICS.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => {
              setInputValue(topic)
              runSearch(topic)
            }}
            className="chip-neutral transition-colors hover:border-accent hover:text-accent-text"
          >
            {topic}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="h-4 w-40" />
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
      ) : isError ? (
        <EmptyState
          icon={TriangleAlert}
          iconClassName="text-accent-text"
          title="Could not run that search"
          description={
            error instanceof BackendUnavailableError
              ? error.message
              : error instanceof Error
                ? error.message
                : 'Something went wrong. Please try again.'
          }
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Retry
            </Button>
          }
        />
      ) : repos.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No repositories matched that query"
          description="Try a broader description — different words, a wider domain, or one of the quick topics above."
        />
      ) : (
        <>
          <p
            className={`mt-8 font-mono text-xs text-muted-foreground transition-opacity duration-300 ${
              isFetching ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {repos.length} of {data?.total ?? repos.length} matches · semantic ranking ·{' '}
            {isFetching ? 'searching…' : `${(data?.duration_ms ?? 0).toFixed(0)}ms`}
          </p>
          <div
            className={`mt-3 grid grid-cols-1 gap-5 transition-opacity duration-300 md:grid-cols-3 ${
              isFetching ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {repos.map((repo, i) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                contributors={contributorsMap[repo.fullName]}
                index={i}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export default ProjectFinder
