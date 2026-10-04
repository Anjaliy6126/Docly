import { motion } from 'motion/react'
import { MessagesSquare, Loader2, AlertCircle, RotateCcw, Plus, Clock } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'

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
    <aside className="flex w-full lg:w-72 shrink-0 flex-col rounded-2xl border border-line bg-surface/75 backdrop-blur-xl shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5 bg-canvas/40 rounded-t-2xl">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider font-mono">
          <MessagesSquare size={16} className="text-accent" aria-hidden="true" />
          <span>Conversations</span>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          title="Start new chat"
          aria-label="Start new chat"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-raised/80 text-muted transition-all hover:border-accent/40 hover:bg-accent/10 hover:text-accent cursor-pointer active:scale-95 shadow-sm"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-y-auto p-2 max-h-[500px] lg:max-h-none">
        {chatsState === 'loading' && (
          <div className="flex flex-1 items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        )}

        {chatsState === 'error' && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center px-2">
            <AlertCircle size={20} className="text-status-down" />
            <p className="text-xs text-secondary">{chatsError}</p>
            <Button variant="ghost" size="sm" onClick={onRetry}>
              <RotateCcw size={12} className="mr-1" /> Retry
            </Button>
          </div>
        )}

        {chatsState === 'ready' && chats.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center px-4">
            <MessagesSquare size={26} className="text-muted/60" />
            <p className="text-xs font-medium text-foreground">No conversations yet</p>
            <p className="text-[11px] text-muted">Select a document and ask a question to start.</p>
          </div>
        )}

        {chatsState === 'ready' && chats.length > 0 && (
          <motion.ul
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-1"
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
                      'group relative flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-all duration-150 cursor-pointer',
                      isActive
                        ? 'bg-accent/15 border border-accent/40 shadow-[0_0_15px_rgba(229,9,20,0.18)]'
                        : 'hover:bg-raised/60 border border-transparent hover:border-line'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-accent shadow-[0_0_8px_rgba(255,30,30,0.8)]" />
                    )}
                    <span className={cn(
                      'truncate text-xs font-semibold leading-snug',
                      isActive ? 'text-white font-bold' : 'text-secondary group-hover:text-foreground'
                    )}>
                      {chat.title}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted font-mono">
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
