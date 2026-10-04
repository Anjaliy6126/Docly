import { useState, useRef, useEffect } from 'react'
import { SendHorizontal, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../../lib/utils'

/**
 * Modern AI Command Center Input (Black + Red Cinematic Theme):
 * - Dark charcoal glass surface
 * - Glowing crimson/red focus ring & border
 * - Red gradient send button with hover aura
 * - Auto-resizing textarea
 */
export function ChatInput({ onSend, disabled, placeholder }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [text])

  const handleSend = () => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = !text.trim()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative flex w-full flex-col rounded-2xl border bg-surface/85 backdrop-blur-2xl p-2.5 shadow-xl transition-all duration-200',
        !disabled
          ? 'border-line focus-within:border-accent focus-within:shadow-[0_0_30px_rgba(229,9,20,0.25)] hover:border-line-luminous'
          : 'border-line/60 opacity-60 cursor-not-allowed'
      )}
    >
      <label htmlFor="chat-input" className="sr-only">
        Ask a question about your documents
      </label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          placeholder ||
          (disabled
            ? 'Select at least one document above to start asking questions...'
            : 'Ask anything about your selected documents... (Enter to send, Shift+Enter for newline)')
        }
        className="max-h-[200px] min-h-[46px] w-full resize-none bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none disabled:cursor-not-allowed leading-relaxed"
        disabled={disabled}
        rows={1}
      />
      <div className="flex items-center justify-between px-2 pt-1 border-t border-line/30">
        <div className="flex items-center gap-1.5 text-[11px] text-muted font-mono">
          <Sparkles size={11} className={!disabled ? 'text-accent' : 'text-muted'} />
          <span className="hidden sm:inline">Grounded with local FAISS + Llama 3.2</span>
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={isEmpty || disabled}
          aria-label="Send message"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150',
            !isEmpty && !disabled
              ? 'bg-gradient-to-r from-accent to-primary-indigo text-white shadow-[0_0_15px_rgba(229,9,20,0.4)] hover:shadow-[0_0_20px_rgba(255,30,30,0.6)] cursor-pointer active:scale-95'
              : 'bg-nested text-muted/60 cursor-not-allowed opacity-50'
          )}
        >
          <SendHorizontal size={15} aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  )
}
