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
    confirmPassword: string
  ) => Promise<{ message: string }>
  verifySignupOtp: (email: string, otp: string, username?: string) => Promise<User>
  requestPasswordReset: (email: string) => Promise<{ message: string }>
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ message: string }>
  logout: () => void
}

function toUser(parsed: Partial<User>): User | null {
  if (typeof parsed.username !== 'string' || typeof parsed.email !== 'string') return null
  return {
    id: parsed.id,
    username: parsed.username,
    email: parsed.email,
    token: parsed.token,
    role: parsed.role === 'admin' ? 'admin' : 'user',
    accountStatus: parsed.accountStatus === 'suspended' || parsed.accountStatus === 'banned' ? parsed.accountStatus : 'active',
  }
}

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('osa-user')
    if (!raw) return null
    return toUser(JSON.parse(raw) as Partial<User>)
  } catch {
    return null
  }
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
    // best effort
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const errObj = data as Record<string, unknown>
    if (typeof errObj.detail === 'string') return errObj.detail
    if (Array.isArray(errObj.detail) && errObj.detail.length > 0) {
      return errObj.detail.map((item) => typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item)).join(', ')
    }
    if (typeof errObj.message === 'string') return errObj.message
  }
  return fallback
}

async function fetchProfile(accessToken: string, fallback: User): Promise<User> {
  const response = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) return fallback
  const profile = await response.json()
  return {
    id: profile.id,
    username: profile.username || fallback.username,
    email: profile.email || fallback.email,
    token: accessToken,
    role: profile.role === 'admin' ? 'admin' : 'user',
    accountStatus: profile.account_status === 'suspended' || profile.account_status === 'banned' ? profile.account_status : 'active',
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  token: loadToken(),

  login: async (email, password) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => null), 'Invalid email or password'))
    const { access_token } = await res.json()
    const fallback: User = { username: email.split('@')[0] || 'contributor', email, token: access_token, role: 'user', accountStatus: 'active' }
    const user = await fetchProfile(access_token, fallback)
    persistSession(user, access_token)
    set({ user, token: access_token })
    return user
  },

  requestSignup: async (username, email, password, confirmPassword) => {
    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() || undefined, email: email.trim().toLowerCase(), password, confirm_password: confirmPassword }),
    })
    if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => null), 'Could not initiate registration'))
    return await res.json()
  },

  verifySignupOtp: async (email, otp, username) => {
    const res = await fetch('/api/v1/auth/verify-signup-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
    })
    if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => null), 'Invalid or expired verification code'))
    const { access_token } = await res.json()
    const fallback: User = {
      username: username?.trim() || email.split('@')[0] || 'contributor',
      email: email.trim().toLowerCase(),
      token: access_token,
      role: 'user',
      accountStatus: 'active',
    }
    const user = await fetchProfile(access_token, fallback)
    persistSession(user, access_token)
    set({ user, token: access_token })
    return user
  },

  requestPasswordReset: async (email) => {
    const res = await fetch('/api/v1/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase() }) })
    if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => null), 'Could not send reset code'))
    return await res.json()
  },

  resetPassword: async (email, otp, newPassword) => {
    const res = await fetch('/api/v1/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim(), new_password: newPassword }) })
    if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => null), 'Could not reset password'))
    return await res.json()
  },

  logout: () => {
    persistSession(null, null)
    set({ user: null, token: null })
  },
}))
