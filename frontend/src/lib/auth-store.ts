import { create } from 'zustand'

export interface User {
  username: string
  email: string
}

interface AuthState {
  /** null = logged out. */
  user: User | null
  login: (email: string) => User
  signup: (username: string, email: string) => User
  logout: () => void
}

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('osa-user')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<User>
    if (typeof parsed.username === 'string' && typeof parsed.email === 'string') {
      return { username: parsed.username, email: parsed.email }
    }
  } catch {
    // localStorage unavailable or corrupt: treat as logged out
  }
  return null
}

function persistUser(user: User | null) {
  try {
    if (user) localStorage.setItem('osa-user', JSON.stringify(user))
    else localStorage.removeItem('osa-user')
  } catch {
    // localStorage unavailable: session stays in memory only
  }
}

/**
 * Simulated client-side auth (no backend yet).
 * Login/signup succeed instantly and persist to localStorage so a refresh
 * keeps the session. Swap the bodies of login/signup for real API calls later.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  login: (email) => {
    const user: User = { username: email.split('@')[0] || 'contributor', email }
    persistUser(user)
    set({ user })
    return user
  },
  signup: (username, email) => {
    const user: User = { username, email }
    persistUser(user)
    set({ user })
    return user
  },
  logout: () => {
    persistUser(null)
    set({ user: null })
  },
}))
