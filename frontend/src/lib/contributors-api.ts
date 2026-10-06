export interface Contributor {
  login: string
  avatar_url: string | null
  profile_url: string
  contributions: number
  rank: number
  name: string | null
  blog: string | null
  twitter_username: string | null
  location: string | null
  bio: string | null
  company: string | null
}

export type ContributorSortOrder = 'highest' | 'lowest' | 'alphabetical'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseContributor(raw: unknown): Contributor | null {
  if (!isRecord(raw) || typeof raw.login !== 'string' || !raw.login) return null
  return {
    login: raw.login,
    avatar_url: typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
    profile_url: typeof raw.profile_url === 'string' ? raw.profile_url : `https://github.com/${raw.login}`,
    contributions: typeof raw.contributions === 'number' ? raw.contributions : 0,
    rank: typeof raw.rank === 'number' ? raw.rank : 0,
    name: typeof raw.name === 'string' ? raw.name : null,
    blog: typeof raw.blog === 'string' ? raw.blog : null,
    twitter_username: typeof raw.twitter_username === 'string' ? raw.twitter_username : null,
    location: typeof raw.location === 'string' ? raw.location : null,
    bio: typeof raw.bio === 'string' ? raw.bio : null,
    company: typeof raw.company === 'string' ? raw.company : null,
  }
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const body: unknown = await response.json().catch(() => null)
  const detail =
    isRecord(body) && typeof body.detail === 'string' ? body.detail : undefined
  return new Error(detail ?? `${fallback} (HTTP ${response.status})`)
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw await responseError(response, 'Could not load contributors')
  }
  return response.json() as Promise<T>
}

export async function fetchContributors(
  signal?: AbortSignal,
): Promise<Contributor[]> {
  try {
    const rawData = await getJson<unknown>(
      '/api/v1/contributors?limit=500&offset=0',
      signal,
    )
    if (!Array.isArray(rawData)) {
      return []
    }

    const records: Contributor[] = []
    for (const item of rawData) {
      const parsed = parseContributor(item)
      if (parsed) records.push(parsed)
    }

    const contributorsByLogin = new Map<string, Contributor>()
    for (const record of records) {
      const key = record.login.toLowerCase()
      const existing = contributorsByLogin.get(key)
      if (existing) {
        existing.contributions += record.contributions
        existing.name ||= record.name
        existing.avatar_url ||= record.avatar_url
        existing.profile_url ||= record.profile_url
        existing.blog ||= record.blog
        existing.twitter_username ||= record.twitter_username
        existing.location ||= record.location
        existing.bio ||= record.bio
        existing.company ||= record.company
      } else {
        contributorsByLogin.set(key, { ...record })
      }
    }

    return [...contributorsByLogin.values()]
      .sort(
        (left, right) =>
          right.contributions - left.contributions ||
          left.login.localeCompare(right.login),
      )
      .map((contributor, index) => ({ ...contributor, rank: index + 1 }))
  } catch (err) {
    console.error('Failed to load contributors:', err)
    return []
  }
}

export function searchAndSortContributors(
  contributors: Contributor[],
  search: string,
  sortOrder: ContributorSortOrder,
): Contributor[] {
  const term = search.trim().replace(/^@/, '').toLowerCase()
  const filtered = contributors.filter((contributor) =>
    [
      contributor.login,
      contributor.name ?? '',
      contributor.location ?? '',
      contributor.company ?? '',
    ].some((value) => value.toLowerCase().includes(term)),
  )

  if (sortOrder === 'lowest') {
    return filtered.sort(
      (left, right) =>
        left.contributions - right.contributions ||
        left.login.localeCompare(right.login),
    )
  }
  if (sortOrder === 'alphabetical') {
    return filtered.sort((left, right) => left.login.localeCompare(right.login))
  }
  return filtered.sort(
    (left, right) =>
      left.rank - right.rank ||
      right.contributions - left.contributions ||
      left.login.localeCompare(right.login),
  )
}
