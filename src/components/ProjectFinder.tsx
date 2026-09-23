import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CircleDot,
  GitFork,
  RotateCcw,
  SearchX,
  Star,
  TriangleAlert,
  Users,
} from 'lucide-react'
import {
  searchProjects,
  fetchTopContributorsBatch,
  ownerAsContributor,
  formatCount,
  formatPushedAt,
  type Contributor,
} from '@/lib/github'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

/* Contributors are fetched once for all visible repos and shared via context,
   so the card grid never fires one unauthenticated request per card. */
const ContributorsContext = createContext<Record<string, Contributor[]>>({})

function ContributorStackSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="size-7 rounded-full ring-2 ring-surface" />
        ))}
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

interface ContributorStackProps {
  fullName: string
  ownerAvatarUrl: string
}

function ContributorStack({ fullName, ownerAvatarUrl }: ContributorStackProps) {
  const contributorsMap = useContext(ContributorsContext)
  const fetched = contributorsMap[fullName]

  // Owner fallback: GitHub rate-limit or empty response still shows a face.
  const contributors: Contributor[] =
    fetched && fetched.length > 0 ? fetched : ownerAsContributor(fullName, ownerAvatarUrl)
  const isFallback = !fetched || fetched.length === 0

  return (
    <div className="group/contrib flex items-center gap-2.5">
      <div className="flex -space-x-2">
        {contributors.map((c, i) => (
          <a
            key={`${c.login}-${i}`}
            href={c.html_url}
            target="_blank"
            rel="noreferrer"
            title={`${c.login}${c.contributions > 0 ? ` · ${c.contributions} contributions` : ' · maintainer'}`}
            tabIndex={i === 0 ? 0 : -1}
            className="relative block transition-transform duration-200 hover:z-10 hover:-translate-y-1 hover:scale-110"
          >
            <img
              src={c.avatar_url}
              alt={`${c.login} avatar`}
              loading="lazy"
              className="size-7 rounded-full border border-border bg-surface object-cover"
            />
          </a>
        ))}
      </div>
      <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        <Users className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">
          top: <span className="text-accent-text">{contributors[0].login}</span>
        </span>
        {isFallback && <span className="chip-neutral hidden shrink-0 sm:inline-flex">owner</span>}
      </span>
    </div>
  )
}

interface RepoCardProps {
  repo: FormattedRepo
  index: number
}

function RepoCard({ repo, index }: RepoCardProps) {
  return (
    <Card
      className="animate-fade-up flex flex-col"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <img
            src={repo.ownerAvatarUrl}
            alt={`${repo.owner} avatar`}
            loading="lazy"
            className="size-8 rounded-md border border-border"
          />
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="truncate font-mono text-sm font-semibold text-accent-text hover:underline"
          >
            {repo.fullName}
          </a>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {repo.description ?? 'No description provided.'}
        </p>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex flex-wrap gap-1.5">
          {repo.language && <Badge>{repo.language}</Badge>}
          {repo.topics.slice(0, 2).map((topic) => (
            <Badge key={topic} variant="secondary">
              {topic}
            </Badge>
          ))}
        </div>
        <dl className="mt-4 flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Star className="size-3.5 text-accent-secondary" aria-hidden="true" />
            <dt className="sr-only">Stars</dt>
            <dd>{formatCount(repo.stars)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <GitFork className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Forks</dt>
            <dd>{formatCount(repo.forks)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <CircleDot className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Open issues</dt>
            <dd>{formatCount(repo.openIssues)}</dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="justify-between gap-2 border-t border-border pt-4">
        <div className="min-w-0">
          <ContributorStack fullName={repo.fullName} ownerAvatarUrl={repo.ownerAvatarUrl} />
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {formatPushedAt(repo.pushedAt)}
        </span>
      </CardFooter>
    </Card>
  )
}

interface FormattedRepo {
  id: number
  fullName: string
  owner: string
  ownerAvatarUrl: string
  url: string
  description: string | null
  stars: number
  forks: number
  openIssues: number
  language: string | null
  topics: string[]
  pushedAt: string
}

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

export default function ProjectFinder() {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['projects'],
    queryFn: ({ signal }) => searchProjects(signal),
    staleTime: 10 * 60 * 1000,
  })

  const repos = data ? formatRepos(data.items).slice(0, 3) : []
  const repoNames = repos.map((r) => r.fullName)

  // One batched call for all repos (cached + owner fallback inside).
  const contributorsQuery = useQuery({
    queryKey: ['contributors-batch', repoNames],
    queryFn: ({ signal }) => fetchTopContributorsBatch(repoNames, signal),
    enabled: repoNames.length > 0,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })

  const contributorsMap = contributorsQuery.data ?? {}

  return (
    <ContributorsContext.Provider value={contributorsMap}>
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
          <span className="chip-neutral hidden font-mono md:inline-flex">module: explore</span>
        </div>

        {/* Results: exactly three cards */}
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
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <TriangleAlert className="size-8 text-accent-text" aria-hidden="true" />
              <div>
                <p className="font-semibold">Could not load projects</p>
                <p className="mt-1 max-w-[48ch] text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : repos.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="font-semibold">No projects match those filters</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a different language or issue type.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div
            className={`mt-8 grid grid-cols-1 gap-5 transition-opacity duration-300 md:grid-cols-3 ${
              isFetching ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {repos.map((repo, i) => (
              <RepoCard key={repo.id} repo={repo} index={i} />
            ))}
          </div>
        )}
      </section>
    </ContributorsContext.Provider>
  )
}
