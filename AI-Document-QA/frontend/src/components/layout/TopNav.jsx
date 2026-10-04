import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  MessagesSquare,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { SystemStatus } from '../SystemStatus'
import { motion, AnimatePresence } from 'motion/react'
import doclyLogo from '../../assets/docly-logo.png'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'chats', label: 'Chats', icon: MessagesSquare },
]

/**
 * Modern Horizontal Top Navigation Bar (Black + Red Cinematic Theme):
 * - Left: Glowing brand logo & titles
 * - Center: Horizontal pill navigation items with active red glow
 * - Right: System status, user profile & logout
 * - Mobile: Responsive hamburger dropdown
 */
export function TopNav({ activeItem, onNavigate, user, onLogout, status }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const displayName = user?.name || 'Student'
  const displayEmail = user?.email || ''
  const initials = displayName.slice(0, 2).toUpperCase()

  const handleNavClick = (id) => {
    onNavigate(id)
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-surface/90 backdrop-blur-2xl shadow-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── Left: Brand ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden border border-accent/30 shadow-[0_0_18px_rgba(229,9,20,0.3)]">
            <img
              src={doclyLogo}
              alt="DOCly logo"
              className="h-full w-full object-cover"
              draggable={false}
            />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent border-2 border-canvas" />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-sm font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground via-slate-100 to-secondary bg-clip-text text-transparent">
              DOCly
            </span>
            <span className="text-[10px] text-muted font-mono leading-none hidden sm:block">
              AI Document Intelligence
            </span>
          </div>
        </div>

        {/* ── Center: Horizontal Navigation (Desktop & Tablet) ─────────── */}
        <nav className="hidden md:flex items-center gap-1.5 rounded-2xl border border-line bg-nested/50 p-1 backdrop-blur-md shadow-inner">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = item.id === activeItem
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer select-none',
                  active
                    ? 'bg-accent/15 text-white shadow-md border border-accent/40 glow-red font-bold'
                    : 'text-secondary hover:text-foreground hover:bg-raised/70 border border-transparent'
                )}
              >
                <Icon
                  size={15}
                  className={cn(
                    'transition-colors',
                    active ? 'text-accent drop-shadow-[0_0_6px_rgba(255,30,30,0.8)]' : 'text-muted'
                  )}
                />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* ── Right: User Profile, Status & Actions ─────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* System status indicator badge */}
          <div className="hidden lg:block">
            <SystemStatus status={status} />
          </div>

          {/* User profile capsule */}
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-raised/60 py-1 px-2 sm:px-2.5 shadow-sm">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-nested to-raised border border-line text-accent font-heading font-semibold text-[11px] shadow-inner">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left max-w-[110px] min-w-0">
              <span className="truncate text-xs font-semibold text-foreground leading-tight">{displayName}</span>
              {displayEmail && (
                <span className="truncate text-[10px] text-muted font-mono leading-none">{displayEmail}</span>
              )}
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Log out"
                aria-label="Log out"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-all hover:bg-accent/15 hover:text-accent hover:border hover:border-accent/30 cursor-pointer active:scale-95 ml-0.5"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-raised/70 text-secondary hover:text-foreground hover:border-line-luminous md:hidden cursor-pointer transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown Menu ───────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-line bg-surface/95 backdrop-blur-2xl px-4 py-3 md:hidden shadow-2xl overflow-hidden"
          >
            <nav className="flex flex-col gap-1.5 pb-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const active = item.id === activeItem
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer',
                      active
                        ? 'bg-accent/15 text-white border border-accent/40 text-accent shadow-sm'
                        : 'text-secondary hover:text-foreground hover:bg-raised/60'
                    )}
                  >
                    <Icon size={18} className={active ? 'text-accent' : 'text-muted'} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
            <div className="pt-2 border-t border-line flex items-center justify-between">
              <SystemStatus status={status} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
