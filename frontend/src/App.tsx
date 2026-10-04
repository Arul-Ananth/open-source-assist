import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminPage, DashboardPage, HomePage } from '@/page'
import { useAuthStore } from '@/lib/auth-store'

export default function App() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: (failureCount, error) => { if (error instanceof Error && error.message.toLowerCase().includes('rate limit')) return false; return failureCount < 1 } } } }))
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthToken = params.get('oauth_token') || params.get('token')
    const username = params.get('username') || undefined
    const email = params.get('email') || undefined
    const avatarUrl = params.get('avatar_url') || undefined
    const oauthError = params.get('oauth_error')

    if (oauthToken) {
      void useAuthStore.getState().loginWithToken(oauthToken, { username, email, avatar_url: avatarUrl })
      const url = new URL(window.location.href)
      url.searchParams.delete('oauth_token')
      url.searchParams.delete('token')
      url.searchParams.delete('username')
      url.searchParams.delete('email')
      url.searchParams.delete('avatar_url')
      window.history.replaceState({}, document.title, url.pathname + url.search)
    } else if (oauthError) {
      console.error('GitHub OAuth failed:', oauthError)
      const url = new URL(window.location.href)
      url.searchParams.delete('oauth_error')
      window.history.replaceState({}, document.title, url.pathname + url.search)
    } else {
      void useAuthStore.getState().refreshCurrentUser()
    }
  }, [])

  const handleLogout = () => {
    useAuthStore.getState().logout()
    window.scrollTo({ top: 0 })
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      window.location.assign('/')
    }
  }

  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

  return (
    <QueryClientProvider client={queryClient}>
      {isAdminRoute ? (
        <AdminPage onLogout={handleLogout} />
      ) : user ? (
        <DashboardPage onLogout={handleLogout} />
      ) : (
        <HomePage />
      )}
    </QueryClientProvider>
  )
}
