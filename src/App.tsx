import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import ProjectFinder from '@/components/ProjectFinder'
import Features from '@/components/Features'
import HowItWorks from '@/components/HowItWorks'
import Community from '@/components/Community'
import FinalCta from '@/components/FinalCta'
import Footer from '@/components/Footer'
import AuthDialog from '@/components/AuthDialog'
import BackToTop from '@/components/BackToTop'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

export default function App() {
  const [auth, setAuth] = useState<{ open: boolean; mode: 'login' | 'signup' }>({
    open: false,
    mode: 'login',
  })
  const openAuth = (mode: 'login' | 'signup') => setAuth({ open: true, mode })

  return (
    <QueryClientProvider client={queryClient}>
      <div id="top" className="relative min-h-screen bg-background font-sans text-foreground">
        <Nav onOpenAuth={openAuth} />
        <main>
          <Hero />
          <ProjectFinder />
          <Features />
          <HowItWorks />
          <Community onOpenAuth={openAuth} />
          <FinalCta onOpenAuth={openAuth} />
        </main>
        <Footer />
        <BackToTop />
        <AuthDialog
          open={auth.open}
          initialMode={auth.mode}
          onClose={() => setAuth((a) => ({ ...a, open: false }))}
        />
      </div>
    </QueryClientProvider>
  )
}
