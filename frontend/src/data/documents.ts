import type { ComponentType } from 'react'
import {
  GitCommit,
  GitFork,
  GitPullRequest,
  Heart,
  LifeBuoy,
  PenLine,
  Scale,
  Target,
  Trophy,
} from 'lucide-react'

/**
 * Curated catalog of real, official documentation for open source and GitHub.
 * Every entry links to the actual live docs — nothing is mocked.
 */

export type DocCategoryId =
  | 'getting-started'
  | 'git'
  | 'github'
  | 'pull-requests'
  | 'community'
  | 'writing'
  | 'programs'
  | 'legal'
  | 'help'

export interface DocCategory {
  id: DocCategoryId
  label: string
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
}

export const DOC_CATEGORIES: DocCategory[] = [
  { id: 'getting-started', label: 'Getting Started', Icon: Target },
  { id: 'git', label: 'Git', Icon: GitCommit },
  { id: 'github', label: 'GitHub', Icon: GitFork },
  { id: 'pull-requests', label: 'Pull Requests', Icon: GitPullRequest },
  { id: 'community', label: 'Community', Icon: Heart },
  { id: 'writing', label: 'Writing & Docs', Icon: PenLine },
  { id: 'programs', label: 'Programs & Events', Icon: Trophy },
  { id: 'legal', label: 'Licensing & Legal', Icon: Scale },
  { id: 'help', label: 'Support & Safety', Icon: LifeBuoy },
]

export interface DocEntry {
  title: string
  description: string
  url: string
  category: DocCategoryId
  source: string
  tags: string[]
}

