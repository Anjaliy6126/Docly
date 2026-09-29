import { useState, useRef, useEffect } from 'react'
import { SendHorizontal } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../../lib/utils'

export function ChatInput({ onSend, disabled }) {
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
      className="relative flex w-full flex-col rounded-2xl border border-line bg-canvas/60 p-2 shadow-sm transition-colors focus-within:border-accent hover:border-line-luminous"
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
        placeholder="Ask a question about your documents..."
        className="max-h-[200px] min-h-[44px] w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none"
        disabled={disabled}
        rows={1}
      />
      <div className="flex items-center justify-end px-2 pb-1">
        <button
          type="button"
          onClick={handleSend}
          disabled={isEmpty || disabled}
          aria-label="Send message"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
            !isEmpty && !disabled
              ? 'bg-accent text-white hover:bg-accent/90'
              : 'bg-nested text-muted cursor-not-allowed'
          )}
        >
          <SendHorizontal size={16} aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  )
}
