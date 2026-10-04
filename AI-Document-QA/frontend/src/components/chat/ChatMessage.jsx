import { Bot, User, Bookmark } from 'lucide-react'
import { cn } from '../../lib/utils'
import { motion } from 'motion/react'

/**
 * Modern source citation card (Black + Red Cinematic Theme).
 */
function SourceCard({ index, source }) {
  const name = source.document_name || `Document #${source.document_id}`

  return (
    <li
      className={cn(
        'group flex flex-col gap-1 rounded-xl border border-line bg-canvas/70 p-2.5',
        'transition-all duration-150 hover:border-accent/40 hover:bg-canvas/95 hover:shadow-[0_0_15px_rgba(229,9,20,0.18)]'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/20 font-mono text-[10px] font-bold text-accent shadow-inner border border-accent/30"
            aria-hidden="true"
          >
            {index}
          </span>
          <span className="min-w-0 truncate text-xs font-semibold text-foreground group-hover:text-accent-hover transition-colors" title={name}>
            {name}
          </span>
        </div>
        <span className="shrink-0 rounded-md border border-line bg-nested px-1.5 py-0.5 font-mono text-[10px] text-muted">
          Page {source.page_number}
        </span>
      </div>
      {source.text && (
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-secondary/90 italic bg-nested/40 rounded-lg p-1.5 border border-line/50">
          &ldquo;{source.text}&rdquo;
        </p>
      )}
    </li>
  )
}

export function ChatMessage({ role, content, sources }) {
  const isUser = role === 'user'
  const hasSources = Array.isArray(sources) && sources.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex w-full gap-3 py-3 md:gap-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-inner border',
          isUser
            ? 'bg-gradient-to-br from-raised to-nested text-secondary border-line'
            : 'bg-gradient-to-br from-primary-indigo/30 via-accent/20 to-primary/25 text-white border-accent/40 shadow-[0_0_15px_rgba(229,9,20,0.25)]'
        )}
        aria-hidden="true"
      >
        {isUser ? <User size={16} /> : <Bot size={18} className="text-white drop-shadow-[0_0_6px_rgba(255,30,30,0.7)]" />}
      </div>

      {/* Message Card */}
      <div
        className={cn(
          'flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3.5 text-sm md:max-w-[78%] shadow-lg',
          isUser
            ? 'bg-gradient-to-br from-raised/95 to-nested/95 border border-primary/25 text-foreground rounded-tr-sm'
            : 'bg-surface/85 backdrop-blur-xl border border-line-luminous text-foreground rounded-tl-sm shadow-[0_0_25px_rgba(0,0,0,0.5)]'
        )}
      >
        <div className="whitespace-pre-wrap leading-relaxed selection:bg-accent/35">{content}</div>

        {!isUser && hasSources && (
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-2 border-t border-line/60 pt-3 mt-1"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
              <Bookmark size={13} className="text-accent" aria-hidden="true" />
              <span>Grounded Citations ({sources.length})</span>
            </div>
            <ul className="flex flex-col gap-1.5" aria-label="Sources for this answer">
              {sources.map((src, i) => (
                <SourceCard
                  key={`${src.document_id}-${src.page_number}-${src.chunk_index}-${i}`}
                  index={i + 1}
                  source={src}
                />
              ))}
            </ul>
          </motion.section>
        )}
      </div>
    </motion.div>
  )
}
