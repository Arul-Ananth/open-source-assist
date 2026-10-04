import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from './auth-store'
import { useEffect } from 'react'

export interface GitHubUserProfile {
  username: string
  name: string
  avatar_url: string
  html_url: string
  bio: string
  company?: string | null
  location?: string | null
  public_repos: number
  followers: number
  following: number
  created_at: string
}

export interface GitHubUserStats {
  total_points: number
  streak_days: number
  merged_prs: number
  rank: string
  tier: string
  total_commits: number
  total_contributions: number
  total_repos: number
}

export interface GitHubLanguage {
  name: string
  count: number
  percentage: number
  color: string
}

export interface GitHubTopRepo {
  name: string
  full_name: string
  html_url: string
  description: string
  language: string
  stars: number
  forks: number
  updated_at: string
}

export interface GitHubBadge {
  id: string
  title: string
  description: string
  icon: string
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond'
  unlocked: boolean
  progress: number
  unlocked_at?: string | null
}

export interface GitHubRecentActivity {
  id: string
  type: string
  title: string
  repo: string
  repo_url: string
  detail: string
  timestamp: string
  time_display: string
  icon: string
}

export interface GitHubHeatmapDay {
  date: string
  count: number
  level: number
}

export interface GitHubUserFullData {
  profile: GitHubUserProfile
  stats: GitHubUserStats
  languages: GitHubLanguage[]
  top_repos: GitHubTopRepo[]
  badges: GitHubBadge[]
  recent_activity: GitHubRecentActivity[]
  heatmap: GitHubHeatmapDay[]
}

export function useGitHubUserProfile() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const username =
    user?.github_username ||
    (user?.username && !user.username.includes('@') ? user.username : null) ||
    (user?.email === 'a.arul.ananth.2006@gmail.com' ? 'Arul-Ananth' : null) ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'Arul-Ananth'

  const query = useQuery<GitHubUserFullData>({
    queryKey: ['github-user-profile', username],
    queryFn: async () => {
      const res = await fetch(`/api/v1/github/user-profile/${encodeURIComponent(username)}`)
      if (!res.ok) {
        throw new Error(`Failed to load GitHub user profile (HTTP ${res.status})`)
      }
      return await res.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Synchronize avatar_url into user store if available
  useEffect(() => {
    if (query.data?.profile?.avatar_url && user && user.avatar_url !== query.data.profile.avatar_url) {
      updateUser({ avatar_url: query.data.profile.avatar_url })
    }
  }, [query.data?.profile?.avatar_url, user, updateUser])

  return query
}
