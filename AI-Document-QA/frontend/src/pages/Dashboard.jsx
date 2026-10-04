import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  CheckCircle2,
  FileText,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
  Wifi,
  XCircle,
  Sparkles,
  Database,
  Cpu,
} from 'lucide-react'
import { deleteDocument, getDocuments, uploadDocument } from '../services/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SystemStatus } from '../components/SystemStatus'

/* Fast entrance animations */
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const riseItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

const STATUS_STYLES = {
  processed: {
    dot: 'bg-status-ok shadow-[0_0_8px_rgba(16,185,129,0.8)]',
    text: 'text-status-ok',
    label: 'Processed',
    border: 'border-status-ok/25 bg-status-ok/10',
  },
  processing: {
    dot: 'bg-accent animate-pulse shadow-[0_0_8px_rgba(255,30,30,0.8)]',
    text: 'text-accent',
    label: 'Processing',
    border: 'border-accent/25 bg-accent/10',
  },
  uploaded: {
    dot: 'bg-muted',
    text: 'text-secondary',
    label: 'Uploaded',
    border: 'border-line bg-nested/40',
  },
  failed: {
    dot: 'bg-status-down shadow-[0_0_8px_rgba(255,30,30,0.8)]',
    text: 'text-status-down',
    label: 'Failed',
    border: 'border-status-down/25 bg-status-down/10',
  },
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? {
    dot: 'bg-muted',
    text: 'text-secondary',
    label: status,
    border: 'border-line bg-nested',
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${style.border} ${style.text}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
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

function formatDate(timestamp) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function readableError(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function Dashboard({ status }) {
  const fileInputRef = useRef(null)
  const [uploadState, setUploadState] = useState('idle')
  const [uploadedFilename, setUploadedFilename] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  const [docsState, setDocsState] = useState('loading')
  const [docsError, setDocsError] = useState(null)
  const [documents, setDocuments] = useState([])

  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const isUploading = uploadState === 'uploading'

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments()
      setDocuments(docs)
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
      setUploadedFilename(null)
      setUploadError('Please select a PDF file (.pdf). Other file types are not supported.')
      return
    }

    setUploadState('uploading')
    setUploadError(null)
    setUploadedFilename(null)

    try {
      const document = await uploadDocument(file)
      setUploadedFilename(document.original_filename || file.name)
      setUploadState('success')
      await loadDocuments()
    } catch (error) {
      setUploadState('error')
      setUploadError(readableError(error))
    }
  }

  const requestDelete = (doc) => {
    if (deletingId !== null) return
    setDeleteError(null)
    setDeleteTargetId(doc.id)
  }

  const cancelDelete = () => {
    setDeleteTargetId(null)
    setDeleteError(null)
  }

  const confirmDelete = async (doc) => {
    setDeletingId(doc.id)
    setDeleteError(null)
    try {
      await deleteDocument(doc.id)
      setDocuments((docs) => docs.filter((d) => d.id !== doc.id))
      setDeleteTargetId(null)
    } catch (error) {
      setDeleteError(`Could not delete "${doc.original_filename}": ${readableError(error)}`)
      setDeleteTargetId(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      {/* Hero Header */}
      <motion.section variants={riseItem} className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-line-luminous bg-accent/10 px-3 py-1 text-xs font-mono font-semibold tracking-wider text-accent uppercase mb-3 shadow-[0_0_15px_rgba(229,9,20,0.2)]">
          <Sparkles size={13} className="text-accent" />
          <span>DOCly · AI Document Intelligence</span>
        </div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight md:text-4xl bg-gradient-to-r from-foreground via-slate-100 to-secondary bg-clip-text text-transparent">
          Your documents, grounded intelligence.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary md:text-base">
          Upload PDFs, ask questions, get grounded answers with page-level citations — powered by
          local Ollama (Llama 3.2:3b) and FAISS vector search. No cloud. No API keys.
        </p>
      </motion.section>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Document Management Section */}
        <motion.section
          variants={riseItem}
          className="lg:col-span-2"
          aria-label="Documents"
        >
          <Card className="p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-line/60 pb-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <Database size={18} className="text-accent" />
                  Knowledge Documents
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {documents.length} document{documents.length !== 1 ? 's' : ''} indexed in vector store
                </p>
              </div>
              <Button
                variant="accent"
                size="sm"
                onClick={openFilePicker}
                disabled={isUploading}
                aria-label="Upload a PDF document"
              >
                {isUploading ? (
                  <Loader2 size={15} aria-hidden="true" className="animate-spin" />
                ) : (
                  <Upload size={15} aria-hidden="true" />
                )}
                {isUploading ? 'Extracting & Indexing...' : 'Upload PDF'}
              </Button>
            </div>

            {/* Upload status banner — success */}
            {uploadState === 'success' && (
              <motion.div
                {...fadeIn}
                role="status"
                className="mb-4 flex items-center gap-3 rounded-xl border border-status-ok/30 bg-status-ok/10 px-4 py-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <CheckCircle2 size={18} aria-hidden="true" className="shrink-0 text-status-ok" />
                <p className="text-sm text-secondary">
                  <span className="font-semibold text-foreground">{uploadedFilename}</span> was extracted,
                  chunked, embedded, and is ready for questions.
                </p>
              </motion.div>
            )}

            {/* Upload status banner — error */}
            {uploadState === 'error' && (
              <motion.div
                {...fadeIn}
                role="alert"
                className="mb-4 flex items-center gap-3 rounded-xl border border-status-down/40 bg-status-down/10 px-4 py-3 shadow-[0_0_15px_rgba(255,30,30,0.15)]"
              >
                <XCircle size={18} aria-hidden="true" className="shrink-0 text-status-down" />
                <p className="text-sm text-secondary">{uploadError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto shrink-0"
                  onClick={openFilePicker}
                >
                  Try again
                </Button>
              </motion.div>
            )}

            {/* Delete error banner */}
            {deleteError && (
              <motion.div
                {...fadeIn}
                role="alert"
                className="mb-4 flex items-center gap-3 rounded-xl border border-status-down/40 bg-status-down/10 px-4 py-3"
              >
                <XCircle size={18} aria-hidden="true" className="shrink-0 text-status-down" />
                <p className="text-sm text-secondary">{deleteError}</p>
              </motion.div>
            )}

            {/* Loading state */}
            {docsState === 'loading' && (
              <div
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/40 px-6 py-14 text-center"
                role="status"
              >
                <Loader2 size={28} aria-hidden="true" className="mb-4 animate-spin text-accent" />
                <p className="text-sm text-secondary">Loading your document library...</p>
              </div>
            )}

            {/* Error state */}
            {docsState === 'error' && (
              <div
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/40 px-6 py-14 text-center"
                role="alert"
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-down/10 text-status-down border border-status-down/20">
                  <XCircle size={26} aria-hidden="true" />
                </span>
                <p className="font-heading text-sm font-semibold text-foreground">
                  Could not load documents
                </p>
                <p className="mt-1 max-w-md text-sm text-secondary">{docsError}</p>
                <Button variant="ghost" className="mt-5" onClick={loadDocuments}>
                  <RotateCcw size={16} aria-hidden="true" />
                  Retry
                </Button>
              </div>
            )}

            {/* Empty state */}
            {docsState === 'ready' && documents.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-luminous bg-canvas/30 px-6 py-16 text-center shadow-inner">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-indigo/30 via-accent/20 to-primary/25 text-accent border border-accent/40 shadow-[0_0_25px_rgba(229,9,20,0.3)]">
                  {isUploading ? (
                    <Loader2 size={30} aria-hidden="true" className="animate-spin text-accent" />
                  ) : (
                    <FileText size={30} aria-hidden="true" className="text-white drop-shadow-[0_0_8px_rgba(255,30,30,0.7)]" />
                  )}
                </span>
                <p className="font-heading text-base font-bold text-foreground">
                  {isUploading ? 'Processing & Vectorizing PDF...' : 'No documents indexed yet'}
                </p>
                <p className="mt-1 max-w-sm text-xs text-secondary leading-relaxed">
                  {isUploading
                    ? 'Extracting text with PyMuPDF, generating Sentence Transformer embeddings, and building the FAISS index.'
                    : 'Upload your documents — research papers, reports, manuals, or any PDF — to start grounded Q&A.'}
                </p>
                <Button
                  variant="accent"
                  className="mt-6"
                  onClick={openFilePicker}
                  disabled={isUploading}
                  aria-label="Upload a PDF document"
                >
                  {isUploading ? (
                    <Loader2 size={16} aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Upload size={16} aria-hidden="true" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload First PDF'}
                </Button>
              </div>
            )}

            {/* Document list */}
            {docsState === 'ready' && documents.length > 0 && (
              <motion.ul
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                aria-label="Uploaded documents"
                className="space-y-3"
              >
                {documents.map((doc) => {
                  const isDeleteTarget = deleteTargetId === doc.id
                  const isDeleting = deletingId === doc.id
                  return (
                    <motion.li
                      key={doc.id}
                      variants={riseItem}
                      className="group flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-2xl border border-line bg-canvas/60 px-4 py-3.5 transition-all duration-200 hover:border-line-luminous hover:bg-canvas/90 hover:shadow-[0_0_20px_rgba(229,9,20,0.1)] md:gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 w-full sm:w-auto">
                        <span
                          aria-hidden="true"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-raised to-nested border border-line text-accent shadow-inner group-hover:border-accent/40 group-hover:text-accent-hover transition-colors"
                        >
                          <FileText size={20} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-semibold text-foreground group-hover:text-white transition-colors"
                            title={doc.original_filename}
                          >
                            {doc.original_filename}
                          </p>
                          <p className="mt-0.5 text-xs text-muted font-mono">
                            {formatFileSize(doc.file_size)} · {formatDate(doc.upload_timestamp)}
                          </p>
                        </div>
                      </div>

                      <div className="flex w-full sm:w-auto shrink-0 items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0">
                        <StatusBadge status={doc.status} />

                        {isDeleteTarget ? (
                          <div
                            className="flex shrink-0 items-center gap-2"
                            role="group"
                            aria-label={`Confirm deletion of ${doc.original_filename}`}
                          >
                            <span className="hidden text-xs text-secondary lg:inline font-mono">
                              Delete?
                            </span>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => confirmDelete(doc)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <Loader2 size={14} aria-hidden="true" className="animate-spin" />
                              ) : (
                                <Trash2 size={14} aria-hidden="true" />
                              )}
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelDelete}
                              disabled={isDeleting}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => requestDelete(doc)}
                            disabled={deletingId !== null}
                            aria-label={`Delete ${doc.original_filename}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-all hover:bg-status-down/10 hover:text-status-down hover:border hover:border-status-down/30 cursor-pointer"
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </motion.li>
                  )
                })}
              </motion.ul>
            )}
          </Card>
        </motion.section>

        {/* System & Engine Status Panel */}
        <motion.aside variants={riseItem} aria-label="System architecture status">
          <Card className="h-full p-6 flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-line/60 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu size={18} aria-hidden="true" className="text-accent" />
                  <h2 className="font-heading text-base font-bold text-foreground">
                    Engine Pipeline
                  </h2>
                </div>
                <Wifi size={16} aria-hidden="true" className="text-muted" />
              </div>

              <div className="mb-5">
                <SystemStatus status={status} />
              </div>

              {/* Architecture specs badges */}
              <div className="space-y-3">
                <div className="rounded-xl border border-line bg-canvas/60 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">LLM Model</span>
                    <span className="font-mono font-semibold text-accent">llama3.2:3b (Ollama)</span>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-canvas/60 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">Vector Store</span>
                    <span className="font-mono font-semibold text-foreground">FAISS Index</span>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-canvas/60 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">Embeddings</span>
                    <span className="font-mono font-semibold text-foreground">Sentence Transformers</span>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-canvas/60 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">Database</span>
                    <span className="font-mono font-semibold text-foreground">PostgreSQL + SQLAlchemy</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-[11px] leading-relaxed text-muted border-t border-line/40 pt-3">
              RAG answers query only your own vectorized documents with cosine similarity scoring.
            </p>
          </Card>
        </motion.aside>
      </div>

      {/* Hidden file input */}
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
