import { FileText, GraduationCap, MessagesSquare, LayoutDashboard, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { SystemStatus } from '../SystemStatus'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'chats', label: 'Chats', icon: MessagesSquare },
]

/**
 * Dark application sidebar: brand, navigation, backend status footer.
 * On mobile it is rendered as a slide-over panel (open/close handled
 * by AppShell).
 */
export function Sidebar({ activeItem, onNavigate, mobileOpen, onCloseMobile, status }) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          // Mobile: fixed slide-over. Desktop (>=768px): static column.
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface',
          'transition-transform duration-200 md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-line px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-accent">
            <GraduationCap size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-bold tracking-tight text-foreground">
              Campus Intelligence
            </p>
            <p className="truncate text-xs text-muted">AI Document Q&amp;A</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 text-muted hover:bg-nested hover:text-foreground md:hidden"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4" aria-label="Application sections">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = item.id === activeItem
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-sm font-medium',
                      'transition-colors duration-150 cursor-pointer',
                      active
                        ? 'border-l-accent bg-raised text-foreground'
                        : 'border-l-transparent text-secondary hover:bg-raised hover:text-foreground',
                    )}
                  >
                    <Icon
                      size={18}
                      aria-hidden="true"
                      className={cn(active ? 'text-accent' : 'text-muted')}
                    />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Backend status footer */}
        <div className="border-t border-line px-4 py-4">
          <SystemStatus status={status} />
        </div>
      </aside>
    </>
  )
}
