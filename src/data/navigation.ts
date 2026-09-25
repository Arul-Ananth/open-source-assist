export interface NavLink {
  href: string
  label: string
}

export interface FooterLink {
  label: string
  href: string
  external?: boolean
}

export interface FooterColumn {
  heading: string
  links: FooterLink[]
}

export const NAV_LINKS: NavLink[] = [
  { href: '/#finder', label: 'Explore' },
  { href: '/#modules', label: 'Modules' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#community', label: 'Community' },
]

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Modules',
    links: [
      { label: 'Explore', href: '/#finder' },
      { label: 'AI Roadmap', href: '/#modules' },
      { label: 'Quests & Rewards', href: '/#modules' },
      { label: 'Events', href: '/#modules' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'Forum', href: '/#modules' },
      { label: 'GitHub', href: 'https://github.com', external: true },
      { label: 'Discord', href: 'https://discord.com', external: true },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Profile overview', href: '/#modules' },
      { label: 'AI chatbot', href: '/#modules' },
    ],
  },
]

