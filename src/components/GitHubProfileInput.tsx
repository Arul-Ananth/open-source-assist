import { useState } from 'react'
import { Search, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface GitHubProfileInputProps {
  onSubmit: (username: string) => void
  isLoading: boolean
}

export function GitHubProfileInput({ onSubmit, isLoading }: GitHubProfileInputProps) {
  const [username, setUsername] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) {
      onSubmit(username.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <User
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
            size={18}
            aria-hidden="true"
          />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter GitHub username"
            className="w-full rounded-md border border-border bg-surface text-primary-text pl-10 pr-4 py-2.5 text-sm font-mono
              placeholder:text-secondary-text/60
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
              shadow-none transition-shadow duration-150
              hover:shadow-[4px_4px_0px_0px_rgba(var(--accent-rgb),0.3)]"
            aria-label="GitHub username"
          />
        </div>
        <Button type="submit" disabled={!username.trim() || isLoading}>
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Search size={16} aria-hidden="true" />
          )}
          <span>{isLoading ? 'Analyzing...' : 'Analyze'}</span>
        </Button>
      </div>
    </form>
  )
}
