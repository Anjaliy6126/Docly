import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  FileQuestion,
  AlertCircle,
  Loader2,
  FileText,
  CheckCircle2,
  RotateCcw,
  Plus,
  Lock,
  Sparkles,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyChatState } from '../components/chat/EmptyChatState'
import { ChatMessage } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'
import { ChatHistorySidebar } from '../components/chat/ChatHistorySidebar'
import {
  getDocuments,
  createChat,
  sendChatMessage,
  getChats,
  getChatMessages,
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
      setDocuments(docs.filter((d) => d.status === 'processed'))
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
  const handleSelectChat = useCallback(
    async (chat) => {
      if (isSending) return
      setIsLoadingSession(true)
      setSendError(null)
      setChatId(chat.id)
      setMessages([])

      // Pre-select the documents this chat was grounded in
      setSelectedDocIds(chat.document_ids || [])

      try {
        const result = await getChatMessages(chat.id)
        setMessages(
          result.messages.map((m) => ({
            ...m,
            // Archived messages don't carry sources — only live ones do.
            sources: undefined,
          }))
        )
      } catch (error) {
        setSendError(readableError(error))
      } finally {
        setIsLoadingSession(false)
      }
    },
    [isSending]
  )

  // ── Reset to blank new-chat state ──────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setChatId(null)
    setMessages([])
    setSelectedDocIds([])
    setSendError(null)
    setIsSending(false)
    setIsLoadingSession(false)
  }, [])

  // ── Toggle document selection (only before chat starts) ────────────────────
  const toggleDocument = useCallback(
    (id) => {
      if (chatId !== null || isSending) return
      setSelectedDocIds((prev) =>
        prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
      )
    },
    [chatId, isSending]
  )

  // ── Send a message ─────────────────────────────────────────────────────────
  const handleSend = async (text) => {
    if (!text.trim() || selectedDocIds.length === 0 || isSending) return

    setIsSending(true)
    setSendError(null)

    // Optimistic user message
    const tempId = Date.now()
    const optimisticUser = { id: tempId, role: 'user', content: text }
    setMessages((prev) => [...prev, optimisticUser])

    try {
      let currentChatId = chatId
      if (!currentChatId) {
        const title = text.slice(0, 60) + (text.length > 60 ? '...' : '')
        const newChat = await createChat(title, selectedDocIds)
        currentChatId = newChat.id
        setChatId(currentChatId)
        // Optimistically prepend to history sidebar
        setChatHistory((prev) => [newChat, ...prev])
      }

      const response = await sendChatMessage(currentChatId, text)

      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== tempId)
        const resolvedSources = (response.sources || []).map((src) => ({
          ...src,
          document_name:
            src.document_name ??
            documents.find((d) => d.id === src.document_id)?.original_filename ??
            null,
        }))
        return [
          ...withoutOptimistic,
          response.user_message,
          { ...response.assistant_message, sources: resolvedSources },
        ]
      })
    } catch (error) {
      setSendError(readableError(error))
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id))
  const inputDisabled =
    docsState !== 'ready' ||
    selectedDocIds.length === 0 ||
    isSending ||
    isLoadingSession

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex min-h-[calc(100vh-140px)] flex-col gap-6 md:min-h-[calc(100vh-120px)]"
    >
      {/* Page Header */}
      <motion.section
        variants={riseItem}
        className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line-luminous bg-accent/10 px-3 py-0.5 text-xs font-mono font-semibold tracking-wider text-accent uppercase mb-1.5 shadow-[0_0_12px_rgba(229,9,20,0.2)]">
            <Sparkles size={12} className="text-accent" />
            <span>Grounded RAG Assistant</span>
          </div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight md:text-3xl bg-gradient-to-r from-foreground via-slate-100 to-secondary bg-clip-text text-transparent">
            Document Chat
          </h1>
          <p className="text-xs md:text-sm text-secondary">
            Multi-document vector retrieval with citations and contextual memory.
          </p>
        </div>
        {chatId !== null && (
          <Button
            variant="ghost"
            onClick={handleNewChat}
            className="shrink-0 self-start md:self-auto cursor-pointer border-line-luminous hover:border-accent/40 text-xs py-2 px-3.5 shadow-sm"
          >
            <Plus size={14} className="mr-1.5 text-accent" />
            New chat
          </Button>
        )}
      </motion.section>

      {/* Main Layout: Sidebar + Workspace */}
      <motion.div
        variants={riseItem}
        className="flex flex-1 flex-col gap-5 lg:flex-row lg:items-start"
      >
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

        {/* ── Right Workspace ───────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Document Context / Selector Panel */}
          <div className="rounded-2xl border border-line bg-surface/75 backdrop-blur-xl p-4 md:p-5 shadow-xl">
            <div className="mb-3.5 flex items-center justify-between border-b border-line/50 pb-2.5">
              <div className="flex items-center gap-2">
                <FileQuestion size={16} className="text-accent" aria-hidden="true" />
                <h2 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                  {chatId !== null ? 'Chat Context (Locked)' : 'Select Target Documents'}
                </h2>
                {chatId !== null && (
                  <Lock size={12} className="text-muted ml-1" />
                )}
              </div>
              {chatId === null && documents.length > 0 && (
                <span className={cn(
                  'text-xs font-mono font-medium transition-colors',
                  selectedDocIds.length > 0 ? 'text-accent' : 'text-muted'
                )}>
                  {selectedDocIds.length} of {documents.length} selected
                </span>
              )}
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
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {(chatId !== null ? selectedDocs : documents).map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id)
                  const locked = chatId !== null || isSending
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      disabled={locked && !isSelected}
                      onClick={() => toggleDocument(doc.id)}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150',
                        isSelected
                          ? 'border-accent bg-accent/10 shadow-[0_0_18px_rgba(229,9,20,0.22)] text-foreground scale-[1.01]'
                          : 'border-line bg-canvas/60 text-secondary hover:border-line-luminous hover:bg-canvas/90 hover:text-foreground',
                        locked && !isSelected && 'cursor-not-allowed opacity-40',
                        locked && isSelected && 'cursor-default border-line-luminous',
                        !locked && 'cursor-pointer'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all shadow-inner',
                          isSelected
                            ? 'bg-accent text-white shadow-[0_0_10px_rgba(229,9,20,0.7)]'
                            : 'bg-nested text-muted group-hover:text-secondary group-hover:border group-hover:border-line'
                        )}
                      >
                        {isSelected ? <CheckCircle2 size={16} /> : <FileText size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'truncate text-xs font-semibold',
                          isSelected ? 'text-foreground' : 'text-secondary group-hover:text-foreground'
                        )}>
                          {doc.original_filename}
                        </p>
                        <p className="text-[10px] text-muted font-mono">{formatFileSize(doc.file_size)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Conversation & Input Box Container */}
          <div className="flex flex-1 flex-col rounded-2xl border border-line bg-surface/70 backdrop-blur-xl shadow-2xl min-h-[460px]">
            {/* Messages Area */}
            <div className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
              {isLoadingSession ? (
                <div className="flex flex-1 items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3 text-secondary">
                    <Loader2 size={32} className="animate-spin text-accent drop-shadow-[0_0_8px_rgba(255,30,30,0.8)]" />
                    <p className="text-sm font-medium">Restoring conversation session...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <EmptyChatState />
              ) : (
                <div className="flex flex-col gap-2">
                  {messages.map((msg, index) => (
                    <ChatMessage
                      key={msg.id ?? index}
                      role={msg.role}
                      content={msg.content}
                      sources={msg.sources}
                    />
                  ))}

                  {/* Thinking Indicator */}
                  {isSending && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex w-full gap-3 py-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 border border-accent/40 text-accent shadow-[0_0_15px_rgba(229,9,20,0.35)]">
                        <Loader2 size={18} className="animate-spin text-accent" />
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl border border-line-luminous bg-surface/85 backdrop-blur-md px-4 py-3 text-xs text-secondary shadow-lg">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                        </span>
                        <span>Retrieving chunks &amp; generating grounded answer...</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Inline Error */}
                  {sendError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex w-full justify-center py-2"
                    >
                      <div className="flex items-center gap-2 rounded-xl border border-status-down/40 bg-status-down/10 px-4 py-2.5 text-xs text-status-down shadow-md">
                        <AlertCircle size={15} />
                        {sendError}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="border-t border-line/70 bg-canvas/60 backdrop-blur-2xl p-4 md:p-5 rounded-b-2xl">
              <ChatInput onSend={handleSend} disabled={inputDisabled} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
