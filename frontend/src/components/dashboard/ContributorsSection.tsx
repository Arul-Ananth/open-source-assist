import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  GitPullRequest,
  Search,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { Card, CardContent, EmptyState, Input, Skeleton } from '@/components/ui'
import {
  buildContributorLeaderboard,
  CONTRIBUTOR_SCORE_PER_MERGED_PR,
  CONTRIBUTORS_REPOSITORY,
  fetchRepositoryPullRequests,
  searchAndSortContributors,
  type Contributor,
  type ContributorPullRequest,
  type ContributorSortOrder,
} from '@/lib/contributors-api'

const PULL_REQUESTS_PER_PAGE = 10

export function ContributorsSection() {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<ContributorSortOrder>('highest')
  const [selectedLogin, setSelectedLogin] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['contributors', CONTRIBUTORS_REPOSITORY],
    queryFn: ({ signal }) => fetchRepositoryPullRequests(signal),
    staleTime: 5 * 60 * 1000,
  })

  const leaderboard = useMemo(
    () => buildContributorLeaderboard(query.data ?? []),
    [query.data],
  )
  const matchingContributors = useMemo(() => {
    return searchAndSortContributors(leaderboard, search, sortOrder)
  }, [leaderboard, search, sortOrder])

  const selectedContributor = selectedLogin
    ? leaderboard.find(
        (contributor) =>
          contributor.login.toLowerCase() === selectedLogin.toLowerCase(),
      )
    : undefined

  if (query.isLoading) return <ContributorsLoading />

  if (query.isError && !query.data) {
    return (
      <div className="animate-fade-up space-y-6">
        <ContributorsHeader contributorCount={0} />
        <EmptyState
          icon={GitPullRequest}
          title="Couldn’t load contributors"
          description={query.error.message}
          action={
            <button
              type="button"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              className="btn-secondary"
            >
              {query.isFetching ? 'Retrying…' : 'Try again'}
            </button>
          }
        />
      </div>
    )
  }

  if (selectedContributor) {
    return (
      <ContributorProfile
        contributor={selectedContributor}
        onBack={() => setSelectedLogin(null)}
      />
    )
  }

  const hasSearchTerm = search.trim().replace(/^@/, '').length > 0
  const featuredContributors = hasSearchTerm
    ? matchingContributors.slice(0, 3)
    : leaderboard.slice(0, 3)
  const featuredLogins = new Set(
    featuredContributors.map((contributor) => contributor.login.toLowerCase()),
  )
  const remainingContributors = matchingContributors.filter(
    (contributor) => !featuredLogins.has(contributor.login.toLowerCase()),
  )

  return (
    <div className="animate-fade-up space-y-7">
      <ContributorsHeader contributorCount={leaderboard.length} />

      <Card className="overflow-hidden border-accent/20 bg-gradient-soft hover:translate-y-0 hover:shadow-soft-sm">
        <CardContent className="flex flex-col gap-4 p-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent-text">
              <Trophy className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">A clear way to earn your place</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each merged pull request earns {CONTRIBUTOR_SCORE_PER_MERGED_PR} points.
                Open and unmerged pull requests don’t count toward the score.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-muted-foreground">
            Merged PRs × {CONTRIBUTOR_SCORE_PER_MERGED_PR} = score
          </span>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <label className="sr-only" htmlFor="contributor-search">
            Search contributors by GitHub username
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="contributor-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search GitHub usernames"
            autoComplete="off"
            className="pl-9 pr-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear contributor search"
              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <label className="sr-only" htmlFor="contributor-sort">
          Sort contributors
        </label>
        <select
          id="contributor-sort"
          value={sortOrder}
          onChange={(event) => {
            const value = event.target.value
            if (
              value === 'highest' ||
              value === 'lowest' ||
              value === 'alphabetical'
            ) {
              setSortOrder(value)
            }
          }}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent sm:w-56"
        >
          <option value="highest">Highest PR count</option>
          <option value="lowest">Lowest PR count</option>
          <option value="alphabetical">Username A–Z</option>
        </select>
      </div>

      {matchingContributors.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No contributors match that username' : 'No merged contributions yet'}
          description={
            search
              ? 'Try another GitHub username or clear your search to see the full leaderboard.'
              : 'Merged pull requests for this repository will appear here.'
          }
          action={
            search ? (
              <button type="button" onClick={() => setSearch('')} className="btn-secondary">
                Clear search
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-7">
          <section aria-labelledby="top-contributors-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 id="top-contributors-heading" className="text-base font-semibold">
                  {search ? 'Top matches' : 'Leaderboard'}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {search
                    ? `${matchingContributors.length} matching ${matchingContributors.length === 1 ? 'contributor' : 'contributors'}`
                    : `Top contributors to ${CONTRIBUTORS_REPOSITORY}`}
                </p>
              </div>
              {query.isFetching && (
                <span className="text-xs text-muted-foreground" role="status">
                  Refreshing…
                </span>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {featuredContributors.map((contributor) => (
                <FeaturedContributor
                  key={contributor.login}
                  contributor={contributor}
                  onSelect={() => setSelectedLogin(contributor.login)}
                />
              ))}
            </div>
          </section>

          {remainingContributors.length > 0 && (
            <section aria-labelledby="more-contributors-heading">
              <div className="mb-3">
                <h2 id="more-contributors-heading" className="text-base font-semibold">
                  More contributors
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sortOrder === 'highest'
                    ? 'Ranked by merged pull requests'
                    : sortOrder === 'lowest'
                      ? 'Sorted by merged pull requests, fewest first'
                      : 'Sorted by GitHub username'}
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <ul className="divide-y divide-border">
                  {remainingContributors.map((contributor) => (
                    <ContributorRow
                      key={contributor.login}
                      contributor={contributor}
                      onSelect={() => setSelectedLogin(contributor.login)}
                    />
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function ContributorsHeader({ contributorCount }: { contributorCount: number }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent-text">
          Community
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Contributors
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Meet the people building this project, one merged pull request at a time.
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5 text-accent-text" aria-hidden="true" />
        {contributorCount} {contributorCount === 1 ? 'contributor' : 'contributors'}
      </span>
    </header>
  )
}

function FeaturedContributor({
  contributor,
  onSelect,
}: {
  contributor: Contributor
  onSelect: () => void
}) {
  return (
    <Card
      className={`relative overflow-hidden hover:translate-y-0 ${
        contributor.rank === 1
          ? 'border-accent/50 bg-gradient-soft hover:border-accent/70'
          : 'hover:border-accent/40'
      }`}
    >
      <CardContent className="p-4 pt-4 sm:p-5 sm:pt-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-xs font-semibold text-accent-text">
            <Trophy className="size-3.5" aria-hidden="true" />
            Rank #{contributor.rank}
          </span>
          <span className="font-mono text-xs text-muted-foreground">FEATURED</span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <img
            src={contributor.avatarUrl}
            alt={`${contributor.login}'s GitHub avatar`}
            className="size-12 rounded-xl border border-border object-cover"
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">@{contributor.login}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Open-source contributor</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 divide-x divide-border rounded-lg border border-border/70 bg-background/60 py-3 text-center">
          <div>
            <p className="font-mono text-lg font-semibold">{contributor.mergedPRs}</p>
            <p className="text-[11px] text-muted-foreground">Merged PRs</p>
          </div>
          <div>
            <p className="font-mono text-lg font-semibold text-accent-text">
              {contributor.score}
            </p>
            <p className="text-[11px] text-muted-foreground">Points</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSelect}
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:border-accent/50 hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          View contributions
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </button>
      </CardContent>
    </Card>
  )
}

function ContributorRow({
  contributor,
  onSelect,
}: {
  contributor: Contributor
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:flex-nowrap"
        aria-label={`View @${contributor.login}'s profile, rank ${contributor.rank}`}
      >
        <span className="w-10 shrink-0 font-mono text-sm text-muted-foreground">
          #{contributor.rank}
        </span>
        <img
          src={contributor.avatarUrl}
          alt=""
          className="size-9 shrink-0 rounded-lg border border-border object-cover"
          loading="lazy"
        />
        <span className="min-w-0 flex-1 truncate font-medium">@{contributor.login}</span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {contributor.mergedPRs} merged {contributor.mergedPRs === 1 ? 'PR' : 'PRs'}
        </span>
        <span className="w-20 text-right font-mono text-sm font-semibold text-accent-text">
          {contributor.score} pts
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  )
}

function ContributorProfile({
  contributor,
  onBack,
}: {
  contributor: Contributor
  onBack: () => void
}) {
  const [visibleCount, setVisibleCount] = useState(PULL_REQUESTS_PER_PAGE)
  const openPullRequests = contributor.pullRequests.filter(
    (pullRequest) => pullRequest.state === 'open',
  ).length
  const closedPullRequests = contributor.pullRequests.filter(
    (pullRequest) => pullRequest.state === 'closed',
  ).length
  const pullRequests = [...contributor.pullRequests]
    .sort(
      (left, right) =>
        new Date(right.merged_at ?? right.created_at).getTime() -
        new Date(left.merged_at ?? left.created_at).getTime(),
    )
    .slice(0, visibleCount)

  return (
    <div className="animate-fade-up space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to contributors
      </button>

      <Card className="overflow-hidden hover:translate-y-0">
        <div className="h-1 bg-gradient-program" />
        <CardContent className="p-5 pt-5 sm:p-7 sm:pt-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img
              src={contributor.avatarUrl}
              alt={`${contributor.login}'s GitHub avatar`}
              className="size-20 rounded-2xl border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Contributor profile
              </p>
              <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">
                @{contributor.login}
              </h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                Contributions to {CONTRIBUTORS_REPOSITORY}
              </p>
            </div>
            <a
              href={contributor.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:border-accent/50 hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              GitHub profile
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ProfileStat label="Leaderboard rank" value={`#${contributor.rank}`} />
            <ProfileStat label="Merged PRs" value={contributor.mergedPRs} />
            <ProfileStat label="Contributor score" value={contributor.score} />
            <ProfileStat label="Open PRs" value={openPullRequests} />
            <ProfileStat label="Closed (incl. merged)" value={closedPullRequests} />
          </dl>
        </CardContent>
      </Card>

      <section aria-labelledby="contributor-work-heading">
        <div className="mb-3">
          <h2 id="contributor-work-heading" className="text-lg font-semibold">
            Pull request activity
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {contributor.pullRequests.length
              ? `${contributor.pullRequests.length} pull ${contributor.pullRequests.length === 1 ? 'request' : 'requests'} found in this repository`
              : 'No pull request records are available for this contributor.'}
          </p>
        </div>

        {pullRequests.length > 0 ? (
          <>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {pullRequests.map((pullRequest) => (
                <PullRequestRow key={pullRequest.number} pullRequest={pullRequest} />
              ))}
            </ul>
            {visibleCount < contributor.pullRequests.length && (
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((count) =>
                    Math.min(count + PULL_REQUESTS_PER_PAGE, contributor.pullRequests.length),
                  )
                }
                className="btn-secondary mt-4 w-full sm:w-auto"
              >
                Load more pull requests
              </button>
            )}
          </>
        ) : (
          <EmptyState
            icon={GitPullRequest}
            title="No pull request records"
            description="No pull request records are available for this contributor in this repository."
          />
        )}
      </section>
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold">{value}</dd>
    </div>
  )
}

function PullRequestRow({ pullRequest }: { pullRequest: ContributorPullRequest }) {
  const status = pullRequest.merged_at
    ? 'Merged'
    : pullRequest.state === 'open'
      ? pullRequest.draft
        ? 'Draft'
        : 'Open'
      : 'Closed'
  const date = pullRequest.merged_at ?? pullRequest.created_at
  const dateLabel = pullRequest.merged_at ? 'Merged' : 'Opened'

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <span
        className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          status === 'Merged'
            ? 'border-accent/30 bg-accent/10 text-accent-text'
            : 'border-border bg-background text-muted-foreground'
        }`}
      >
        <GitPullRequest className="size-3.5" aria-hidden="true" />
        {status}
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={pullRequest.html_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 font-medium text-foreground transition-colors hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="truncate">{pullRequest.title}</span>
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </a>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {CONTRIBUTORS_REPOSITORY} #{pullRequest.number}
        </p>
      </div>
      <time
        dateTime={date}
        className="shrink-0 text-xs text-muted-foreground"
        title={new Date(date).toLocaleString()}
      >
        {dateLabel} {new Date(date).toLocaleDateString()}
      </time>
    </li>
  )
}

function ContributorsLoading() {
  return (
    <div className="animate-fade-up space-y-7" aria-busy="true" aria-label="Loading contributors">
      <div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-52" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      <Card>
        <CardContent className="space-y-3 p-5 pt-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </CardContent>
      </Card>
      <Skeleton className="h-10 w-full max-w-lg" />
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <CardContent className="space-y-4 p-5 pt-5">
              <Skeleton className="h-6 w-24" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-xl" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
