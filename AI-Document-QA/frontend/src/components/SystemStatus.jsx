import { cn } from '../lib/utils'

const LABELS = {
  checking: 'Checking backend...',
  connected: 'Backend connected',
  offline: 'Backend offline',
}

/**
 * Real backend status indicator driven by GET /health:
 * connected -> emerald dot with glow
 * offline   -> red dot with glow
 * checking  -> cyan pulsing dot
 */
export function SystemStatus({ status, className }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-line bg-raised/70 px-3 py-1.5 backdrop-blur-md shadow-sm',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        {status === 'connected' && (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-ok opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-ok shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </>
        )}
        {status === 'offline' && (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-down shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
        )}
        {status === 'checking' && (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent shadow-[0_0_8px_rgba(255,30,30,0.8)]" />
          </>
        )}
      </span>
      <span
        className={cn(
          'text-[11px] font-mono font-medium',
          status === 'connected' && 'text-secondary',
          status === 'offline' && 'text-status-down',
          status === 'checking' && 'text-accent'
        )}
      >
        {LABELS[status]}
      </span>
    </div>
  )
}
