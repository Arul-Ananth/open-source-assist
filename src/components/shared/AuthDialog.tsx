import * as React from 'react'
import { ArrowLeft, ArrowRight, Check, GitBranch, KeyRound, LogIn, UserPlus } from 'lucide-react'
import { Dialog, Button, Input } from '@/components/ui'

export type AuthMode = 'login' | 'signup'
export type AuthScreen = AuthMode | 'forgot'

export interface AuthDialogProps {
  open: boolean
  onClose: () => void
  /** Which tab is shown when the dialog opens. */
  initialMode?: AuthMode
}

function Field(props: {
  label: string
  id: string
  type?: string
  placeholder: string
  autoComplete?: string
  required?: boolean
  hint?: React.ReactNode
  error?: string | null
  inputRef?: React.Ref<HTMLInputElement>
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={props.id} className="block text-[11px] font-semibold text-foreground">
        {props.label}
      </label>
      <Input
        ref={props.inputRef}
        id={props.id}
        name={props.id}
        type={props.type ?? 'text'}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        required={props.required ?? true}
        error={props.error}
      />
      {props.hint && !props.error && (
        <p className="text-[11px] leading-snug text-muted-foreground">{props.hint}</p>
      )}
      {props.error && (
        <p className="animate-fade-in text-[11px] font-medium text-accent-text">{props.error}</p>
      )}
    </div>
  )
}

