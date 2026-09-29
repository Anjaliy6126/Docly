import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  FileQuestion, AlertCircle, Loader2, FileText,
  CheckCircle2, RotateCcw, Plus
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyChatState } from '../components/chat/EmptyChatState'
import { ChatMessage } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'
import { ChatHistorySidebar } from '../components/chat/ChatHistorySidebar'
import {
  getDocuments, createChat, sendChatMessage,
  getChats, getChatMessages
} from '../services/api'
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
  // ── Documents ──────────────────────────────────────────────────────────────
  const [docsState, setDocsState] = useState('loading')
  const [docsError, setDocsError] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedDocIds, setSelectedDocIds] = useState([])

  // ── Chat history ───────────────────────────────────────────────────────────
  const [chatsState, setChatsState] = useState('loading')
  const [chatsError, setChatsError] = useState(null)
  const [chatHistory, setChatHistory] = useState([])

  // ── Active chat session ────────────────────────────────────────────────────
  const [chatId, setChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)

  // ── Load all processed documents ───────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    setDocsState('loading')
    try {
      const docs = await getDocuments()
      setDocuments(docs.filter(d => d.status === 'processed'))
      setDocsError(null)
      setDocsState('ready')
    } catch (error) {
      setDocsError(readableError(error))
      setDocsState('error')
    }
  }, [])

  // ── Load chat history ──────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    setChatsState('loading')
    try {
      const chats = await getChats()
      setChatHistory(chats)
      setChatsError(null)
      setChatsState('ready')
    } catch (error) {
      setChatsError(readableError(error))
      setChatsState('error')
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      await Promise.all([loadDocuments(), loadChats()])
    }
    run()
  }, [loadDocuments, loadChats])

  // ── Select a previous chat, restore its messages ───────────────────────────
  const handleSelectChat = useCallback(async (chat) => {
    if (isSending) return
    setIsLoadingSession(true)
    setSendError(null)
    setChatId(chat.id)
    setMessages([])

    // Pre-select the documents this chat was grounded in
    setSelectedDocIds(chat.document_ids)

    try {
      const result = await getChatMessages(chat.id)
      setMessages(result.messages.map(m => ({
        ...m,
        // Archived messages don't carry sources — only new ones do.
        sources: undefined,
      })))
    } catch (error) {
      setSendError(readableError(error))
    } finally {
      setIsLoadingSession(false)
    }
  }, [isSending])

  // ── Reset to blank new-chat state ──────────────────────────────────────────
  const handleNewChat = () => {
    setChatId(null)
    setMessages([])
    setSelectedDocIds([])
    setSendError(null)
    setIsSending(false)
    setIsLoadingSession(false)
  }

  // ── Toggle document selection (only before chat starts) ────────────────────
  const toggleDocument = (id) => {
    if (chatId || isSending) return
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  // ── Send a message ─────────────────────────────────────────────────────────
  const handleSend = async (text) => {
    if (!text.trim() || selectedDocIds.length === 0 || isSending) return

    setIsSending(true)
    setSendError(null)

    // Optimistic user message
    const tempId = Date.now()
    const optimisticUser = { id: tempId, role: 'user', content: text }
    setMessages(prev => [...prev, optimisticUser])

    try {
      let currentChatId = chatId
      if (!currentChatId) {
        const title = text.slice(0, 60) + (text.length > 60 ? '...' : '')
        const newChat = await createChat(title, selectedDocIds)
        currentChatId = newChat.id
        setChatId(currentChatId)
        // Optimistically prepend to history sidebar
        setChatHistory(prev => [newChat, ...prev])
      }

      const response = await sendChatMessage(currentChatId, text)

      setMessages(prev => {
        const withoutOptimistic = prev.filter(m => m.id !== tempId)
        const resolvedSources = (response.sources || []).map(src => {
          const doc = documents.find(d => d.id === src.document_id)
          return { ...src, filename: doc ? doc.original_filename : null }
        })
        return [
          ...withoutOptimistic,
          response.user_message,
          { ...response.assistant_message, sources: resolvedSources },
        ]
      })
    } catch (error) {
      setSendError(readableError(error))
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  const selectedDocs = documents.filter(d => selectedDocIds.includes(d.id))
  const inputDisabled = docsState !== 'ready' || selectedDocIds.length === 0 || isSending || isLoadingSession

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex min-h-[calc(100vh-140px)] flex-col gap-6 md:min-h-[calc(100vh-120px)]"
    >
      {/* Page header */}
      <motion.section variants={riseItem} className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Document Chat
          </h1>
          <p className="mt-1 text-sm text-secondary md:text-base">
            Ask questions grounded in your selected documents.
          </p>
        </div>
        {chatId && (
          <Button variant="ghost" onClick={handleNewChat} className="shrink-0 self-start md:self-auto">
            <Plus size={15} className="mr-1.5" />
            New chat
          </Button>
        )}
      </motion.section>

      {/* Main layout: history sidebar + chat workspace */}
      <motion.div variants={riseItem} className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-start">

        {/* ── Chat History Sidebar ──────────────────────────────────────── */}
        <ChatHistorySidebar
          chats={chatHistory}
          chatsState={chatsState}
          chatsError={chatsError}
          activeChatId={chatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onRetry={loadChats}
        />

        {/* ── Right workspace ───────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">

          {/* Document Selection / Context Panel */}
          <div className="rounded-2xl border border-line bg-canvas/40 p-4 md:p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileQuestion size={16} className="text-muted" aria-hidden="true" />
              <h2 className="font-heading text-sm font-bold text-foreground">
                {chatId ? 'Chat context' : 'Select documents'}
              </h2>
            </div>

            {docsState === 'loading' && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin text-accent" />
              </div>
            )}

            {docsState === 'error' && (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <AlertCircle size={20} className="text-status-down" />
                <p className="text-sm text-secondary">{docsError}</p>
                <Button variant="ghost" size="sm" onClick={loadDocuments}>
                  <RotateCcw size={13} className="mr-1" /> Retry
                </Button>
              </div>
            )}

            {docsState === 'ready' && documents.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
                <FileText size={24} className="text-muted" />
                <p className="text-sm font-medium text-foreground">No processed documents</p>
                <p className="max-w-xs text-xs text-secondary">
                  Upload and process a PDF in the Dashboard first.
                </p>
              </div>
            )}

            {docsState === 'ready' && documents.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {(chatId ? selectedDocs : documents).map(doc => {
                  const isSelected = selectedDocIds.includes(doc.id)
                  const locked = chatId !== null || isSending
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      disabled={locked && !isSelected}
                      onClick={() => toggleDocument(doc.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        isSelected
                          ? 'border-accent bg-accent/5'
                          : 'border-line bg-surface hover:border-line-luminous',
                        locked && !isSelected && 'cursor-not-allowed opacity-50',
                        locked && isSelected && 'cursor-default border-line-luminous'
                      )}
                    >
                      <div className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                        isSelected ? 'bg-accent text-white' : 'bg-nested text-muted'
                      )}>
                        {isSelected ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {doc.original_filename}
                        </p>
                        <p className="text-xs text-muted">{formatFileSize(doc.file_size)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Chat messages area */}
          <div className="flex flex-1 flex-col rounded-2xl border border-line bg-canvas/40">
            <div className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
              {isLoadingSession ? (
                <div className="flex flex-1 items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3 text-secondary">
                    <Loader2 size={28} className="animate-spin text-accent" />
                    <p className="text-sm">Loading conversation…</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <EmptyChatState />
              ) : (
                <div className="flex flex-col gap-1">
                  {messages.map((msg, index) => (
                    <ChatMessage
                      key={msg.id ?? index}
                      role={msg.role}
                      content={msg.content}
                      sources={msg.sources}
                    />
                  ))}

                  {/* Animated thinking indicator */}
                  {isSending && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex w-full gap-4 py-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-accent">
                        <Loader2 size={15} className="animate-spin" />
                      </div>
                      <div className="flex items-center rounded-2xl border border-line-luminous bg-canvas/60 px-4 py-3 text-sm text-secondary">
                        Thinking about your documents…
                      </div>
                    </motion.div>
                  )}

                  {/* Inline error */}
                  {sendError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex w-full justify-center py-2"
                    >
                      <div className="flex items-center gap-2 rounded-xl border border-status-down/40 bg-status-down/10 px-4 py-2 text-sm text-status-down">
                        <AlertCircle size={15} />
                        {sendError}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t border-line bg-surface/50 p-4 md:p-5 rounded-b-2xl">
              <ChatInput onSend={handleSend} disabled={inputDisabled} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
