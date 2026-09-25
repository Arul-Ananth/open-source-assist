import type { GitHubUser, SkillAssessment, RoadmapMilestone, RecommendedProject } from '@/types/github'

export const mockUser: GitHubUser = {
  login: 'octocat',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
  name: 'The Octocat',
  bio: 'Full-stack developer passionate about open source. Building tools that make developers more productive.',
  public_repos: 42,
  followers: 12400,
  following: 9,
  created_at: '2011-01-25T18:44:36Z',
  html_url: 'https://github.com/octocat',
}

export const mockTopLanguages = ['TypeScript', 'Python', 'Rust', 'Go', 'JavaScript']

export const mockTotalStars = 3847

export const mockSkills: SkillAssessment[] = [
  { language: 'TypeScript', level: 'advanced', score: 82, repos: 18, color: '#3178c6' },
  { language: 'Python', level: 'intermediate', score: 64, repos: 12, color: '#3776ab' },
  { language: 'Rust', level: 'beginner', score: 28, repos: 3, color: '#dea584' },
  { language: 'Go', level: 'intermediate', score: 55, repos: 7, color: '#00add8' },
  { language: 'JavaScript', level: 'expert', score: 91, repos: 24, color: '#f7df1e' },
  { language: 'React', level: 'advanced', score: 78, repos: 15, color: '#61dafb' },
]

export const mockMilestones: RoadmapMilestone[] = [
  {
    id: 1,
    title: 'Find Your First Issue',
    description: 'Browse good-first-issue labels in projects that match your skill set. Start with documentation fixes or small bug patches.',
    status: 'completed',
    skills: ['Git', 'GitHub', 'Communication'],
    estimatedWeeks: 1,
  },
  {
    id: 2,
    title: 'Submit Your First PR',
    description: 'Fork a repository, create a branch, make your changes and open a pull request. Learn the code review process.',
    status: 'completed',
    skills: ['Git Workflow', 'Code Review', 'Testing'],
    estimatedWeeks: 2,
  },
  {
    id: 3,
    title: 'Contribute to a TypeScript Project',
    description: 'Based on your strongest skill, contribute a feature or fix to a TypeScript open-source project with active maintainers.',
    status: 'current',
    skills: ['TypeScript', 'React', 'Node.js'],
    estimatedWeeks: 3,
  },
  {
    id: 4,
    title: 'Expand to Rust Ecosystem',
    description: 'Level up your Rust skills by contributing to beginner-friendly Rust projects. Focus on CLI tools and libraries.',
    status: 'upcoming',
    skills: ['Rust', 'CLI', 'Systems Programming'],
    estimatedWeeks: 4,
  },
  {
    id: 5,
    title: 'Become a Regular Contributor',
    description: 'Establish yourself as a recurring contributor to 2-3 projects. Participate in issue triage and review other PRs.',
    status: 'upcoming',
    skills: ['Code Review', 'Mentoring', 'Architecture'],
    estimatedWeeks: 6,
  },
  {
    id: 6,
    title: 'Maintain Your Own Project',
    description: 'Create and maintain an open-source project that solves a real problem. Build a community around it.',
    status: 'locked',
    skills: ['Project Management', 'Documentation', 'CI/CD'],
    estimatedWeeks: 8,
  },
]

export const mockProjects: RecommendedProject[] = [
  {
    id: 1,
    name: 'shadcn-ui',
    fullName: 'shadcn/ui',
    description: 'Beautifully designed components that you can copy and paste into your apps.',
    stars: 74200,
    forks: 4500,
    language: 'TypeScript',
    difficulty: 'intermediate',
    openIssues: 342,
    topics: ['react', 'tailwind', 'components'],
    matchScore: 95,
    url: 'https://github.com/shadcn-ui/ui',
  },
  {
    id: 2,
    name: 'astro',
    fullName: 'withastro/astro',
    description: 'The web framework for content-driven websites. Build fast, content-focused websites.',
    stars: 48600,
    forks: 2500,
    language: 'TypeScript',
    difficulty: 'good-first-issue',
    openIssues: 189,
    topics: ['framework', 'ssg', 'javascript'],
    matchScore: 88,
    url: 'https://github.com/withastro/astro',
  },
  {
    id: 3,
    name: 'tauri',
    fullName: 'tauri-apps/tauri',
    description: 'Build smaller, faster, and more secure desktop and mobile applications with a web frontend.',
    stars: 87300,
    forks: 2700,
    language: 'Rust',
    difficulty: 'advanced',
    openIssues: 456,
    topics: ['rust', 'desktop', 'webview'],
    matchScore: 72,
    url: 'https://github.com/tauri-apps/tauri',
  },
  {
    id: 4,
    name: 'hono',
    fullName: 'honojs/hono',
    description: 'Web framework built on Web Standards. Fast, lightweight, and works on any runtime.',
    stars: 22800,
    forks: 640,
    language: 'TypeScript',
    difficulty: 'good-first-issue',
    openIssues: 78,
    topics: ['web', 'serverless', 'edge'],
    matchScore: 84,
    url: 'https://github.com/honojs/hono',
  },
]
