import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  ExternalLink,
  MapPin,
  Medal,
  Search,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { Card, CardContent, EmptyState, Input, Skeleton } from '@/components/ui'
import {
  fetchContributors,
  searchAndSortContributors,
  type Contributor,
  type ContributorSortOrder,
} from '@/lib/contributors-api'

export function ContributorsSection() {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<ContributorSortOrder>('highest')
  const [selectedLogin, setSelectedLogin] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['contributors'],
    queryFn: ({ signal }) => fetchContributors(signal),
    staleTime: 5 * 60 * 1000,
  })

  const contributors = query.data ?? []
  const matchingContributors = useMemo(
    () => searchAndSortContributors(contributors, search, sortOrder),
    [contributors, search, sortOrder],
  )
  const selectedContributor = selectedLogin
    ? contributors.find(
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
          icon={Users}
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

  const totalContributions = contributors.reduce(
    (total, contributor) => total + contributor.contributions,
    0,
  )
  const topContributors = contributors.slice(0, 3)
  const hasSearchTerm = search.trim().replace(/^@/, '').length > 0

  return (
    <div className="animate-fade-up space-y-7">
      <ContributorsHeader contributorCount={contributors.length} />

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          icon={Users}
          label="Contributors"
          value={contributors.length.toLocaleString()}
        />
        <SummaryCard
          icon={Trophy}
          label="Contributions"
          value={totalContributions.toLocaleString()}
        />
      </div>

      {topContributors.length > 0 && (
        <section aria-labelledby="top-contributors-heading">
          <div className="mb-3">
            <h2 id="top-contributors-heading" className="text-base font-semibold">
              Top contributors
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ranked by total contributions across synced projects
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {topContributors.map((contributor) => (
              <FeaturedContributor
                key={contributor.login}
                contributor={contributor}
                onSelect={() => setSelectedLogin(contributor.login)}
              />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="leaderboard-heading">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="leaderboard-heading" className="text-base font-semibold">
              Full leaderboard
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasSearchTerm
                ? `${matchingContributors.length} matching ${matchingContributors.length === 1 ? 'contributor' : 'contributors'}`
                  : 'Every contributor found in the database'}
            </p>
          </div>
          {query.isFetching && (
            <span className="text-xs text-muted-foreground" role="status">
              Refreshing…
            </span>
          )}
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <label className="sr-only" htmlFor="contributor-search">
              Search contributors
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="contributor-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search username, name, company, or location"
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
            <option value="highest">Database rank</option>
            <option value="lowest">Fewest contributions</option>
            <option value="alphabetical">Username A–Z</option>
          </select>
        </div>

        {matchingContributors.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <ul className="divide-y divide-border" aria-label="Contributor rankings">
              {matchingContributors.map((contributor) => (
                <ContributorRow
                  key={contributor.login}
                  contributor={contributor}
                  onSelect={() => setSelectedLogin(contributor.login)}
                />
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={
              search
                ? 'No contributors match your search'
                : 'No contributors synced yet'
            }
            description={
              search
                ? 'Try another name or clear your search to see the full leaderboard.'
                : 'Contributors will appear here after this project has been synced.'
            }
            action={
              search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="btn-secondary"
                >
                  Clear search
                </button>
              ) : undefined
            }
          />
        )}
      </section>
    </div>
  )
}

function ContributorsHeader({ contributorCount }: { contributorCount: number }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent-text">
          Community leaderboard
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Contributors
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Explore contributors across all projects synced to the database.
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5 text-accent-text" aria-hidden="true" />
        {contributorCount} {contributorCount === 1 ? 'contributor' : 'contributors'}
      </span>
    </header>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <Card className="hover:translate-y-0">
      <CardContent className="flex items-center gap-3 p-4 pt-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent-text">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-mono text-xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
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
            {contributor.rank === 1 ? (
              <Trophy className="size-3.5" aria-hidden="true" />
            ) : (
              <Medal className="size-3.5" aria-hidden="true" />
            )}
            Rank #{contributor.rank}
          </span>
          {contributor.rank === 1 && (
            <span className="font-mono text-xs text-muted-foreground">TOP RANK</span>
          )}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <ContributorAvatar contributor={contributor} size="size-12" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {contributor.name || `@${contributor.login}`}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              @{contributor.login}
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-border/70 bg-background/60 py-3 text-center">
          <p className="font-mono text-lg font-semibold">
            {contributor.contributions.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">Contributions</p>
        </div>
        <button
          type="button"
          onClick={onSelect}
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:border-accent/50 hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          View profile
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
        aria-label={`View @${contributor.login}'s profile, database rank ${contributor.rank}`}
      >
        <span className="w-10 shrink-0 font-mono text-sm text-muted-foreground">
          #{contributor.rank}
        </span>
        <ContributorAvatar contributor={contributor} size="size-9" />
        <span className="min-w-0 flex-1 truncate">
          <span className="block truncate font-medium">
            {contributor.name || `@${contributor.login}`}
          </span>
          {contributor.name && (
            <span className="block truncate text-xs text-muted-foreground">
              @{contributor.login}
            </span>
          )}
        </span>
        {contributor.location && (
          <span className="hidden max-w-40 items-center gap-1 truncate text-xs text-muted-foreground lg:inline-flex">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {contributor.location}
          </span>
        )}
        <span className="ml-auto whitespace-nowrap font-mono text-xs text-muted-foreground">
          {contributor.contributions.toLocaleString()}{' '}
          {contributor.contributions === 1 ? 'contribution' : 'contributions'}
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
  const websiteUrl = contributor.blog
    ? getWebsiteUrl(contributor.blog)
    : undefined

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
            <ContributorAvatar contributor={contributor} size="size-20" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Project contributor
              </p>
              <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">
                {contributor.name || `@${contributor.login}`}
              </h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                @{contributor.login} · Ranked across synced projects
              </p>
            </div>
            <a
              href={contributor.profile_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:border-accent/50 hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              GitHub profile
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          {contributor.bio && (
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {contributor.bio}
            </p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ProfileStat label="Database rank" value={`#${contributor.rank}`} />
            <ProfileStat
              label="Contributions"
              value={contributor.contributions.toLocaleString()}
            />
            {contributor.location && (
              <ProfileStat label="Location" value={contributor.location} />
            )}
            {contributor.company && (
              <ProfileStat label="Company" value={contributor.company} />
            )}
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {contributor.company && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                <Building2 className="size-3.5" aria-hidden="true" />
                {contributor.company}
              </span>
            )}
            {contributor.location && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden="true" />
                {contributor.location}
              </span>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent-text"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Website
              </a>
            )}
            {contributor.twitter_username && (
              <a
                href={`https://x.com/${encodeURIComponent(contributor.twitter_username)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent-text"
              >
                X @{contributor.twitter_username}
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getWebsiteUrl(value: string): string | undefined {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}

function ContributorAvatar({
  contributor,
  size,
}: {
  contributor: Contributor
  size: string
}) {
  return contributor.avatar_url ? (
    <img
      src={contributor.avatar_url}
      alt=""
      className={`${size} shrink-0 rounded-xl border border-border object-cover`}
      loading="lazy"
    />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground`}
      aria-hidden="true"
    >
      <UserRound className="size-1/2" />
    </span>
  )
}

function ProfileStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-mono text-lg font-semibold">{value}</dd>
    </div>
  )
}

function ContributorsLoading() {
  return (
    <div className="animate-fade-up space-y-7" aria-busy="true" aria-label="Loading contributors">
      <div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-8 w-52" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((item) => (
          <Card key={item}>
            <CardContent className="flex items-center gap-3 p-4 pt-4">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