export const DOCUMENTS: DocEntry[] = [
  // ---------- Getting Started ----------
  {
    title: 'GitHub Docs — Home',
    description: 'The official starting point for everything GitHub: guides, references and how-tos.',
    url: 'https://docs.github.com/',
    category: 'getting-started',
    source: 'GitHub',
    tags: ['github', 'official', 'docs', 'reference'],
  },
  {
    title: 'Hello World — GitHub Quickstart',
    description: 'GitHub\u2019s official 10-minute intro: create a repo, branch, commit and open a PR.',
    url: 'https://docs.github.com/en/get-started/start-your-journey/hello-world',
    category: 'getting-started',
    source: 'GitHub',
    tags: ['quickstart', 'beginner', 'first-pr', 'tutorial'],
  },
  {
    title: 'GitHub Quickstart for Newcomers',
    description: 'Set up Git, learn the daily workflow (clone → branch → commit → PR) in one guide.',
    url: 'https://docs.github.com/en/get-started/quickstart',
    category: 'getting-started',
    source: 'GitHub',
    tags: ['setup', 'git', 'workflow', 'beginner'],
  },
  {
    title: 'Set Up Git',
    description: 'Install and configure Git locally with your identity, SSH keys and default editor.',
    url: 'https://docs.github.com/en/get-started/getting-started-with-git/set-up-git',
    category: 'getting-started',
    source: 'GitHub',
    tags: ['install', 'ssh', 'configuration', 'setup'],
  },
  {
    title: 'Open Source Guides — How to Contribute',
    description: 'The classic guide on how to contribute to open source by GitHub\u2019s opensource.com team.',
    url: 'https://opensource.guide/how-to-contribute/',
    category: 'getting-started',
    source: 'Open Source Guides',
    tags: ['contribution', 'beginner', 'first-issue', 'etiquette'],
  },
  {
    title: 'First Contributions',
    description: 'Hands-on tutorial repo that walks you through your first PR in minutes.',
    url: 'https://github.com/firstcontributions/first-contributions',
    category: 'getting-started',
    source: 'firstcontributions',
    tags: ['hands-on', 'first-pr', 'practice', 'beginner'],
  },

  // ---------- Git ----------
  {
    title: 'Pro Git — The Book',
    description: 'The complete, free, official Git book. Chapters 2–3 cover everything daily work needs.',
    url: 'https://git-scm.com/book/en/v2',
    category: 'git',
    source: 'git-scm.com',
    tags: ['book', 'reference', 'branching', 'complete'],
  },
  {
    title: 'Git Reference Documentation',
    description: 'Full command reference for every git subcommand, straight from the source.',
    url: 'https://git-scm.com/docs',
    category: 'git',
    source: 'git-scm.com',
    tags: ['reference', 'commands', 'manual'],
  },
  {
    title: 'Learn Git Branching',
    description: 'Interactive visual playground — the best way to actually understand branches and rebasing.',
    url: 'https://learngitbranching.js.org/',
    category: 'git',
    source: 'learngitbranching.js.org',
    tags: ['interactive', 'branching', 'rebase', 'visual'],
  },
  {
    title: 'Resolving a Merge Conflict',
    description: 'Official step-by-step for understanding and resolving merge conflicts on GitHub.',
    url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line',
    category: 'git',
    source: 'GitHub',
    tags: ['merge-conflict', 'troubleshooting', 'command-line'],
  },
  {
    title: 'Undoing Things in Git',
    description: 'Amend, restore, reset and revert — fix mistakes safely at every stage.',
    url: 'https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things',
    category: 'git',
    source: 'git-scm.com',
    tags: ['undo', 'reset', 'revert', 'fix'],
  },
  {
    title: 'Rewriting History',
    description: 'Rebase, cherry-pick and amend like a pro — with the caveats for shared branches.',
    url: 'https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History',
    category: 'git',
    source: 'git-scm.com',
    tags: ['rebase', 'amend', 'history', 'advanced'],
  },

  // ---------- GitHub platform ----------
  {
    title: 'Understanding the GitHub Flow',
    description: 'The lightweight branch-based workflow used by most open source projects.',
    url: 'https://docs.github.com/en/get-started/using-github/github-flow',
    category: 'github',
    source: 'GitHub',
    tags: ['workflow', 'branching', 'best-practice'],
  },
  {
    title: 'About Issues',
    description: 'How to read, triage and use issues effectively — where every contribution starts.',
    url: 'https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues',
    category: 'github',
    source: 'GitHub',
    tags: ['issues', 'triage', 'planning'],
  },
  {
    title: 'GitHub Actions — Documentation',
    description: 'Automate builds, tests and releases. Official docs for CI/CD on GitHub.',
    url: 'https://docs.github.com/en/actions',
    category: 'github',
    source: 'GitHub',
    tags: ['ci', 'cd', 'automation', 'workflows'],
  },
  {
    title: 'About READMEs',
    description: 'Write a README that makes people want to use (and contribute to) your project.',
    url: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes',
    category: 'github',
    source: 'GitHub',
    tags: ['readme', 'markdown', 'project-setup'],
  },
  {
    title: 'Securing Your Repository',
    description: 'Dependabot, secret scanning and branch protection — the security essentials.',
    url: 'https://docs.github.com/en/code-security',
    category: 'github',
    source: 'GitHub',
    tags: ['security', 'dependabot', 'protection'],
  },

  // ---------- Pull Requests ----------
  {
    title: 'About Pull Requests',
    description: 'The core concept explained: what a PR is, how review and merge work.',
    url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests',
    category: 'pull-requests',
    source: 'GitHub',
    tags: ['pr', 'review', 'merge', 'core-concept'],
  },
  {
    title: 'Creating a Pull Request',
    description: 'Official walkthrough for opening a PR from a branch or a fork.',
    url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request',
    category: 'pull-requests',
    source: 'GitHub',
    tags: ['pr', 'fork', 'workflow', 'how-to'],
  },
  {
    title: 'Reviewing Changes in Pull Requests',
    description: 'How to review code politely and effectively — a skill for both sides of the PR.',
    url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests',
    category: 'pull-requests',
    source: 'GitHub',
    tags: ['review', 'feedback', 'collaboration'],
  },
  {
    title: 'Requesting a PR Review',
    description: 'How to ask for review, manage reviewers and keep your PR moving.',
    url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/requesting-a-pull-request-review',
    category: 'pull-requests',
    source: 'GitHub',
    tags: ['review', 'request', 'workflow'],
  },
  {
    title: 'Keeping Your Branch Up to Date',
    description: 'Sync a fork, rebase onto upstream, and keep PR diffs clean.',
    url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/keeping-your-branch-in-sync',
    category: 'pull-requests',
    source: 'GitHub',
    tags: ['sync', 'fork', 'upstream', 'rebase'],
  },

  // ---------- Community ----------
  {
    title: 'Building a Welcoming Community',
    description: 'Official GitHub guide to building healthy, growing open source communities.',
    url: 'https://docs.github.com/en/communities',
    category: 'community',
    source: 'GitHub',
    tags: ['community', 'moderation', 'growing'],
  },
  {
    title: 'Code of Conduct — Adding One',
    description: 'Why every project needs one and how to add it to your repo.',
    url: 'https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-code-of-conduct-to-your-project',
    category: 'community',
    source: 'GitHub',
    tags: ['code-of-conduct', 'safety', 'moderation'],
  },
  {
    title: 'Towns & Governance in Open Source',
    description: 'How real projects make decisions, from benevolent dictators to foundations.',
    url: 'https://opensource.guide/leadership-and-governance/',
    category: 'community',
    source: 'Open Source Guides',
    tags: ['governance', 'leadership', 'decisions'],
  },
  {
    title: 'Getting Paid for Open Source',
    description: 'Sponsorships, grants and funding models for sustainable open source work.',
    url: 'https://opensource.guide/getting-paid/',
    category: 'community',
    source: 'Open Source Guides',
    tags: ['funding', 'sponsors', 'sustainability'],
  },
  {
    title: 'Finding Users of Your Project',
    description: 'Growing adoption and building a user base around your project.',
    url: 'https://opensource.guide/building-community/',
    category: 'community',
    source: 'Open Source Guides',
    tags: ['adoption', 'growth', 'users'],
  },

  // ---------- Writing & Docs ----------
  {
    title: 'The Documentation System',
    description: 'The famous four-quadrant framework: tutorials, how-tos, reference and explanation.',
    url: 'https://documentation.divio.com/',
    category: 'writing',
    source: 'divio.com',
    tags: ['docs', 'structure', 'best-practice', 'framework'],
  },
  {
    title: 'Writing on GitHub',
    description: 'Markdown formatting, task lists, tables, math and alerts — the full reference.',
    url: 'https://docs.github.com/en/get-started/writing-on-github',
    category: 'writing',
    source: 'GitHub',
    tags: ['markdown', 'formatting', 'gfm', 'writing'],
  },
  {
    title: 'Starting an Open Source Project',
    description: 'Checklist for launching your own project the right way.',
    url: 'https://opensource.guide/starting-a-project/',
    category: 'writing',
    source: 'Open Source Guides',
    tags: ['new-project', 'launch', 'checklist'],
  },
  {
    title: 'Semantic Versioning',
    description: 'The MAJOR.MINOR.PATCH contract that keeps dependencies from breaking.',
    url: 'https://semver.org/',
    category: 'writing',
    source: 'semver.org',
    tags: ['versioning', 'releases', 'spec'],
  },
  {
    title: 'Keep a Changelog',
    description: 'How to write changelogs humans actually want to read.',
    url: 'https://keepachangelog.com/',
    category: 'writing',
    source: 'keepachangelog.com',
    tags: ['changelog', 'releases', 'communication'],
  },
  {
    title: 'Conventional Commits',
    description: 'A spec for commit messages that powers automated changelogs and releases.',
    url: 'https://www.conventionalcommits.org/',
    category: 'writing',
    source: 'conventionalcommits.org',
    tags: ['commits', 'spec', 'automation'],
  },

  // ---------- Programs & Events ----------
  {
    title: 'Google Summer of Code',
    description: 'The flagship program paying newcomers to contribute to open source orgs.',
    url: 'https://summerofcode.withgoogle.com/',
    category: 'programs',
    source: 'Google',
    tags: ['gsoc', 'internship', 'paid', 'program'],
  },
  {
    title: 'Hacktoberfest',
    description: 'DigitalOcean\u2019s month-long open source celebration every October.',
    url: 'https://hacktoberfest.com/',
    category: 'programs',
    source: 'DigitalOcean',
    tags: ['hacktoberfest', 'event', 'october', 'beginner'],
  },
  {
    title: 'Outreachy',
    description: 'Paid internships in open source for underrepresented groups.',
    url: 'https://www.outreachy.org/',
    category: 'programs',
    source: 'Software Freedom Conservancy',
    tags: ['internship', 'paid', 'diversity', 'program'],
  },
  {
    title: 'GitHub Campus Experts',
    description: 'Build open source communities on your campus with GitHub\u2019s support.',
    url: 'https://education.github.com/experts',
    category: 'programs',
    source: 'GitHub Education',
    tags: ['students', 'campus', 'leadership'],
  },
  {
    title: 'GitHub Student Developer Pack',
    description: 'Free tools, credits and services for student developers.',
    url: 'https://education.github.com/pack',
    category: 'programs',
    source: 'GitHub Education',
    tags: ['students', 'free', 'tools', 'credits'],
  },

  // ---------- Licensing & Legal ----------
  {
    title: 'Choose an Open Source License',
    description: 'The interactive license chooser used by most new projects.',
    url: 'https://choosealicense.com/',
    category: 'legal',
    source: 'GitHub',
    tags: ['license', 'mit', 'gpl', 'chooser'],
  },
  {
    title: 'Licensing a Repository',
    description: 'How to place a license file in your repo and what it means legally.',
    url: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository',
    category: 'legal',
    source: 'GitHub',
    tags: ['license', 'repository', 'legal'],
  },

  // ---------- Support & Safety ----------
  {
    title: 'GitHub Support',
    description: 'Official help portal for account, billing and platform issues.',
    url: 'https://support.github.com/',
    category: 'help',
    source: 'GitHub',
    tags: ['support', 'account', 'help'],
  },
  {
    title: 'GitHub Community Forum',
    description: 'Ask questions and share knowledge with other GitHub users.',
    url: 'https://github.community/',
    category: 'help',
    source: 'GitHub',
    tags: ['forum', 'questions', 'community'],
  },
  {
    title: 'Reporting Abuse or Spam',
    description: 'How to report abusive users, repos and content on GitHub.',
    url: 'https://docs.github.com/en/site-policy/github-terms/github-community-guidelines',
    category: 'help',
    source: 'GitHub',
    tags: ['abuse', 'reporting', 'safety', 'guidelines'],
  },
  {
    title: 'GitHub Status',
    description: 'Live status of GitHub services — check here before blaming your internet.',
    url: 'https://www.githubstatus.com/',
    category: 'help',
    source: 'GitHub',
    tags: ['status', 'outage', 'uptime'],
  },
]

/** Total number of documents, exported for header counts. */
export const DOCUMENTS_COUNT = DOCUMENTS.length