export function AuthDialog({ open, onClose, initialMode = 'login' }: AuthDialogProps) {
  const [screen, setScreen] = React.useState<AuthScreen>(initialMode)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [sentTo, setSentTo] = React.useState<string | null>(null)
  const [showSent, setShowSent] = React.useState(false)

  // Reset to the requested tab every time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setScreen(initialMode)
      setErrors({})
      setSentTo(null)
    }
  }, [open, initialMode])

  const isLogin = screen === 'login'
  const isSignup = screen === 'signup'

  const validate = (formData: FormData): boolean => {
    const next: Record<string, string> = {}

    if (isSignup) {
      const username = String(formData.get('signup-username') ?? '').trim()
      if (username.length < 3) next['signup-username'] = 'At least 3 characters.'

      const password = String(formData.get('signup-password') ?? '')
      const confirm = String(formData.get('signup-confirm') ?? '')
      if (password.length < 8) {
        next['signup-password'] = 'Use at least 8 characters.'
      } else if (confirm !== password) {
        next['signup-confirm'] = "Passwords don't match."
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    if (!validate(formData)) return
    // Real authentication integration point
    onClose()
  }

  const handleForgot = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('forgot-email') as string
    setSentTo(email)
    setShowSent(true)
  }

  const switchTo = (next: AuthScreen) => {
    setErrors({})
    setSentTo(null)
    setShowSent(false)
    setScreen(next)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabel={
        screen === 'forgot'
          ? 'Reset your password'
          : isLogin
            ? 'Log in to OpenSource Assist'
            : 'Create your OpenSource Assist account'
      }
      className="sm:max-h-[calc(100dvh-2.5rem)]"
    >
      <div className="auth-body p-5 sm:p-6">
        {/* Tab switcher — hidden while the forgot-password screen is open */}
        {screen !== 'forgot' && (
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 gap-0 rounded-lg border border-border bg-background p-1"
          >
            <button
              type="button"
              role="tab"
              id="tab-login"
              aria-controls="panel-auth"
              aria-selected={isLogin}
              onClick={() => switchTo('login')}
              className={`inline-flex h-8 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isLogin ? 'bg-accent text-on-accent shadow-accent-glow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn className="size-4" aria-hidden="true" />
              Log in
            </button>
            <button
              type="button"
              role="tab"
              id="tab-signup"
              aria-controls="panel-auth"
              aria-selected={isSignup}
              onClick={() => switchTo('signup')}
              className={`inline-flex h-8 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isSignup ? 'bg-accent text-on-accent shadow-accent-glow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Sign up
            </button>
          </div>
        )}

        {/* Forgot-password success state */}
        {screen === 'forgot' && showSent && (
          <div key="sent" className="animate-fade-up py-8 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent-text">
              <Check className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-bold tracking-tight">Check your inbox</h2>
            <p className="mx-auto mt-2 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
              We sent a reset link to <span className="font-semibold text-foreground">{sentTo}</span>.
              It expires in 30 minutes.
            </p>
            <Button variant="secondary" size="sm" className="mt-6" onClick={() => switchTo('login')}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to log in
            </Button>
          </div>
        )}

        {/* Forgot-password form */}
        {screen === 'forgot' && !showSent && (
          <div key="forgot" className="animate-fade-up">
            <button
              type="button"
              onClick={() => switchTo('login')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-accent-text"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to log in
            </button>
            <h2 className="mt-4 flex items-center gap-2 text-xl font-bold tracking-tight">
              <KeyRound className="size-5 text-accent-text" aria-hidden="true" />
              Reset your password
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Enter the email you signed up with and we'll send you a reset link.
            </p>
            <form onSubmit={handleForgot} className="mt-5 space-y-4">
              <Field
                label="Email"
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
              <Button type="submit" className="w-full">
                Send reset link
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        )}

        {/* Login / signup tabpanel */}
        {isForgotScreen(screen) && (
          <div
            key={screen}
            id="panel-auth"
            role="tabpanel"
            aria-labelledby={isLogin ? 'tab-login' : 'tab-signup'}
            className="animate-fade-up"
          >
            <h2 className="mt-4 text-xl font-bold tracking-tight">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="auth-desc mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {isLogin
                ? 'Log in to track quests, badges and your roadmap.'
                : 'Join free — save favorite repos and track your first merged PR.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-3 space-y-3" noValidate>
              {isSignup && (
                <Field
                  label="Username"
                  id="signup-username"
                  placeholder="octocat"
                  autoComplete="username"
                  error={errors['signup-username']}
                />
              )}
              <Field
                label="Email"
                id={`${screen}-email`}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors[`${screen}-email`]}
              />
              {isSignup ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Password"
                    id={`${screen}-password`}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    error={errors[`${screen}-password`]}
                  />
                  <Field
                    label="Confirm"
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    error={errors['signup-confirm']}
                  />
                </div>
              ) : (
                <Field
                  label="Password"
                  id={`${screen}-password`}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={errors[`${screen}-password`]}
                />
              )}

              {isLogin && (
                <div className="flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" className="size-3.5 rounded accent-accent" />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => switchTo('forgot')}
                    className="text-xs font-medium text-accent-text hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {isSignup && (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  <span className="font-mono text-[10px] font-semibold text-accent-text">min 8 chars</span>{' '}
                  · By signing up you agree to our{' '}
                  <a href="#" className="font-medium text-accent-text hover:underline">
                    Terms
                  </a>{' '}
                  and{' '}
                  <a href="#" className="font-medium text-accent-text hover:underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              )}

              <Button type="submit" className="h-9 w-full">
                {isLogin ? 'Log in' : 'Create account'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </form>

            {/* Divider + GitHub OAuth */}
            <div className="mt-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="secondary" className="mt-2.5 h-9 w-full">
              <GitBranch className="size-4" aria-hidden="true" />
              Continue with GitHub
            </Button>

            <p className="auth-switch mt-3 text-center text-xs text-muted-foreground">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchTo(isLogin ? 'signup' : 'login')}
                className="font-semibold text-accent-text hover:underline"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Footer strip */}
      <div className="auth-footer border-t border-border px-6 py-2.5 sm:px-7">
        <p className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>credentials never leave your browser</span>
          <span className="text-accent-text">v1.0</span>
        </p>
      </div>
    </Dialog>
  )
}

function isForgotScreen(screen: AuthScreen): screen is 'login' | 'signup' {
  return screen !== 'forgot'
}

export default AuthDialog

