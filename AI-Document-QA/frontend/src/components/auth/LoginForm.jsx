import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Login form following Stitch design system.
 */
export function LoginForm({ onSuccess }) {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const formRef = useRef(null)
  const emailRef = useRef(null)

  // Auto-focus email on mount
  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Please enter your email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setSubmitting(true)

    try {
      const result = await login(cleanEmail, password)
      if (result?.user) {
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Login failed. Please check your credentials and try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <div className="space-y-5">
        {/* Email field */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label
            htmlFor="login-email"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Email Address
          </label>
          <input
            id="login-email"
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@university.edu"
            required
            autoComplete="email"
            className={cn(
              'w-full rounded-xl border border-line bg-nested px-4 py-2.5 text-foreground placeholder:text-muted transition-colors duration-150',
              'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
              error && 'border-status-down focus:border-status-down focus:ring-status-down'
            )}
          />
        </motion.div>

        {/* Password field */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label
            htmlFor="login-password"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className={cn(
                'w-full rounded-xl border border-line bg-nested px-4 py-2.5 pr-10 text-foreground placeholder:text-muted transition-colors duration-150',
                'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
                error && 'border-status-down focus:border-status-down focus:ring-status-down'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition-colors hover:bg-nested hover:text-secondary cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-status-down/40 bg-status-down/10 px-4 py-2.5 text-sm text-status-down"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </motion.div>
        )}

        {/* Submit button */}
        <motion.button
          type="submit"
          disabled={submitting || !email || !password}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={cn(
            'group relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-white shadow-lg',
            'transition-all duration-150 cursor-pointer',
            'hover:bg-primary-indigo hover:shadow-[0_0_25px_rgba(229,9,20,0.55)]',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
            </>
          )}
        </motion.button>
      </div>
    </form>
  )
}