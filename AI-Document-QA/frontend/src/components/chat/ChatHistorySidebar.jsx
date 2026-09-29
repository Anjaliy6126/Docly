import { motion } from 'motion/react'
import { MessagesSquare, Loader2, AlertCircle, RotateCcw, Plus, Clock } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'

/**
 * Formats an ISO timestamp into a friendly relative date label.
 * Shows time for today, "Yesterday" for previous day, or short date otherwise.
 */
function formatRelativeDate(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24 && date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

export function ChatHistorySidebar({ chats, chatsState, chatsError, activeChatId, onSelectChat, onNewChat, onRetry }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col rounded-2xl border border-line bg-canvas/40 md:w-72">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessagesSquare size={16} className="text-accent" aria-hidden="true" />
          Chat History
        </div>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Start new chat"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-foreground"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-y-auto p-2">
        {chatsState === 'loading' && (
          <div className="flex flex-1 items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        )}

        {chatsState === 'error' && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <AlertCircle size={20} className="text-status-down" />
            <p className="text-xs text-secondary">{chatsError}</p>
            <Button variant="ghost" size="sm" onClick={onRetry}>
              <RotateCcw size={12} className="mr-1" /> Retry
            </Button>
          </div>
        )}

        {chatsState === 'ready' && chats.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <MessagesSquare size={24} className="text-muted" />
            <p className="text-xs text-secondary">No chats yet. Ask a question to start.</p>
          </div>
        )}

        {chatsState === 'ready' && chats.length > 0 && (
          <motion.ul
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-0.5"
            role="list"
            aria-label="Previous chats"
          >
            {chats.map((chat) => {
              const isActive = chat.id === activeChatId
              return (
                <motion.li key={chat.id} variants={itemVariants}>
                  <button
                    type="button"
                    onClick={() => onSelectChat(chat)}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'group flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors',
                      isActive
                        ? 'bg-raised border border-line-luminous'
                        : 'hover:bg-raised border border-transparent'
                    )}
                  >
                    <span className={cn(
                      'truncate text-sm font-medium leading-snug',
                      isActive ? 'text-foreground' : 'text-secondary group-hover:text-foreground'
                    )}>
                      {chat.title}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock size={10} aria-hidden="true" />
                      {formatRelativeDate(chat.created_at)}
                      {chat.document_ids.length > 0 && (
                        <> · {chat.document_ids.length} doc{chat.document_ids.length !== 1 ? 's' : ''}</>
                      )}
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </motion.ul>
        )}
      </div>
    </aside>
  )
}
