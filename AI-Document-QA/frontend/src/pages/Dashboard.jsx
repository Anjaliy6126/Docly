import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  FileText,
  Loader2,
  Upload,
  MessagesSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Wifi,
  Database,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { getDocuments, getChats, uploadDocument } from '../services/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SystemStatus } from '../components/SystemStatus'
import { useAuth } from '../context/AuthContext'

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const riseItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

function formatDate(timestamp) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return '—'
  let value = Number(bytes)
  if (value < 1024) return `${value} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let unitIndex = -1
  do { value /= 1024; unitIndex++ } while (value >= 1024 && unitIndex < units.length - 1)
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function readableError(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

const STATUS_DOT = {
  processed: 'bg-status-ok shadow-[0_0_6px_rgba(16,185,129,0.7)]',
  processing: 'bg-accent animate-pulse',
  uploaded: 'bg-muted',
  failed: 'bg-status-down',
}

const PIPELINE_STEPS = [
  { label: 'PDF Upload', desc: 'Text-based PDF, up to 20 MB' },
  { label: 'Text Extraction', desc: 'PyMuPDF reads every page' },
  { label: 'Chunking', desc: '500-word chunks, 50-word overlap' },
  { label: 'Embeddings', desc: 'all-MiniLM-L6-v2 vectors' },
  { label: 'FAISS Index', desc: 'Semantic similarity search' },
  { label: 'Ollama LLM', desc: 'llama3.2:3b generates answer' },
]

export function Dashboard({ status, onNavigate }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [documents, setDocuments] = useState([])
  const [docsState, setDocsState] = useState('loading')

  const [chats, setChats] = useState([])
  const [chatsState, setChatsState] = useState('loading')

  const [uploadState, setUploadState] = useState('idle')
  const [uploadedFilename, setUploadedFilename] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  const isUploading = uploadState === 'uploading'

  const loadData = useCallback(async () => {
    try {
      const docs = await getDocuments()
      setDocuments(docs)
      setDocsState('ready')
    } catch {
      setDocsState('error')
    }
    try {
      const c = await getChats()
      setChats(c)
      setChatsState('ready')
    } catch {
      setChatsState('error')
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openFilePicker = () => {
    if (isUploading) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setUploadState('error')
      setUploadError('Please select a PDF file (.pdf).')
      return
    }
    setUploadState('uploading')
    setUploadError(null)
    setUploadedFilename(null)
    try {
      const doc = await uploadDocument(file)
      setUploadedFilename(doc.original_filename || file.name)
      setUploadState('success')
      await loadData()
    } catch (error) {
      setUploadState('error')
      setUploadError(readableError(error))
    }
  }

  const totalDocs = documents.length
  const processedDocs = documents.filter((d) => d.status === 'processed').length
  const failedDocs = documents.filter((d) => d.status === 'failed').length
  const recentDocs = [...documents].slice(0, 3)
  const recentChats = [...chats].slice(0, 3)
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      {/* Welcome header */}
      <motion.section variants={riseItem} className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-line-luminous bg-accent/10 px-3 py-1 text-xs font-mono font-semibold tracking-wider text-accent uppercase mb-3 shadow-[0_0_15px_rgba(229,9,20,0.2)]">
          <Sparkles size={13} className="text-accent" />
          <span>DOCly · AI Document Intelligence</span>
        </div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight md:text-4xl bg-gradient-to-r from-foreground via-slate-100 to-secondary bg-clip-text text-transparent">
          Welcome back, {firstName}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary md:text-base">
          Your documents, intelligently understood. Upload PDFs, ask questions, and get grounded answers with page-level citations.
        </p>
      </motion.section>

      {/* Upload success/error banner */}
      {uploadState === 'success' && (
        <motion.div {...fadeIn} role="status" className="mb-6 flex items-center gap-3 rounded-xl border border-status-ok/30 bg-status-ok/10 px-4 py-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <CheckCircle2 size={18} aria-hidden="true" className="shrink-0 text-status-ok" />
          <p className="text-sm text-secondary">
            <span className="font-semibold text-foreground">{uploadedFilename}</span> was processed and is ready for chat.
          </p>
        </motion.div>
      )}
      {uploadState === 'error' && (
        <motion.div {...fadeIn} role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-status-down/40 bg-status-down/10 px-4 py-3">
          <AlertCircle size={18} aria-hidden="true" className="shrink-0 text-status-down" />
          <p className="text-sm text-secondary">{uploadError}</p>
        </motion.div>
      )}

      {/* Stats row */}
      <motion.div variants={riseItem} className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Documents', value: docsState === 'loading' ? '…' : totalDocs, icon: FileText, accent: false },
          { label: 'Processed', value: docsState === 'loading' ? '…' : processedDocs, icon: CheckCircle2, accent: true },
          { label: 'Failed', value: docsState === 'loading' ? '…' : failedDocs, icon: AlertCircle, accent: false, warn: failedDocs > 0 },
          { label: 'Total Chats', value: chatsState === 'loading' ? '…' : chats.length, icon: MessagesSquare, accent: false },
        ].map(({ label, value, icon: Icon, accent, warn }) => (
          <Card key={label} className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-mono">{label}</span>
              <Icon
                size={15}
                className={accent ? 'text-status-ok' : warn ? 'text-status-down' : 'text-muted'}
                aria-hidden="true"
              />
            </div>
            <span
              className={`font-heading text-2xl font-extrabold ${accent ? 'text-status-ok' : warn && value > 0 ? 'text-status-down' : 'text-foreground'}`}
            >
              {value}
            </span>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: recent docs + recent chats */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Quick actions */}
          <motion.div variants={riseItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 flex flex-col gap-3 border-accent/20 hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-accent" aria-hidden="true" />
                <h3 className="font-heading text-sm font-bold text-foreground">Upload a PDF</h3>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Add a new document to your library. DOCly will extract, chunk, embed, and index it automatically.
              </p>
              <Button variant="accent" size="sm" onClick={openFilePicker} disabled={isUploading} aria-label="Upload a PDF">
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {isUploading ? 'Uploading...' : 'Upload PDF'}
              </Button>
            </Card>
            <Card className="p-5 flex flex-col gap-3 hover:border-line-luminous transition-colors">
              <div className="flex items-center gap-2">
                <MessagesSquare size={18} className="text-accent" aria-hidden="true" />
                <h3 className="font-heading text-sm font-bold text-foreground">Start a Chat</h3>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Select processed documents and ask questions. Get grounded answers with page-level citations.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate?.('chats')}
                aria-label="Go to chats"
              >
                <MessagesSquare size={14} />
                Open Chats
                <ArrowRight size={13} className="ml-auto" />
              </Button>
            </Card>
          </motion.div>

          {/* Recent documents */}
          <motion.div variants={riseItem}>
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between border-b border-line/60 pb-3">
                <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <FileText size={16} className="text-accent" />
                  Recent Documents
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate?.('documents')}
                  className="text-xs text-accent hover:text-accent-hover font-mono transition-colors flex items-center gap-1 cursor-pointer"
                >
                  View all <ArrowRight size={11} />
                </button>
              </div>

              {docsState === 'loading' && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={22} className="animate-spin text-accent" />
                </div>
              )}

              {docsState === 'ready' && documents.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/40 py-10 text-center">
                  <FileText size={24} className="text-muted mb-2" aria-hidden="true" />
                  <p className="text-xs text-secondary">No documents yet. Upload your first PDF.</p>
                </div>
              )}

              {docsState === 'ready' && recentDocs.length > 0 && (
                <ul className="space-y-2">
                  {recentDocs.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center gap-3 rounded-xl border border-line bg-canvas/50 px-3 py-2.5 hover:border-line-luminous hover:bg-canvas/80 transition-all"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[doc.status] ?? 'bg-muted'}`} aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground" title={doc.original_filename}>
                          {doc.original_filename}
                        </p>
                        <p className="text-[11px] text-muted font-mono">
                          {formatFileSize(doc.file_size)} · {doc.status}
                        </p>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted font-mono hidden sm:block">
                        {formatDate(doc.upload_timestamp)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.div>

          {/* Recent chats */}
          <motion.div variants={riseItem}>
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between border-b border-line/60 pb-3">
                <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <MessagesSquare size={16} className="text-accent" />
                  Recent Chats
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate?.('chats')}
                  className="text-xs text-accent hover:text-accent-hover font-mono transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Open Chats <ArrowRight size={11} />
                </button>
              </div>

              {chatsState === 'loading' && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={22} className="animate-spin text-accent" />
                </div>
              )}

              {chatsState === 'ready' && chats.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/40 py-10 text-center">
                  <MessagesSquare size={24} className="text-muted mb-2" aria-hidden="true" />
                  <p className="text-xs text-secondary">No conversations yet. Go to Chats to start asking questions.</p>
                </div>
              )}

              {chatsState === 'ready' && recentChats.length > 0 && (
                <ul className="space-y-2">
                  {recentChats.map((chat) => (
                    <li
                      key={chat.id}
                      className="flex items-center gap-3 rounded-xl border border-line bg-canvas/50 px-3 py-2.5 hover:border-line-luminous hover:bg-canvas/80 transition-all cursor-pointer"
                      onClick={() => onNavigate?.('chats')}
                    >
                      <MessagesSquare size={15} className="shrink-0 text-muted" aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {chat.title || `Chat #${chat.id}`}
                        </p>
                        <p className="text-[11px] text-muted font-mono">
                          {chat.document_ids?.length ?? 0} doc{chat.document_ids?.length !== 1 ? 's' : ''}
                        </p>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted font-mono hidden sm:flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(chat.updated_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Right column: engine status + pipeline */}
        <div className="flex flex-col gap-6">
          <motion.aside variants={riseItem} aria-label="System status">
            <Card className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <Cpu size={16} aria-hidden="true" className="text-accent" />
                  Engine Status
                </h2>
                <Wifi size={15} aria-hidden="true" className="text-muted" />
              </div>
              <SystemStatus status={status} />
              <div className="space-y-2.5">
                {[
                  { label: 'LLM Model', value: 'llama3.2:3b', accent: true },
                  { label: 'Vector Store', value: 'FAISS (local)' },
                  { label: 'Embeddings', value: 'all-MiniLM-L6-v2' },
                  { label: 'Database', value: 'PostgreSQL' },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="rounded-xl border border-line bg-canvas/60 px-3 py-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-secondary">{label}</span>
                      <span className={`font-mono font-semibold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.aside>

          {/* How DOCly works */}
          <motion.div variants={riseItem}>
            <Card className="p-5">
              <div className="mb-4 border-b border-line/60 pb-3">
                <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <Database size={16} className="text-accent" />
                  How DOCly Works
                </h2>
              </div>
              <ol className="space-y-2.5">
                {PIPELINE_STEPS.map((step, i) => (
                  <li key={step.label} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 border border-accent/30 text-[10px] font-bold text-accent mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{step.label}</p>
                      <p className="text-[11px] text-muted leading-snug">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[11px] text-muted border-t border-line/40 pt-3 leading-relaxed">
                Answers are strictly grounded in your selected documents. No data leaves your machine.
              </p>
            </Card>
          </motion.div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelected}
        disabled={isUploading}
        className="sr-only"
        aria-label="Choose a PDF file to upload"
      />
    </motion.div>
  )
}
