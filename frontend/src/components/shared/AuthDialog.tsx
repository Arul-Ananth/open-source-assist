import * as React from 'react'
import { ArrowLeft, ArrowRight, Check, GitBranch, KeyRound, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { Dialog, Button, Input } from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'

export type AuthMode = 'login' | 'signup'
export type AuthScreen = AuthMode | 'forgot' | 'verify-otp' | 'reset-password'

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
  const [generalError, setGeneralError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const [pendingEmail, setPendingEmail] = React.useState('')
  const [pendingUsername, setPendingUsername] = React.useState('')

  // Reset to the requested tab every time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setScreen(initialMode)
      setErrors({})
      setGeneralError(null)
      setSuccessMsg(null)
      setLoading(false)
    }
  }, [open, initialMode])

  const isLogin = screen === 'login'
  const isSignup = screen === 'signup'
  const isTabScreen = isLogin || isSignup

  const validate = (formData: FormData): boolean => {
    const next: Record<string, string> = {}

    const email = String(formData.get(`${screen}-email`) ?? '').trim()
    if (!email) {
      next[`${screen}-email`] = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next[`${screen}-email`] = 'Please enter a valid email address.'
    }

    if (isLogin) {
      const password = String(formData.get('login-password') ?? '')
      if (!password) {
        next['login-password'] = 'Password is required.'
      }
    }

    if (isSignup) {
      const username = String(formData.get('signup-username') ?? '').trim()
      if (!username) {
        next['signup-username'] = 'Username is required.'
      } else if (username.length < 3) {
        next['signup-username'] = 'At least 3 characters.'
      }

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGeneralError(null)
    setSuccessMsg(null)
    const formData = new FormData(e.currentTarget)
    if (!validate(formData)) return

    setLoading(true)
    try {
      if (screen === 'signup') {
        const username = String(formData.get('signup-username') ?? '').trim()
        const email = String(formData.get('signup-email') ?? '').trim()
        const password = String(formData.get('signup-password') ?? '')
        const confirm = String(formData.get('signup-confirm') ?? '')

        await useAuthStore.getState().requestSignup(username, email, password, confirm)
        setPendingEmail(email)
        setPendingUsername(username)
        setScreen('verify-otp')
      } else {
        const email = String(formData.get('login-email') ?? '').trim()
        const password = String(formData.get('login-password') ?? '')
        await useAuthStore.getState().login(email, password)
        onClose()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred. Please try again.'
      setGeneralError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGeneralError(null)
    const formData = new FormData(e.currentTarget)
    const otp = String(formData.get('signup-otp') ?? '').trim()

    if (!/^\d{6}$/.test(otp)) {
      setErrors({ 'signup-otp': 'Please enter a valid 6-digit verification code.' })
      return
    }

    setLoading(true)
    try {
      await useAuthStore.getState().verifySignupOtp(pendingEmail, otp, pendingUsername)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired code.'
      setGeneralError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGeneralError(null)
    const email = String(new FormData(e.currentTarget).get('forgot-email') ?? '').trim()

    if (!email) {
      setErrors({ 'forgot-email': 'Please enter your email.' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ 'forgot-email': 'Please enter a valid email address.' })
      return
    }

    setLoading(true)
    try {
      await useAuthStore.getState().requestPasswordReset(email)
      setPendingEmail(email)
      setScreen('reset-password')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request reset.'
      setGeneralError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGeneralError(null)
    const formData = new FormData(e.currentTarget)
    const otp = String(formData.get('reset-otp') ?? '').trim()
    const password = String(formData.get('reset-password') ?? '')
    const confirm = String(formData.get('reset-confirm') ?? '')

    const next: Record<string, string> = {}
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) next['reset-otp'] = 'Enter 6-digit verification code.'
    if (password.length < 8) next['reset-password'] = 'Use at least 8 characters.'
    else if (confirm !== password) next['reset-confirm'] = "Passwords don't match."

    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setLoading(true)
    try {
      await useAuthStore.getState().resetPassword(pendingEmail, otp, password)
      setSuccessMsg('Password reset successfully! Please log in.')
      switchTo('login')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password.'
      setGeneralError(message)
    } finally {
      setLoading(false)
    }
  }

  const switchTo = (next: AuthScreen) => {
    setErrors({})
    setGeneralError(null)
    setScreen(next)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabel={
        screen === 'forgot'
          ? 'Reset your password'
          : screen === 'reset-password'
            ? 'Set new password'
            : screen === 'verify-otp'
              ? 'Verify your email'
              : isLogin
                ? 'Log in to OpenSource Assist'
                : 'Create your OpenSource Assist account'
      }
      className="sm:max-h-[calc(100dvh-2.5rem)]"
    >
      <div className="auth-body p-5 sm:p-6">
        {/* Tab switcher — only shown on login/signup */}
        {isTabScreen && (
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

        {/* General error notification */}
        {generalError && (
          <div className="mt-3 animate-fade-in rounded-md border border-accent/40 bg-accent/10 p-2.5 text-xs font-medium text-accent-text">
            {generalError}
          </div>
        )}

        {/* Success notification */}
        {successMsg && (
          <div className="mt-3 flex items-center gap-2 animate-fade-in rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-xs font-medium text-emerald-400">
            <Check className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Verify-OTP form */}
        {screen === 'verify-otp' && (
          <div key="verify-otp" className="animate-fade-up">
            <button
              type="button"
              onClick={() => switchTo('signup')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-accent-text"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to sign up
            </button>
            <h2 className="mt-4 flex items-center gap-2 text-xl font-bold tracking-tight">
              <ShieldCheck className="size-5 text-accent-text" aria-hidden="true" />
              Verify your email
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              We sent a 6-digit verification code to{' '}
              <span className="font-semibold text-foreground">{pendingEmail}</span>.
              Enter it below to complete registration.
            </p>
            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4" noValidate>
              <Field
                label="6-Digit Verification Code"
                id="signup-otp"
                placeholder="123456"
                autoComplete="one-time-code"
                error={errors['signup-otp']}
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Verifying...' : 'Verify & Complete Signup'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        )}

        {/* Forgot-password form */}
        {screen === 'forgot' && (
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
              Enter the email you signed up with and we will send you a verification code to reset your password.
            </p>
            <form onSubmit={handleForgot} className="mt-5 space-y-4" noValidate>
              <Field
                label="Email"
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors['forgot-email']}
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending code...' : 'Send reset code'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        )}

        {/* Reset-password form */}
        {screen === 'reset-password' && (
          <div key="reset-password" className="animate-fade-up">
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
              Create new password
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Enter the 6-digit code sent to{' '}
              <span className="font-semibold text-foreground">{pendingEmail}</span> along with your new password.
            </p>
            <form onSubmit={handleResetPassword} className="mt-5 space-y-3" noValidate>
              <Field
                label="6-Digit Verification Code"
                id="reset-otp"
                placeholder="123456"
                autoComplete="one-time-code"
                error={errors['reset-otp']}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Didn't get the code?</span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    if (!pendingEmail) return
                    setGeneralError(null)
                    setLoading(true)
                    try {
                      await useAuthStore.getState().requestPasswordReset(pendingEmail)
                      setSuccessMsg(`A fresh reset code was sent to ${pendingEmail}`)
                    } catch (err: unknown) {
                      const message = err instanceof Error ? err.message : 'Could not resend code.'
                      setGeneralError(message)
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="font-medium text-accent-text hover:underline disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="New Password"
                  id="reset-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors['reset-password']}
                />
                <Field
                  label="Confirm"
                  id="reset-confirm"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors['reset-confirm']}
                />
              </div>
              <Button type="submit" disabled={loading} className="mt-2 w-full">
                {loading ? 'Resetting...' : 'Reset Password'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        )}

        {/* Login / signup tabpanel */}
        {isTabScreen && (
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
                  <button
                    type="button"
                    onClick={() => {
                      const emailInput = document.getElementById('login-email') as HTMLInputElement | null
                      const passwordInput = document.getElementById('login-password') as HTMLInputElement | null
                      if (emailInput) emailInput.value = 'demo@opensourceassist.dev'
                      if (passwordInput) passwordInput.value = 'Password123!'
                    }}
                    className="text-[11px] font-mono font-medium text-muted-foreground hover:text-accent-text transition-colors"
                    title="Fill pre-verified demo credentials"
                  >
                    ⚡ Fill Demo Login
                  </button>
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

              <Button type="submit" disabled={loading} className="h-9 w-full">
                {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}
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
          <span>secure connection · encrypted session</span>
          <span className="text-accent-text">v1.0</span>
        </p>
      </div>
    </Dialog>
  )
}

export default AuthDialog
