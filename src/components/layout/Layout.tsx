import * as React from 'react'
import { Nav } from './Nav'
import { Footer, type FooterProps } from './Footer'
import { BackToTop } from './BackToTop'
import { AuthDialog, type AuthMode } from '@/components/shared/AuthDialog'
import type { NavLink, FooterColumn } from '@/data'

export interface LayoutContextValue {
  openAuth: (mode: AuthMode) => void
}

const LayoutContext = React.createContext<LayoutContextValue | null>(null)

export function useLayout(): LayoutContextValue {
  const ctx = React.useContext(LayoutContext)
  if (!ctx) {
    throw new Error('useLayout must be used within a <Layout> provider.')
  }
  return ctx
}

export interface LayoutProps {
  children: React.ReactNode
  navLinks?: NavLink[]
  footerColumns?: FooterColumn[]
  footerProps?: FooterProps
  showFooter?: boolean
  showBackToTop?: boolean
}

export function Layout({
  children,
  navLinks,
  footerColumns,
  footerProps,
  showFooter = true,
  showBackToTop = true,
}: LayoutProps) {
  const [auth, setAuth] = React.useState<{ open: boolean; mode: AuthMode }>({
    open: false,
    mode: 'login',
  })
  const openAuth = React.useCallback((mode: AuthMode) => setAuth({ open: true, mode }), [])

  return (
    <LayoutContext.Provider value={{ openAuth }}>
      <div id="top" className="relative min-h-screen bg-background font-sans text-foreground">
        <Nav onOpenAuth={openAuth} links={navLinks} />
        <main>{children}</main>
        {showFooter && <Footer columns={footerColumns} {...footerProps} />}
        {showBackToTop && <BackToTop />}
        <AuthDialog
          open={auth.open}
          initialMode={auth.mode}
          onClose={() => setAuth((a) => ({ ...a, open: false }))}
        />
      </div>
    </LayoutContext.Provider>
  )
}

export default Layout
