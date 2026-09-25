import { GitFork, Star, BookOpen, Users, Calendar } from 'lucide-react'
import { Card, CardContent, Badge } from '@/components/ui'
import type { GitHubUser } from '@/types/github'

interface ProfileSummaryProps {
  user: GitHubUser
  topLanguages: string[]
  totalStars: number
}

export function ProfileSummary({ user, topLanguages, totalStars }: ProfileSummaryProps) {
  const joinYear = new Date(user.created_at).getFullYear()

  return (
    <Card className="w-full">
      <CardContent className="p-5">
        <div className="flex items-start gap-5">
          <img
            src={user.avatar_url}
            alt={`${user.login}'s avatar`}
            className="w-16 h-16 rounded-md border border-border"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-primary-text truncate">
                {user.name || user.login}
              </h2>
              <span className="text-sm font-mono text-secondary-text">@{user.login}</span>
            </div>
            {user.bio && (
              <p className="text-sm text-secondary-text mt-1 line-clamp-2">{user.bio}</p>
            )}

            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <StatItem icon={<BookOpen size={14} aria-hidden="true" />} label="Repos" value={user.public_repos} />
              <StatItem icon={<Star size={14} aria-hidden="true" />} label="Stars" value={totalStars} />
              <StatItem icon={<Users size={14} aria-hidden="true" />} label="Followers" value={user.followers} />
              <StatItem icon={<GitFork size={14} aria-hidden="true" />} label="Following" value={user.following} />
              <StatItem icon={<Calendar size={14} aria-hidden="true" />} label="Joined" value={joinYear} />
            </div>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {topLanguages.map((lang) => (
                <Badge key={lang} variant="accent">
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-secondary-text">
      {icon}
      <span className="font-mono text-primary-text font-medium">{value.toLocaleString()}</span>
      <span>{label}</span>
    </div>
  )
}
