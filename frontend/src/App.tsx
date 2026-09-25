import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage, HomePage } from '@/page'
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
  }

  // Signed-in users land on the dashboard instead of the marketing page.
  if (user) {
    return (
      <QueryClientProvider client={queryClient}>
        <DashboardPage onLogout={handleLogout} />
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>
  )
}
