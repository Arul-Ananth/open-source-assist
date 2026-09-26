import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { RotateCcw, SearchX, TriangleAlert } from 'lucide-react'
import {
  searchProjects,
  fetchTopContributorsBatch,
  projectKeys,
  RateLimitError,
} from '@/lib/github'
import { Card, CardContent, CardFooter, CardHeader, Button, Skeleton, EmptyState } from '@/components/ui'
import { RepoCard, ContributorStackSkeleton, type FormattedRepo } from '@/components/shared'

function formatRepos(items: import('@/lib/github').Repo[]): FormattedRepo[] {
  return items.map((repo) => ({
    id: repo.id,
    fullName: repo.full_name,
    owner: repo.owner.login,
    ownerAvatarUrl: repo.owner.avatar_url,
    url: repo.html_url,
    description: repo.description,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    language: repo.language,
    topics: repo.topics.slice(0, 3),
    pushedAt: repo.pushed_at,
  }))
}

export function ProjectFinder() {
  const [source, setSource] = React.useState<'backend' | 'github'>('backend')

  const { data: repos = [], isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: projectKeys.bySource(source),
    queryFn: ({ signal }) => searchProjects(signal, source),
    select: (data) => formatRepos(data.items).slice(0, 3),
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, err) => {
      if (err instanceof RateLimitError) return false
      return failureCount < 1
    },
  })

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

  return (
    <section id="finder" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-24 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Explore — live preview</p>
          <h2 className="section-h2 section-underline max-w-[24ch]">
            GitHub's most starred repos, right now
          </h2>
          <p className="section-body mt-6">
            The three most-starred, actively maintained repositories on
            GitHub — globally — with their top three contributors. Sign up
            to save favorites and get a roadmap built around your stack.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSource((s) => (s === 'backend' ? 'github' : 'backend'))}
          className="chip-neutral font-mono text-xs cursor-pointer hover:border-accent transition-colors"
          title="Toggle search source: Backend Semantic Search vs GitHub Live"
        >
          source: {source === 'backend' ? 'backend-semantic' : 'github-live'}
        </button>
      </div>

      {contributorsQuery.isError && contributorsQuery.error instanceof RateLimitError && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-300 animate-fade-in">
          <TriangleAlert className="size-3.5 shrink-0 text-amber-400" />
          <span>GitHub API contributor rate limit reached. Displaying repository owner profiles instead.</span>
        </div>
      )}

      {isPending ? (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
          title="Could not load projects"
          description={error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
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
          title="No projects match those filters"
          description="Try a different language or issue type."
        />
      ) : (
        <div
          className={`mt-8 grid grid-cols-1 gap-5 transition-opacity duration-300 md:grid-cols-3 ${
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
      )}
    </section>
  )
}

export default ProjectFinder

