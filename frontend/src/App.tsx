import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminPage, DashboardPage, HomePage } from '@/page'
import { useAuthStore } from '@/lib/auth-store'

export default function App() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: (failureCount, error) => { if (error instanceof Error && error.message.toLowerCase().includes('rate limit')) return false; return failureCount < 1 } } } }))
  const user = useAuthStore((s) => s.user)

  const handleLogout = () => {
    useAuthStore.getState().logout()
    window.scrollTo({ top: 0 })
  }

  if (user && window.location.pathname.startsWith('/admin')) {
    return <QueryClientProvider client={queryClient}><AdminPage onLogout={handleLogout} /></QueryClientProvider>
  }

  if (user) {
    return <QueryClientProvider client={queryClient}><DashboardPage onLogout={handleLogout} /></QueryClientProvider>
  }

  return <QueryClientProvider client={queryClient}><HomePage /></QueryClientProvider>
}
