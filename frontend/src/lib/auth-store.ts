import { create } from 'zustand'

export type UserRole = 'user' | 'admin'
export type AccountStatus = 'active' | 'suspended' | 'banned'

export interface User {
  id?: string
  username: string
  email: string
  token?: string
  role?: UserRole
  accountStatus?: AccountStatus
}

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<User>
  requestSignup: (
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<{ message: string }>
  verifySignupOtp: (email: string, otp: string, username?: string) => Promise<User>
  requestPasswordReset: (email: string) => Promise<{ message: string }>
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ message: string }>
  refreshCurrentUser: () => Promise<User | null>
  logout: () => void
}

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('osa-user')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<User>
    if (typeof parsed.username === 'string' && typeof parsed.email === 'string') {
      return {
        id: parsed.id,
        username: parsed.username,
        email: parsed.email,
        token: parsed.token,
        role: parsed.role === 'admin' ? 'admin' : parsed.role === 'user' ? 'user' : undefined,
        accountStatus:
          parsed.accountStatus === 'suspended' || parsed.accountStatus === 'banned'
            ? parsed.accountStatus
            : 'active',
      }
    }
  } catch {
    // Ignore malformed persisted sessions.
  }
  return null
}

function loadToken(): string | null {
  try {
    return localStorage.getItem('osa-token')
  } catch {
    return null
  }
}

function persistSession(user: User | null, token: string | null) {
  try {
    if (user && token) {
      localStorage.setItem('osa-user', JSON.stringify({ ...user, token }))
      localStorage.setItem('osa-token', token)
    } else {
      localStorage.removeItem('osa-user')
      localStorage.removeItem('osa-token')
    }
  } catch {
    // Session remains in memory when storage is unavailable.
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const error = data as Record<string, unknown>
    if (typeof error.detail === 'string') return error.detail
    if (Array.isArray(error.detail) && error.detail.length > 0) {
      return error.detail
        .map((item) =>
          typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item),
        )
        .join(', ')
    }
    if (typeof error.message === 'string') return error.message
  }
  return fallback
}

class ProfileRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

async function fetchProfile(token: string, fallbackEmail: string, fallbackUsername: string): Promise<User> {
  const response = await fetch('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new ProfileRequestError(response.status, extractErrorMessage(error, 'Could not load the user profile'))
  }
  const profile = await response.json()
  return {
    id: profile.id,
    username: profile.username || fallbackUsername,
    email: profile.email || fallbackEmail,
    token,
    role: profile.role === 'admin' ? 'admin' : 'user',
    accountStatus:
      profile.account_status === 'suspended' || profile.account_status === 'banned'
        ? profile.account_status
        : 'active',
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadUser(),
  token: loadToken(),

  login: async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(extractErrorMessage(error, 'Invalid email or password'))
    }

    const { access_token } = await response.json()
    const user = await fetchProfile(
      access_token,
      normalizedEmail,
      normalizedEmail.split('@')[0] || 'contributor',
    )
    persistSession(user, access_token)
    set({ user, token: access_token })
    return user
  },

  requestSignup: async (username, email, password, confirmPassword) => {
    const response = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim() || undefined,
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
      }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(extractErrorMessage(error, 'Could not initiate registration'))
    }
    return response.json()
  },

  verifySignupOtp: async (email, otp, username) => {
    const normalizedEmail = email.trim().toLowerCase()
    const response = await fetch('/api/v1/auth/verify-signup-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, otp: otp.trim() }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(extractErrorMessage(error, 'Invalid or expired verification code'))
    }
    const { access_token } = await response.json()
    const user = await fetchProfile(
      access_token,
      normalizedEmail,
      username?.trim() || normalizedEmail.split('@')[0] || 'contributor',
    )
    persistSession(user, access_token)
    set({ user, token: access_token })
    return user
  },

  requestPasswordReset: async (email) => {
    const response = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(extractErrorMessage(error, 'Could not send reset code'))
    }
    return response.json()
  },

  resetPassword: async (email, otp, newPassword) => {
    const response = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        new_password: newPassword,
      }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(extractErrorMessage(error, 'Could not reset password'))
    }
    return response.json()
  },

  refreshCurrentUser: async () => {
    const token = get().token
    const existingUser = get().user
    if (!token) return existingUser
    try {
      const user = await fetchProfile(
        token,
        existingUser?.email ?? 'contributor@example.com',
        existingUser?.username ?? 'contributor',
      )
      persistSession(user, token)
      set({ user, token })
      return user
    } catch (error) {
      if (error instanceof ProfileRequestError && (error.status === 401 || error.status === 403)) {
        persistSession(null, null)
        set({ user: null, token: null })
        return null
      }
      return existingUser
    }
  },

  logout: () => {
    persistSession(null, null)
    set({ user: null, token: null })
  },
}))
