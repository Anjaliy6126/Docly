import { Menu } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Application shell: sidebar (left) + main workspace (center).
 * Below the md breakpoint the sidebar becomes a slide-over panel
 * controlled by a hamburger button in the top bar.
 */
export function AppShell({ sidebar, children }) {
  const { mobileOpen, onOpenMobile } = sidebar

  return (
    <div className="flex min-h-screen bg-canvas text-foreground">
      {sidebar.element}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — mobile only */}
        <header
          className={cn(
            'flex items-center gap-3 border-b border-line bg-surface px-4 py-3 md:hidden',
            mobileOpen && 'opacity-50',
          )}
        >
          <button
            type="button"
            className="rounded-lg border border-line bg-raised p-2 text-secondary hover:text-foreground"
            onClick={onOpenMobile}
            aria-label="Open navigation"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <span className="font-heading text-sm font-bold">Campus Intelligence</span>
        </header>

        {/* Main workspace */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 lg:px-12">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
