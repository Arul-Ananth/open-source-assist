import { create } from 'zustand'

export interface User {
  id?: string
  username: string
  email: string
  token?: string
}

interface AuthState {
  /** null = logged out. */
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<User>
  requestSignup: (
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<{ message: string }>
  verifySignupOtp: (email: string, otp: string, username?: string) => Promise<User>
  requestPasswordReset: (email: string) => Promise<{ message: string }>
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ message: string }>
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
      }
    }
  } catch {
    // localStorage unavailable or corrupt: treat as logged out
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
    // localStorage unavailable: session stays in memory only
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const errObj = data as Record<string, unknown>
    if (typeof errObj.detail === 'string') return errObj.detail
    if (Array.isArray(errObj.detail) && errObj.detail.length > 0) {
      return errObj.detail
        .map((item) =>
          typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item)
        )
        .join(', ')
    }
    if (typeof errObj.message === 'string') return errObj.message
  }
  return fallback
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  token: loadToken(),

  login: async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(extractErrorMessage(err, 'Invalid email or password'))
    }

    const { access_token } = await res.json()

    // Fetch user profile
    const meRes = await fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    let user: User = {
      username: email.split('@')[0] || 'contributor',
      email,
      token: access_token,
    }

    if (meRes.ok) {
      const profile = await meRes.json()
      user = {
        id: profile.id,
        username: profile.username || user.username,
        email: profile.email || email,
        token: access_token,
      }
    }

    persistSession(user, access_token)
    set({ user, token: access_token })
    return user
  },

  requestSignup: async (
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => {
    const trimmedUsername = username.trim()
    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: trimmedUsername || undefined,
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(extractErrorMessage(err, 'Could not initiate registration'))
    }

    return await res.json()
  },

  verifySignupOtp: async (email: string, otp: string, username?: string) => {
    const res = await fetch('/api/v1/auth/verify-signup-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(extractErrorMessage(err, 'Invalid or expired verification code'))
    }

    const { access_token } = await res.json()

    const user: User = {
      username: username?.trim() || email.split('@')[0] || 'contributor',
      email: email.trim().toLowerCase(),
      token: access_token,
    }

    persistSession(user, access_token)
    set({ user, token: access_token })
    return user
  },

  requestPasswordReset: async (email: string) => {
    const res = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(extractErrorMessage(err, 'Could not send reset code'))
    }

    return await res.json()
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const res = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        new_password: newPassword,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(extractErrorMessage(err, 'Could not reset password'))
    }

    return await res.json()
  },

  logout: () => {
    persistSession(null, null)
    set({ user: null, token: null })
  },
}))
