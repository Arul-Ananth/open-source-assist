export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  bio: string | null
  public_repos: number
  followers: number
  following: number
  created_at: string
  html_url: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string | null
  topics: string[]
  open_issues_count: number
  updated_at: string
}

export interface SkillAssessment {
  language: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  score: number
  repos: number
  color: string
}

export interface RoadmapMilestone {
  id: number
  title: string
  description: string
  status: 'completed' | 'current' | 'upcoming' | 'locked'
  skills: string[]
  estimatedWeeks: number
}

export interface RecommendedProject {
  id: number
  name: string
  fullName: string
  description: string
  stars: number
  forks: number
  language: string
  difficulty: 'good-first-issue' | 'intermediate' | 'advanced'
  openIssues: number
  topics: string[]
  matchScore: number
  url: string
}
