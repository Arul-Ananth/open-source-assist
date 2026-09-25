import { useState, useEffect, useCallback } from 'react'
import { ThemeContext } from '@/store/theme'
import { RoadmapPage } from '@/pages/RoadmapPage'
import type { Theme } from '@/store/theme'

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    return stored || 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <RoadmapPage />
    </ThemeContext.Provider>
  )
}

export default App
