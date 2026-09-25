export interface CommunityStat {
  value: string
  label: string
  /** Small change chip rendered next to the value. */
  delta?: string
  /** Weekly trend, last point matches the delta. */
  spark?: number[]
}

export const COMMUNITY_STATS: CommunityStat[] = [
  {
    value: '2,417',
    label: 'contributors so far',
    delta: '+38 this week',
    spark: [14, 18, 16, 24, 21, 28, 26, 34, 31, 38],
  },
  {
    value: '9,842',
    label: 'first issues matched',
    delta: '+214 this week',
  },
  { value: '312', label: 'badges awarded' },
  { value: '118', label: 'partner repositories' },
]

export const PARTNER_PROGRAMS: string[] = [
  'GSSoC',
  'GSoC',
  'Hacktoberfest',
  'LFX Mentorship',
  'MLH Fellowship',
  'Outreachy',
]

