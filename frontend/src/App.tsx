import { useState } from 'react'
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
