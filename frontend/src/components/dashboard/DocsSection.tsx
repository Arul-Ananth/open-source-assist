import { useCallback, useEffect, useState } from 'react'
import {
  BookMarked,
  BookOpenCheck,
  ExternalLink,
  GitCommit,
  GitFork,
  GitPullRequest,
  Heart,
  LifeBuoy,
  PenLine,
  RotateCcw,
  Scale,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
} from '@/components/ui'
import {
  fetchDocuments,
  type DocCategory,
  type DocumentItem,
} from '@/lib/docs-api'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

const CATEGORY_ICON_MAP: Record<string, typeof Target> = {
  'getting-started': Target,
  git: GitCommit,
  github: GitFork,
  'pull-requests': GitPullRequest,
  community: Heart,
  writing: PenLine,
  programs: Trophy,
  legal: Scale,
  help: LifeBuoy,
}

export function DocsSection() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [categories, setCategories] = useState<DocCategory[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [userSkillLevel, setUserSkillLevel] = useState<string | null>(null)
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')

  const loadDocs = useCallback(async (cat: string, searchVal: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchDocuments(
        {
          category: cat !== 'all' ? cat : undefined,
          query: searchVal.trim() || undefined,
        },
        token ?? undefined,
      )
      setCategories(data.categories)
      setDocuments(data.items)
      setTotalCount(data.total_count)
      setUserSkillLevel(data.user_skill_level ?? user?.skill_level ?? null)
      setIsPersonalized(data.is_personalized)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load official documentation')
    } finally {
      setLoading(false)
    }
  }, [token, user?.skill_level])

  // Initial load
  useEffect(() => {
    void loadDocs(category, query)
  }, [category, loadDocs, query])

  const clearAll = () => {
    setQuery('')
    setCategory('all')
  }

  const isFiltering = query.trim() !== '' || category !== 'all'

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Resources / Documentation</p>
          <h1 className="section-h2">Documentation</h1>
          <div className="section-underline" aria-hidden="true" />
          <p className="section-body">
            The real, official docs for open source and GitHub — curated, categorized, and tailored
            to your skill profile. Every link goes straight to the source.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
          <BookMarked className="size-4 text-accent-text" aria-hidden="true" />
          <p className="font-mono text-sm font-bold text-accent-text">
            {totalCount} docs
          </p>
        </div>
      </div>

      {/* Personalization Banner */}
      {isPersonalized && userSkillLevel && (
        <div className="flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-xs text-foreground">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
            <Sparkles className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 leading-relaxed">
            <span className="font-semibold text-accent-text capitalize">
              Personalized for your {userSkillLevel} profile:
            </span>{' '}
            Resources and guides tailored to your assessed knowledge and focus are prioritized with recommendation badges.
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <Card className="rounded-xl">
        <CardContent className="p-4 sm:p-5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              role="searchbox"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('')
              }}
              placeholder='Search the docs… try "pull request", rebase, license, GSoC…'
              aria-label="Search documentation"
              className="h-11 pl-10 pr-10 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <SlidersHorizontal
              className="mr-1 size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={cn(
                'rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
                category === 'all'
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-border bg-surface text-muted-foreground hover:border-accent/60 hover:text-foreground',
              )}
            >
              All
            </button>
            {categories.map((cat) => {
              const active = category === cat.id
              const IconComp = CATEGORY_ICON_MAP[cat.id] ?? BookMarked
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(active ? 'all' : cat.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
                    active
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-border bg-surface text-muted-foreground hover:border-accent/60 hover:text-foreground',
                  )}
                >
                  <IconComp className="size-3" aria-hidden="true" />
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* Active filters summary */}
          {isFiltering && (
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{documents.length}</span>{' '}
                {documents.length === 1 ? 'document' : 'documents'}
                {query.trim() && (
                  <>
                    {' '}matching <span className="font-mono text-accent-text">“{query.trim()}”</span>
                  </>
                )}
                {category !== 'all' && (
                  <>
                    {' '}in{' '}
                    <span className="font-medium text-foreground">
                      {categories.find((c) => c.id === category)?.label}
                    </span>
                  </>
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="ml-auto gap-1.5 text-xs"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content State */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-lg border border-border bg-surface/50 p-4"
            />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center border-destructive/30">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void loadDocs(category, query)}
            className="mt-4 gap-1.5"
          >
            <RotateCcw className="size-3.5" /> Retry
          </Button>
        </Card>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="No documents found"
          description={
            query.trim()
              ? `Nothing matches "${query.trim()}". Try fewer words, check the spelling, or browse a category instead.`
              : 'No documents in this category yet.'
          }
          action={
            <Button size="sm" variant="secondary" onClick={clearAll} className="gap-1.5">
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Clear search & filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {documents.map((doc) => {
            const CatIcon = CATEGORY_ICON_MAP[doc.category] ?? BookMarked
            const catObj = categories.find((c) => c.id === doc.category)
            return (
              <a
                key={doc.url}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group block rounded-lg border p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-5',
                  doc.is_recommended
                    ? 'border-accent/40 bg-accent/5 hover:border-accent'
                    : 'border-border bg-background hover:border-accent/50',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-lg border',
                        doc.is_recommended
                          ? 'border-accent/30 bg-accent/10'
                          : 'border-border bg-surface',
                      )}
                    >
                      <CatIcon className="size-4.5 text-accent-text" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold group-hover:text-accent-text">
                        {doc.title}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {doc.source}
                      </p>
                    </div>
                  </div>
                  <ExternalLink
                    className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-accent-text"
                    aria-hidden="true"
                  />
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {doc.description}
                </p>

                {doc.recommendation_reason && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-accent-text">
                    <Sparkles className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{doc.recommendation_reason}</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {catObj && (
                    <Badge variant="accent" className="text-[10px]">
                      <CatIcon className="mr-1 size-3" aria-hidden="true" />
                      {catObj.label}
                    </Badge>
                  )}
                  {doc.is_recommended && (
                    <Badge variant="secondary" className="border-accent/40 text-[10px] font-semibold">
                      Recommended
                    </Badge>
                  )}
                  {doc.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DocsSection
