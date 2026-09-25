import { CircleDot, GitFork, Star, Users } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatCount,
  formatPushedAt,
  ownerAsContributor,
  type Contributor,
} from '@/lib/github'

export interface FormattedRepo {
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

export function ContributorStackSkeleton() {
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

export interface ContributorStackProps {
  fullName: string
  ownerAvatarUrl: string
  contributors?: Contributor[]
}

export function ContributorStack({ fullName, ownerAvatarUrl, contributors: fetched }: ContributorStackProps) {
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

export interface RepoCardProps {
  repo: FormattedRepo
  contributors?: Contributor[]
  index?: number
  className?: string
}

export function RepoCard({ repo, contributors, index = 0, className }: RepoCardProps) {
  return (
    <Card
      className={`animate-fade-up flex flex-col ${className ?? ''}`}
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
          <ContributorStack
            fullName={repo.fullName}
            ownerAvatarUrl={repo.ownerAvatarUrl}
            contributors={contributors}
          />
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {formatPushedAt(repo.pushedAt)}
        </span>
      </CardFooter>
    </Card>
  )
}

