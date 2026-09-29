import { useState } from 'react'
import { motion } from 'motion/react'
import { FileQuestion, AlertCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { EmptyChatState } from '../components/chat/EmptyChatState'
import { ChatMessage } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const riseItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export function Chat() {
  // In a real implementation, this would come from global state or context
  const selectedDocument = null
  const [messages, _setMessages] = useState([])

  const handleSend = (_text) => {
    // We do NOT add fake messages per the requirements.
    // This function is ready for future integration.
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex min-h-[calc(100vh-140px)] flex-col md:min-h-[calc(100vh-120px)]"
    >
      {/* Header */}
      <motion.section variants={riseItem} className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          Document Chat
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-secondary md:text-base">
          Ask questions and get answers grounded entirely in your selected document.
        </p>
      </motion.section>

      {/* Document Context Area */}
      <motion.section variants={riseItem} className="mb-6">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nested text-muted">
            {selectedDocument ? <FileQuestion size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {selectedDocument ? selectedDocument.original_filename : 'No document selected'}
            </p>
            <p className="text-xs text-muted">
              {selectedDocument ? 'Ready for questions' : 'Select a document from the Dashboard to start chatting'}
            </p>
          </div>
        </Card>
      </motion.section>

      {/* Chat Area */}
      <motion.div
        variants={riseItem}
        className="flex flex-1 flex-col rounded-2xl border border-line bg-canvas/40 lg:w-[85%] lg:max-w-4xl lg:self-center"
      >
        {/* Messages / Empty State */}
        <div className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
          {messages.length === 0 ? (
            <EmptyChatState />
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg, index) => (
                <ChatMessage key={index} role={msg.role} content={msg.content} />
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-line bg-surface/50 p-4 md:p-6 rounded-b-2xl">
          <ChatInput onSend={handleSend} disabled={!selectedDocument} />
        </div>
      </motion.div>
    </motion.div>
  )
}
