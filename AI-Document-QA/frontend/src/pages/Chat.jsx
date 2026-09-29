import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { FileQuestion, AlertCircle, Loader2, FileText, CheckCircle2, RotateCcw, Plus } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyChatState } from '../components/chat/EmptyChatState'
import { ChatMessage } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'
import { getDocuments, createChat, sendChatMessage } from '../services/api'
import { cn } from '../lib/utils'

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const riseItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return '—'
  let value = Number(bytes)
  if (value < 1024) return `${value} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let unitIndex = -1
  do {
    value /= 1024
    unitIndex++
  } while (value >= 1024 && unitIndex < units.length - 1)
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function readableError(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function Chat() {
  const [docsState, setDocsState] = useState('loading')
  const [docsError, setDocsError] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedDocIds, setSelectedDocIds] = useState([])

  const [chatId, setChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState(null)

  const loadDocuments = useCallback(async () => {
    setDocsState('loading')
    try {
      const docs = await getDocuments()
      const processedDocs = docs.filter(d => d.status === 'processed')
      setDocuments(processedDocs)
      setDocsError(null)
      setDocsState('ready')
    } catch (error) {
      setDocsError(readableError(error))
      setDocsState('error')
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      await loadDocuments()
    }
    run()
  }, [loadDocuments])

  const toggleDocument = (id) => {
    if (chatId || isSending) return // locked
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    )
  }

  const handleNewChat = () => {
    setChatId(null)
    setMessages([])
    setSelectedDocIds([])
    setSendError(null)
    setIsSending(false)
  }

  const handleSend = async (text) => {
    if (!text.trim() || selectedDocIds.length === 0 || isSending) return

    setIsSending(true)
    setSendError(null)

    // Optimistically add user message to UI
    const tempUserMsg = { id: Date.now(), role: 'user', content: text }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      let currentChatId = chatId
      if (!currentChatId) {
        const title = text.slice(0, 60) + (text.length > 60 ? '...' : '')
        const newChat = await createChat(title, selectedDocIds)
        currentChatId = newChat.id
        setChatId(currentChatId)
      }

      const response = await sendChatMessage(currentChatId, text)
      
      // Update with real messages from backend
      setMessages((prev) => {
        // Replace the optimistic message with the real one, and add the assistant message.
        // It's safer to just append the assistant message, but we might have duplicated the user message if we just append both.
        // Let's replace the last message if it's our optimistic one, or just re-sync.
        // Actually, backend returns user_message and assistant_message. We can just append the assistant_message.
        // Wait, the backend returns the *persisted* user message. We should swap our optimistic one with the real one.
        const withoutOptimistic = prev.filter(m => m.id !== tempUserMsg.id)
        
        // Resolve sources filenames
        const resolvedSources = (response.sources || []).map(src => {
          const doc = documents.find(d => d.id === src.document_id)
          return {
            ...src,
            filename: doc ? doc.original_filename : 'Unknown Document'
          }
        })
        
        const assistantMsgWithSources = {
          ...response.assistant_message,
          sources: resolvedSources
        }

        return [...withoutOptimistic, response.user_message, assistantMsgWithSources]
      })

    } catch (error) {
      setSendError(readableError(error))
      // Remove the optimistic message on failure so they can try again
      setMessages((prev) => prev.filter(m => m.id !== tempUserMsg.id))
    } finally {
      setIsSending(false)
    }
  }

  const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id))

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex min-h-[calc(100vh-140px)] flex-col md:min-h-[calc(100vh-120px)]"
    >
      {/* Header */}
      <motion.section variants={riseItem} className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Document Chat
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary md:text-base">
            Ask questions and get answers grounded entirely in your selected documents.
          </p>
        </div>
        {chatId && (
          <Button variant="ghost" onClick={handleNewChat} className="shrink-0">
            <Plus size={16} className="mr-2" />
            New chat
          </Button>
        )}
      </motion.section>

      {/* Document Selection Area */}
      <motion.section variants={riseItem} className="mb-6">
        <div className="rounded-2xl border border-line bg-canvas/40 p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileQuestion size={18} className="text-muted" />
            <h2 className="font-heading text-base font-bold text-foreground">
              {chatId ? 'Chat Context' : 'Select Documents'}
            </h2>
          </div>

          {docsState === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-accent" />
            </div>
          )}

          {docsState === 'error' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertCircle size={24} className="mb-2 text-status-down" />
              <p className="text-sm text-secondary">{docsError}</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={loadDocuments}>
                <RotateCcw size={14} className="mr-2" /> Retry
              </Button>
            </div>
          )}

          {docsState === 'ready' && documents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText size={32} className="mb-3 text-muted" />
              <p className="text-sm font-medium text-foreground">No processed documents</p>
              <p className="mt-1 max-w-sm text-xs text-secondary">
                Upload and process documents in the Dashboard before starting a chat.
              </p>
            </div>
          )}

          {docsState === 'ready' && documents.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* If chat is started, only show selected. If not started, show all. */}
              {(chatId ? selectedDocs : documents).map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id)
                return (
                  <button
                    key={doc.id}
                    type="button"
                    disabled={chatId !== null || isSending}
                    onClick={() => toggleDocument(doc.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                      isSelected
                        ? 'border-accent bg-accent/5'
                        : 'border-line bg-surface hover:border-line-luminous',
                      (chatId !== null || isSending) && !isSelected && 'opacity-50 cursor-not-allowed',
                      chatId !== null && isSelected && 'cursor-default border-line-luminous bg-canvas/60'
                    )}
                  >
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      isSelected ? 'bg-accent text-white' : 'bg-nested text-muted'
                    )}>
                      {isSelected ? <CheckCircle2 size={16} /> : <FileText size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {doc.original_filename}
                      </p>
                      <p className="text-xs text-muted">
                        {formatFileSize(doc.file_size)} · {doc.status}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
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
                <ChatMessage key={index} role={msg.role} content={msg.content} sources={msg.sources} />
              ))}
              {isSending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full gap-4 py-4 flex-row">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-accent">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                  <div className="flex items-center rounded-2xl border border-line-luminous bg-canvas/60 px-4 py-3 text-sm text-secondary">
                    Thinking about your documents...
                  </div>
                </motion.div>
              )}
              {sendError && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full justify-center py-2">
                  <div className="flex items-center gap-2 rounded-xl border border-status-down/40 bg-status-down/10 px-4 py-2 text-sm text-status-down">
                    <AlertCircle size={16} />
                    {sendError}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-line bg-surface/50 p-4 md:p-6 rounded-b-2xl">
          <ChatInput 
            onSend={handleSend} 
            disabled={docsState !== 'ready' || selectedDocIds.length === 0 || isSending} 
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
