import { create } from 'zustand'

export type UserRole = 'user' | 'admin'
export type AccountStatus = 'active' | 'suspended' | 'banned'

export interface User {
  id?: string
  username: string
  email: string
  role?: UserRole
  account_status?: AccountStatus
  accountStatus?: AccountStatus
  skill_level?: string
  user_context?: string
  github_username?: string
  avatar_url?: string
  token?: string
}

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<User>
  refreshCurrentUser: () => Promise<User | null>
  requestSignup: (
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<{ message: string }>
  verifySignupOtp: (email: string, otp: string, username?: string) => Promise<User>
  requestPasswordReset: (email: string) => Promise<{ message: string }>
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ message: string }>
  loginWithToken: (token: string, partialUser?: Partial<User>) => Promise<User>
  loginWithConnectedGitHub: () => Promise<User>
  getGitHubOAuthUrl: () => Promise<{ configured: boolean; url: string | null; has_pat: boolean }>
  updateUser: (partial: Partial<User>) => void
  logout: () => void
}

function toUser(parsed: Partial<User>): User | null {
  if (typeof parsed.username !== 'string' || typeof parsed.email !== 'string') return null
  const status = parsed.account_status || parsed.accountStatus || 'active'
  return {
    id: parsed.id,
    username: parsed.username,
    email: parsed.email,
    token: parsed.token,
    role: parsed.role === 'admin' ? 'admin' : 'user',
    account_status: status === 'suspended' || status === 'banned' ? status : 'active',
    accountStatus: status === 'suspended' || status === 'banned' ? status : 'active',
    skill_level: parsed.skill_level,
    user_context: parsed.user_context,
    github_username: parsed.github_username,
    avatar_url: parsed.avatar_url,
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
      return errObj.detail.map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item))).join(', ')
    }
    if (typeof errObj.message === 'string') return errObj.message
  }
  return fallback
}

async function fetchProfile(accessToken: string, fallback: User): Promise<User> {
  const response = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) return fallback
  const profile = await response.json()
  const status = profile.account_status || profile.accountStatus || fallback.account_status || 'active'
  return {
    id: profile.id,
    username: profile.username || fallback.username,
    email: profile.email || fallback.email,
    token: accessToken,
    role: profile.role === 'admin' ? 'admin' : 'user',
    account_status: status === 'suspended' || status === 'banned' ? status : 'active',
    accountStatus: status === 'suspended' || status === 'banned' ? status : 'active',
    skill_level: profile.skill_level || fallback.skill_level,
    user_context: profile.user_context || fallback.user_context,
    github_username: profile.github_username || fallback.github_username,
    avatar_url: profile.avatar_url || fallback.avatar_url,
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadUser(),
  token: loadToken(),

  updateUser: (partial: Partial<User>) => {
    const current = get().user
    if (!current) return
    const updated: User = { ...current, ...partial }
    persistSession(updated, get().token)
    set({ user: updated })
  },

  login: async (email, password) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => null), 'Invalid email or password'))
    const { access_token } = await res.json()
    const fallback: User = {
      username: email.split('@')[0] || 'contributor',
      email,
      token: access_token,
      role: 'user',
      account_status: 'active',
      accountStatus: 'active',
    }
    const user = await fetchProfile(access_token, fallback)
    persistSession(user, access_token)
    set({ user, token: access_token })
    return user
  },

  refreshCurrentUser: async () => {
    const token = loadToken()
    if (!token) {
      set({ user: null, token: null })
      return null
    }

    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        persistSession(null, null)
        set({ user: null, token: null })
        return null
      }

      const profile = await res.json()
      const status = profile.account_status || profile.accountStatus || 'active'
      const user: User = {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        role: profile.role === 'admin' ? 'admin' : 'user',
        account_status: status === 'suspended' || status === 'banned' ? status : 'active',
        accountStatus: status === 'suspended' || status === 'banned' ? status : 'active',
        token,
      }
      persistSession(user, token)
      set({ user, token })
      return user
    } catch {
      return loadUser()
    }
  },

  requestSignup: async (username, email, password, confirmPassword) => {
    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim() || undefined,
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
      }),
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
      account_status: 'active',
      accountStatus: 'active',
    }
    const user = await fetchProfile(access_token, fallback)
    persistSession(user, access_token)
    set({ user, token: access_token })
    return user
  },

  requestPasswordReset: async (email) => {
    const res = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => null), 'Could not send reset code'))
    return await res.json()
  },

  resetPassword: async (email, otp, newPassword) => {
    const res = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        new_password: newPassword,
      }),
    })
    if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => null), 'Could not reset password'))
    return await res.json()
  },

  loginWithToken: async (token: string, partialUser?: Partial<User>) => {
    const fallback: User = {
      username: partialUser?.username || 'developer',
      email: partialUser?.email || '',
      token,
      avatar_url: partialUser?.avatar_url,
      role: partialUser?.role || 'user',
      account_status: 'active',
      accountStatus: 'active',
    }
    const user = await fetchProfile(token, fallback)
    persistSession(user, token)
    set({ user, token })
    return user
  },

  getGitHubOAuthUrl: async () => {
    const res = await fetch('/api/v1/auth/github/url')
    if (!res.ok) {
      return { configured: false, url: null, has_pat: false }
    }
    return await res.json()
  },

  loginWithConnectedGitHub: async () => {
    const res = await fetch('/api/v1/auth/github/pat-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(extractErrorMessage(err, 'Failed to sign in via connected GitHub account'))
    }
    const { access_token } = await res.json()
    const fallback: User = {
      username: 'developer',
      email: '',
      token: access_token,
      role: 'user',
      account_status: 'active',
      accountStatus: 'active',
    }
    const user = await fetchProfile(access_token, fallback)
    persistSession(user, access_token)
    set({ user, token: access_token })
    return user
  },

  logout: () => {
    persistSession(null, null)
    set({ user: null, token: null })
  },
}))
