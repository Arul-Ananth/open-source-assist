import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HomePage } from '@/page'

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

  return (
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>
  )
}
