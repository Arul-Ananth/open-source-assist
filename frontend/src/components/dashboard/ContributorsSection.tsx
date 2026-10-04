import { useState } from 'react'
import {
  Users,
  ExternalLink,
  Search,
} from 'lucide-react'
import { Card, CardContent, Badge, Input } from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'

interface Contributor {
  id: string
  name: string
  handle: string
  avatar: string
  role: string
  contributions: number
  mergedPRs: number
  tier: 'Diamond' | 'Gold' | 'Silver' | 'Bronze'
  topLanguages: string[]
  githubUrl: string
}

const FEATURED_CONTRIBUTORS: Contributor[] = [
  {
    id: '1',
    name: 'Michael John Franklin',
    handle: 'mikelokinz',
    avatar: 'https://avatars.githubusercontent.com/u/215789017?v=4',
    role: 'Core Collaborator · ocean_sentry',
    contributions: 248,
    mergedPRs: 14,
    tier: 'Gold',
    topLanguages: ['JavaScript', 'TypeScript', 'Python'],
    githubUrl: 'https://github.com/mikelokinz',
  },
  {
    id: '2',
    name: 'Arul Ananth',
    handle: 'Arul-Ananth',
    avatar: 'https://github.com/Arul-Ananth.png',
    role: 'Project Creator · open-source-assist',
    contributions: 540,
    mergedPRs: 38,
    tier: 'Diamond',
    topLanguages: ['Python', 'TypeScript', 'React'],
    githubUrl: 'https://github.com/Arul-Ananth',
  },
  {
    id: '3',
    name: 'Sebastián Ramírez',
    handle: 'tiangolo',
    avatar: 'https://github.com/tiangolo.png',
    role: 'Creator · FastAPI',
    contributions: 3120,
    mergedPRs: 210,
    tier: 'Diamond',
    topLanguages: ['Python', 'Docker'],
    githubUrl: 'https://github.com/tiangolo',
  },
  {
    id: '4',
    name: 'Linus Torvalds',
    handle: 'torvalds',
    avatar: 'https://github.com/torvalds.png',
    role: 'Creator · Linux Kernel & Git',
    contributions: 55000,
    mergedPRs: 4500,
    tier: 'Diamond',
    topLanguages: ['C', 'Shell'],
    githubUrl: 'https://github.com/torvalds',
  },
  {
    id: '5',
    name: 'Dan Abramov',
    handle: 'gaearon',
    avatar: 'https://github.com/gaearon.png',
    role: 'Co-Author · Redux & React Core',
    contributions: 1850,
    mergedPRs: 142,
    tier: 'Gold',
    topLanguages: ['JavaScript', 'React'],
    githubUrl: 'https://github.com/gaearon',
  },
  {
    id: '6',
    name: 'Charlie Marsh',
    handle: 'charliermarsh',
    avatar: 'https://github.com/charliermarsh.png',
    role: 'Creator · Astral uv & Ruff',
    contributions: 2800,
    mergedPRs: 180,
    tier: 'Diamond',
    topLanguages: ['Rust', 'Python'],
    githubUrl: 'https://github.com/charliermarsh',
  },
]

export function ContributorsSection() {
  const [search, setSearch] = useState('')
  const currentUser = useAuthStore((s) => s.user)

  const filtered = FEATURED_CONTRIBUTORS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.handle.toLowerCase().includes(search.toLowerCase()) ||
      c.topLanguages.some((l) => l.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Open Source Contributors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect and collaborate with developers contributing across open-source ecosystems.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-accent/40 bg-accent/10 px-3 py-1 text-xs text-accent-text">
            <Users className="mr-1.5 size-3.5" />
            {FEATURED_CONTRIBUTORS.length}+ Active Contributors
          </Badge>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name, handle, or language..."
          className="pl-9 text-xs"
        />
      </div>

      {/* Grid of Contributors */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c, index) => {
          const isCurrentUser =
            currentUser?.username?.toLowerCase() === c.handle.toLowerCase()

          return (
            <Card
              key={c.id}
              className={`transition-all duration-200 hover:border-accent/50 ${
                isCurrentUser ? 'border-accent/60 bg-accent/5 ring-1 ring-accent/30' : ''
              }`}
            >
              <CardContent className="p-5 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="size-12 rounded-xl border border-border object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://github.com/${c.handle}.png`
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold text-foreground">{c.name}</p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-[9px] text-accent-text border-accent/40">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="truncate font-mono text-xs text-accent-text">@{c.handle}</p>
                    </div>
                  </div>

                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                      c.tier === 'Diamond'
                        ? 'border border-violet-500/40 bg-violet-500/10 text-violet-400'
                        : 'border border-amber-500/40 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    #{index + 1}
                  </span>
                </div>

                <p className="mt-2.5 truncate text-xs text-muted-foreground">{c.role}</p>

                {/* Stats */}
                <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-background/50 p-2.5 text-center">
                  <div>
                    <span className="font-mono text-sm font-bold text-foreground">
                      {c.contributions.toLocaleString()}
                    </span>
                    <p className="text-[10px] text-muted-foreground">Contributions</p>
                  </div>
                  <div>
                    <span className="font-mono text-sm font-bold text-sky-400">
                      {c.mergedPRs}
                    </span>
                    <p className="text-[10px] text-muted-foreground">Merged PRs</p>
                  </div>
                </div>

                {/* Languages */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.topLanguages.map((lang) => (
                    <span
                      key={lang}
                      className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground border border-border/60"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                {/* GitHub link button */}
                <div className="mt-4 pt-3 border-t border-border/60">
                  <a
                    href={c.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-1.5 text-xs font-semibold transition-colors hover:border-accent hover:bg-surface/80"
                  >
                    <span>View GitHub Profile</span>
                    <ExternalLink className="size-3 opacity-60" />
                  </a>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
