import { cn } from '../../lib/utils'

/**
 * Shared button styles following Black + Red Cinematic AI design.
 */
const VARIANTS = {
  primary:
    'bg-gradient-to-r from-accent via-primary to-primary-indigo text-white border border-white/15 ' +
    'shadow-lg hover:shadow-[0_0_25px_rgba(229,9,20,0.5)] hover:border-accent/50 active:scale-[0.98]',
  ghost:
    'bg-raised/70 text-secondary border border-line ' +
    'hover:text-foreground hover:border-line-luminous hover:bg-raised active:scale-[0.98]',
  danger:
    'bg-raised/70 text-status-down border border-status-down/35 ' +
    'hover:bg-status-down/15 hover:border-status-down/60 active:scale-[0.98]',
  accent:
    'bg-gradient-to-r from-accent to-primary-indigo text-white border border-white/15 ' +
    'shadow-lg hover:shadow-[0_0_25px_rgba(255,30,30,0.55)] active:scale-[0.98]',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
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
        'transition-all duration-150 cursor-pointer select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  )
}
