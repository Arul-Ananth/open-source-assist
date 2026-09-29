import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminPage, DashboardPage, HomePage } from '@/page'
import { useAuthStore } from '@/lib/auth-store'

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: (failureCount, error) => {
              if (error instanceof Error && error.message.toLowerCase().includes('rate limit')) {
                return false
              }
              return failureCount < 1
            },
          },
        },
      }),
  )
  const user = useAuthStore((s) => s.user)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    void useAuthStore.getState().refreshCurrentUser().finally(() => setSessionChecked(true))
  }, [])

  const handleLogout = () => {
    useAuthStore.getState().logout()
    window.scrollTo({ top: 0 })
    if (window.location.pathname.startsWith('/admin')) window.location.assign('/')
  }

  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

  return (
    <QueryClientProvider client={queryClient}>
      {!sessionChecked ? (
        <main className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
          Loading session…
        </main>
      ) : isAdminRoute ? (
        <AdminPage onLogout={handleLogout} />
      ) : user ? (
        <DashboardPage onLogout={handleLogout} />
      ) : (
        <HomePage />
      )}
    </QueryClientProvider>
  )
}
