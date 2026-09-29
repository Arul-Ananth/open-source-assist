import { useMemo, useState } from 'react'
import {
  BookMarked,
  BookOpenCheck,
  ExternalLink,
  RotateCcw,
  Search,
  SlidersHorizontal,
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
  DOC_CATEGORIES,
  DOCUMENTS,
  DOCUMENTS_COUNT,
  type DocCategoryId,
  type DocEntry,
} from '@/data/documents'
import { cn } from '@/lib/utils'

/**
 * Documentation module — a searchable catalog of the real, official
 * open source & GitHub documentation. Every link opens the live docs.
 */

/** Normalize text for forgiving search: lowercase, strip punctuation. */
const normalize = (value: string) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

/** Score a document against the parsed query terms. Higher = better match. */
function scoreDoc(doc: DocEntry, terms: string[], category: DocCategoryId): number {
  const title = normalize(doc.title)
  const desc = normalize(doc.description)
  const source = normalize(doc.source)
  const tags = doc.tags.map(normalize).join(' ')
  const categoryLabel = normalize(
    DOC_CATEGORIES.find((c) => c.id === doc.category)?.label ?? '',
  )

  let score = 0
  for (const term of terms) {
    if (title.includes(term)) score += 10
    else if (title.startsWith(term)) score += 6
    if (tags.includes(term)) score += 5
    if (categoryLabel.includes(term)) score += 3
    if (source.includes(term)) score += 2
    if (desc.includes(term)) score += 1
  }
  if (category === doc.category) score += 4
  return score
}

/** Split a query into terms, respecting quoted phrases. */
function parseQuery(query: string): string[] {
  const terms: string[] = []
  const phraseRegex = /"([^"]+)"/g
  let rest = query
  let match: RegExpExecArray | null
  while ((match = phraseRegex.exec(query)) !== null) {
    const phrase = normalize(match[1])
    if (phrase) terms.push(phrase)
    rest = rest.replace(match[0], ' ')
  }
  terms.push(
    ...normalize(rest)
      .split(' ')
      .filter((t) => t.length > 0),
  )
  return terms
}

export function DocsSection() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<DocCategoryId | 'all'>('all')

  const terms = useMemo(() => parseQuery(query), [query])

  const results = useMemo(() => {
    const trimmed = query.trim()
    let docs = category === 'all' ? DOCUMENTS : DOCUMENTS.filter((d) => d.category === category)

    if (!trimmed) return docs

    return docs
      .map((doc) => ({ doc, score: scoreDoc(doc, terms, category === 'all' ? doc.category : category) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ doc }) => doc)
  }, [query, terms, category])

  const isFiltering = query.trim() !== '' || category !== 'all'
  const clearAll = () => {
    setQuery('')
    setCategory('all')
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Resources / Documentation</p>
          <h1 className="section-h2">Documentation</h1>
          <div className="section-underline" aria-hidden="true" />
          <p className="section-body">
            The real, official docs for open source and GitHub — curated, categorized and
            searchable. Every link goes straight to the source.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
          <BookMarked className="size-4 text-accent-text" aria-hidden="true" />
          <p className="font-mono text-sm font-bold text-accent-text">
            {DOCUMENTS_COUNT} docs
          </p>
        </div>
      </div>

      {/* Search bar */}
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
            {DOC_CATEGORIES.map((cat) => {
              const active = category === cat.id
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
                  <cat.Icon className="size-3" aria-hidden="true" />
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* Active filters summary */}
          {isFiltering && (
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{results.length}</span>{' '}
                {results.length === 1 ? 'document' : 'documents'}
                {query.trim() && (
                  <>
                    {' '}matching <span className="font-mono text-accent-text">“{query.trim()}”</span>
                  </>
                )}
                {category !== 'all' && (
                  <>
                    {' '}in{' '}
                    <span className="font-medium text-foreground">
                      {DOC_CATEGORIES.find((c) => c.id === category)?.label}
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

      {/* Results */}
      {results.length === 0 ? (
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
          {results.map((doc) => {
            const cat = DOC_CATEGORIES.find((c) => c.id === doc.category)
            const CatIcon = cat?.Icon ?? BookMarked
            return (
              <a
                key={doc.url}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
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

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {cat && (
                    <Badge variant="accent" className="text-[10px]">
                      <CatIcon className="mr-1 size-3" aria-hidden="true" />
                      {cat.label}
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
