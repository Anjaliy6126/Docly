import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Password strength indicator.
 */
function PasswordStrength({ password }) {
  const score = getPasswordScore(password)
  const levels = [
    { label: 'Weak', color: 'bg-status-down' },
    { label: 'Fair', color: 'bg-amber-400' },
    { label: 'Good', color: 'bg-accent' },
    { label: 'Strong', color: 'bg-status-ok' },
  ]

  if (!password) return null

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-nested">
        <div
          className={`h-full rounded-full transition-all duration-300 ${levels[score].color}`}
          style={{ width: `${((score + 1) / 4) * 100}%` }}
        />
      </div>
      <span className="text-xs text-muted">{levels[score].label}</span>
    </div>
  )
}

function getPasswordScore(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++
  return Math.min(Math.max(score - 1, 0), 3)
}

/**
 * Registration form following Stitch design system.
 * Includes confirmation password validation and automatic login.
 */
export function RegisterForm({ onSuccess }) {
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const nameRef = useRef(null)

  // Auto-focus name on mount
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const isFormValid =
    name.trim().length >= 2 &&
    email.includes('@') &&
    password.length >= 8 &&
    confirmPassword.length >= 8
  const passwordsMatch = password === confirmPassword
  const confirmError = confirmPassword.length > 0 && !passwordsMatch

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanName = name.trim()
    const cleanEmail = email.trim()

    // Client-side validation
    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name (at least 2 characters).')
      return
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      await register(cleanName, cleanEmail, password)
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-5">
        {/* Name field */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label
            htmlFor="register-name"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Full Name
          </label>
          <input
            id="register-name"
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Student"
            required
            autoComplete="name"
            minLength={2}
            maxLength={120}
            className={cn(
              'w-full rounded-xl border border-line bg-nested px-4 py-2.5 text-foreground placeholder:text-muted transition-colors duration-150',
              'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
            )}
          />
        </motion.div>

        {/* Email field */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label
            htmlFor="register-email"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Email Address
          </label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@university.edu"
            required
            autoComplete="email"
            className={cn(
              'w-full rounded-xl border border-line bg-nested px-4 py-2.5 text-foreground placeholder:text-muted transition-colors duration-150',
              'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
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
            htmlFor="register-password"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              className={cn(
                'w-full rounded-xl border border-line bg-nested px-4 py-2.5 pr-10 text-foreground placeholder:text-muted transition-colors duration-150',
                'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
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
          <PasswordStrength password={password} />
        </motion.div>

        {/* Confirm password field */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <label
            htmlFor="register-confirm-password"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
              minLength={8}
              className={cn(
                'w-full rounded-xl border border-line bg-nested px-4 py-2.5 pr-10 text-foreground placeholder:text-muted transition-colors duration-150',
                'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
                confirmError && 'border-status-down focus:border-status-down focus:ring-status-down'
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition-colors hover:bg-nested hover:text-secondary cursor-pointer"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          {confirmError && (
            <p className="mt-1.5 text-xs text-status-down">
              Passwords do not match.
            </p>
          )}
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
          disabled={submitting || !isFormValid || confirmError}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
            </>
          )}
        </motion.button>
      </div>
    </form>
  )
}