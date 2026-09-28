import { cn } from '../lib/utils'

const LABELS = {
  checking: 'Checking backend...',
  connected: 'Backend connected',
  offline: 'Backend offline',
}

/**
 * Real backend status indicator driven by GET /health.
 * connected -> green/cyan dot, offline -> muted/red dot,
 * checking  -> gently pulsing dot. Never fakes the state.
 */
export function SystemStatus({ status, className }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1.5',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-2 w-2 rounded-full',
          status === 'connected' && 'bg-status-ok',
          status === 'offline' && 'bg-status-down',
          status === 'checking' && 'bg-accent animate-pulse',
        )}
      />
      <span
        className={cn(
          'text-xs font-medium',
          status === 'connected' && 'text-secondary',
          status === 'offline' && 'text-muted',
          status === 'checking' && 'text-muted',
        )}
      >
        {LABELS[status]}
      </span>
    </div>
  )
}
