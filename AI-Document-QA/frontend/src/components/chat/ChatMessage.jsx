import { Bot, User } from 'lucide-react'
import { cn } from '../../lib/utils'
import { motion } from 'motion/react'

export function ChatMessage({ role, content }) {
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex w-full gap-3 py-4 md:gap-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          isUser ? 'bg-nested text-secondary' : 'bg-primary/15 text-accent'
        )}
        aria-hidden="true"
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div
        className={cn(
          'flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm md:max-w-[75%]',
          isUser
            ? 'bg-nested border border-line text-foreground'
            : 'bg-canvas/60 border border-line-luminous text-foreground'
        )}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        {/* Room for future citations/source references */}
      </div>
    </motion.div>
  )
}
