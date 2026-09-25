import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

export interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  // Block all transitions for the flip so the theme snaps instantly instead of
  // cross-fading (cards/buttons use transition-all, which otherwise lags).
  root.classList.add('theme-switching')
  root.classList.toggle('dark', theme === 'dark')
  // Wait two frames (paint with new theme), then re-enable transitions.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'osa-theme',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)

// Decouple side-effect by subscribing to theme state changes
useThemeStore.subscribe((state) => {
  applyTheme(state.theme)
})

// Initialize theme on the root document
applyTheme(useThemeStore.getState().theme)
