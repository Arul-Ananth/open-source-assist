export const CONTRIBUTOR_SCORE_PER_MERGED_PR = 10
export const CONTRIBUTORS_REPOSITORY = 'arul-Ananth/open-source-assist'

export interface ContributorPullRequest {
  number: number
  title: string
  html_url: string
  state: 'open' | 'closed'
  created_at: string
  merged_at: string | null
  draft: boolean
  user: {
    login: string
    avatar_url: string
    html_url: string
  } | null
}

export interface Contributor {
  login: string
  avatarUrl: string
  profileUrl: string
  rank: number
  mergedPRs: number
  score: number
  pullRequests: ContributorPullRequest[]
}

export type ContributorSortOrder = 'highest' | 'lowest' | 'alphabetical'

export async function fetchRepositoryPullRequests(
  signal?: AbortSignal,
): Promise<ContributorPullRequest[]> {
  const pullRequests: ContributorPullRequest[] = []
  let page = 1

  while (true) {
    const url = new URL(
      `https://api.github.com/repos/${CONTRIBUTORS_REPOSITORY}/pulls`,
    )
    url.searchParams.set('state', 'all')
    url.searchParams.set('per_page', '100')
    url.searchParams.set('page', String(page))

    const response = await fetch(url, {
      signal,
      headers: { Accept: 'application/vnd.github+json' },
    })

    if (!response.ok) {
      const isRateLimited =
        response.status === 403 &&
        response.headers.get('x-ratelimit-remaining') === '0'
      throw new Error(
        isRateLimited
          ? 'GitHub API rate limit reached. Please try again later.'
          : `Could not load pull requests from GitHub (HTTP ${response.status}).`,
      )
    }

    const pagePullRequests = (await response.json()) as ContributorPullRequest[]
    if (!Array.isArray(pagePullRequests)) {
      throw new Error('GitHub returned an invalid pull request response.')
    }

    pullRequests.push(...pagePullRequests)
    if (pagePullRequests.length < 100) return pullRequests
    page += 1
  }
}

export function buildContributorLeaderboard(
  pullRequests: ContributorPullRequest[],
): Contributor[] {
  const contributors = new Map<string, Contributor>()

  for (const pullRequest of pullRequests) {
    const author = pullRequest.user
    if (!author) continue

    const login = author.login.toLowerCase()
    let contributor = contributors.get(login)
    if (!contributor) {
      contributor = {
        login: author.login,
        avatarUrl: author.avatar_url,
        profileUrl: author.html_url,
        rank: 0,
        mergedPRs: 0,
        score: 0,
        pullRequests: [],
      }
      contributors.set(login, contributor)
    }

    contributor.pullRequests.push(pullRequest)
    if (pullRequest.merged_at && !pullRequest.draft) contributor.mergedPRs += 1
  }

  return [...contributors.values()]
    .filter((contributor) => contributor.mergedPRs > 0)
    .map((contributor) => ({
      ...contributor,
      score: contributor.mergedPRs * CONTRIBUTOR_SCORE_PER_MERGED_PR,
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.login.localeCompare(right.login),
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
    contributor.login.toLowerCase().includes(term),
  )

  if (sortOrder === 'lowest') {
    return filtered.sort(
      (left, right) =>
        left.mergedPRs - right.mergedPRs || left.login.localeCompare(right.login),
    )
  }
  if (sortOrder === 'alphabetical') {
    return filtered.sort((left, right) => left.login.localeCompare(right.login))
  }
  return filtered
}
