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

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isContributor(value: unknown): value is Contributor {
  return (
    isRecord(value) &&
    typeof value.login === 'string' &&
    nullableString(value.avatar_url) &&
    typeof value.profile_url === 'string' &&
    typeof value.contributions === 'number' &&
    typeof value.rank === 'number' &&
    nullableString(value.name) &&
    nullableString(value.blog) &&
    nullableString(value.twitter_username) &&
    nullableString(value.location) &&
    nullableString(value.bio) &&
    nullableString(value.company)
  )
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
  const records: Contributor[] = []
  const pageSize = 100
  let offset = 0

  while (true) {
    const page: unknown = await getJson(
      `/api/v1/contributors?limit=${pageSize}&offset=${offset}`,
      signal,
    )
    if (!Array.isArray(page) || !page.every(isContributor)) {
      throw new Error('The contributors API returned an invalid response.')
    }

    records.push(...page)
    if (page.length < pageSize) break
    offset += pageSize
  }

  const contributorsByLogin = new Map<string, Contributor>()
  for (const record of records) {
    const key = record.login.toLowerCase()
    const existing = contributorsByLogin.get(key)
    if (existing) {
      existing.contributions += record.contributions
      existing.name ??= record.name
      existing.avatar_url ??= record.avatar_url
      existing.profile_url ||= record.profile_url
      existing.blog ??= record.blog
      existing.twitter_username ??= record.twitter_username
      existing.location ??= record.location
      existing.bio ??= record.bio
      existing.company ??= record.company
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
