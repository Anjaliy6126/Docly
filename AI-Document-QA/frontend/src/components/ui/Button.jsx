import { cn } from '../../lib/utils'

/**
 * Shared button styles following the Stitch design system.
 * variant="primary" — blue/indigo base, restrained cyan glow on hover
 * variant="ghost"   — dark raised surface, subtle border
 */
const VARIANTS = {
  primary:
    'bg-primary text-white border border-white/10 ' +
    'hover:bg-primary-indigo hover:shadow-[0_0_20px_rgb(56_189_248/0.25)]',
  ghost:
    'bg-raised text-secondary border border-line ' +
    'hover:text-foreground hover:border-line-luminous',
  danger:
    'bg-raised text-status-down border border-status-down/40 ' +
    'hover:bg-status-down/10 hover:border-status-down/60',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-colors duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}
