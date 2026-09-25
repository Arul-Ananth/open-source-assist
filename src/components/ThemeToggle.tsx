import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/store/theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md border border-border bg-surface text-secondary-text
        shadow-none hover:shadow-[4px_4px_0px_0px_rgba(var(--accent-rgb),0.3)]
        hover:text-primary-text transition-all duration-150 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
