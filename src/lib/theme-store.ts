import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem('osa-theme', theme)
  } catch {
    // localStorage unavailable (private mode): theme still applies for the session
  }
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('osa-theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // fall through to default
  }
  return 'dark' // spec default
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme: () => {
    applyTheme(get().theme === 'dark' ? 'light' : 'dark')
    set({ theme: get().theme === 'dark' ? 'light' : 'dark' })
  },
}))

// Sync the .dark class to the resolved theme on startup (index.html sets dark by default).
applyTheme(useThemeStore.getState().theme)
