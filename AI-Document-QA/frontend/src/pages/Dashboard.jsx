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
} from 'lucide-react'
import { deleteDocument, getDocuments, uploadDocument } from '../services/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SystemStatus } from '../components/SystemStatus'

/* Subtle, fast entrance animation: shared stagger + fade/rise items. */
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const riseItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

/* Small fade-in for upload status banners that appear after an action. */
const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

/* Real backend processing statuses only. Unknown values fall back to muted. */
const STATUS_STYLES = {
  processed: { dot: 'bg-status-ok', text: 'text-status-ok', label: 'Processed' },
  processing: { dot: 'bg-accent animate-pulse', text: 'text-accent', label: 'Processing' },
  uploaded: { dot: 'bg-muted', text: 'text-secondary', label: 'Uploaded' },
  failed: { dot: 'bg-status-down', text: 'text-status-down', label: 'Failed' },
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? { dot: 'bg-muted', text: 'text-secondary', label: status }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-nested px-2.5 py-1 text-xs font-medium ${style.text}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}

/** Human-readable file size: 1024 -> "1.0 KB", 1048576 -> "1.0 MB". */
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

/** Readable upload date using the browser's own formatter; "—" when invalid. */
function formatDate(timestamp) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function readableError(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

/**
 * Dashboard workspace: hero message, real document list with upload/delete,
 * and a real backend status panel.
 */
export function Dashboard({ status }) {
  const fileInputRef = useRef(null)
  // uploadState: 'idle' | 'uploading' | 'success' | 'error'
  const [uploadState, setUploadState] = useState('idle')
  const [uploadedFilename, setUploadedFilename] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  // Document list: 'loading' | 'error' | 'ready'
  const [docsState, setDocsState] = useState('loading')
  const [docsError, setDocsError] = useState(null)
  const [documents, setDocuments] = useState([])

  // Delete flow: inline per-row confirmation
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const isUploading = uploadState === 'uploading'

  /* Load documents once on mount; reused after uploads and for retry. */
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
    // Reset any previous selection so picking the same file again
    // still fires the change event.
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return // empty selection — nothing to do

    // Frontend PDF validation (backend validates too; this is for UX).
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
      // Refresh the list so the new document appears automatically.
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
      // Remove from local state — no page refresh needed.
      setDocuments((docs) => docs.filter((d) => d.id !== doc.id))
      setDeleteTargetId(null)
    } catch (error) {
      // Keep the document visible and show a readable error.
      setDeleteError(`Could not delete "${doc.original_filename}": ${readableError(error)}`)
      setDeleteTargetId(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      {/* Hero */}
      <motion.section variants={riseItem} className="mb-8">
        <p className="mb-2 font-mono text-xs font-medium tracking-widest text-accent uppercase">
          AI Document Q&amp;A
        </p>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          Your documents, your knowledge.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-secondary md:text-base">
          Upload college PDFs and ask questions about them. Answers come only
          from the documents you select — grounded, with page-level sources.
        </p>
      </motion.section>

      {/* Workspace grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Document area */}
        <motion.section
          variants={riseItem}
          className="lg:col-span-2"
          aria-label="Documents"
        >
          <Card className="p-6 md:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-heading text-base font-bold text-foreground">
                Documents
              </h2>
              <Button
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
                {isUploading ? 'Uploading...' : 'Upload PDF'}
              </Button>
            </div>

            {/* Upload success banner — real upload result */}
            {uploadState === 'success' && (
              <motion.div
                {...fadeIn}
                role="status"
                className="mb-4 flex items-center gap-3 rounded-xl border border-line-luminous bg-canvas/60 px-4 py-3"
              >
                <CheckCircle2 size={18} aria-hidden="true" className="shrink-0 text-status-ok" />
                <p className="text-sm text-secondary">
                  <span className="font-medium text-foreground">{uploadedFilename}</span>{' '}
                  was uploaded and is ready for questions.
                </p>
              </motion.div>
            )}

            {/* Upload error banner — readable message, retry available */}
            {uploadState === 'error' && (
              <motion.div
                {...fadeIn}
                role="alert"
                className="mb-4 flex items-center gap-3 rounded-xl border border-status-down/40 bg-canvas/60 px-4 py-3"
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

            {/* Delete error banner — document stays visible */}
            {deleteError && (
              <motion.div
                {...fadeIn}
                role="alert"
                className="mb-4 flex items-center gap-3 rounded-xl border border-status-down/40 bg-canvas/60 px-4 py-3"
              >
                <XCircle size={18} aria-hidden="true" className="shrink-0 text-status-down" />
                <p className="text-sm text-secondary">{deleteError}</p>
              </motion.div>
            )}

            {/* List loading state */}
            {docsState === 'loading' && (
              <div
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-6 py-12 text-center"
                role="status"
              >
                <Loader2 size={26} aria-hidden="true" className="mb-4 animate-spin text-accent" />
                <p className="text-sm text-secondary">Loading documents...</p>
              </div>
            )}

            {/* List error state — retry available */}
            {docsState === 'error' && (
              <div
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-6 py-12 text-center"
                role="alert"
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-nested text-status-down">
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
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-6 py-12 text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-nested text-accent">
                  {isUploading ? (
                    <Loader2 size={26} aria-hidden="true" className="animate-spin" />
                  ) : (
                    <FileText size={26} aria-hidden="true" />
                  )}
                </span>
                <p className="font-heading text-sm font-semibold text-foreground">
                  {isUploading ? 'Uploading your document...' : 'No documents yet'}
                </p>
                <p className="mt-1 max-w-xs text-sm text-secondary">
                  {isUploading
                    ? 'The backend is extracting and indexing your PDF. This can take a moment.'
                    : 'Upload a college document to start asking questions.'}
                </p>
                <Button
                  className="mt-5"
                  onClick={openFilePicker}
                  disabled={isUploading}
                  aria-label="Upload a PDF document"
                >
                  {isUploading ? (
                    <Loader2 size={16} aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Upload size={16} aria-hidden="true" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload PDF'}
                </Button>
              </div>
            )}

            {/* Real document list */}
            {docsState === 'ready' && documents.length > 0 && (
              <motion.ul
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                aria-label="Uploaded documents"
                className="space-y-2"
              >
                {documents.map((doc) => {
                  const isDeleteTarget = deleteTargetId === doc.id
                  const isDeleting = deletingId === doc.id
                  return (
                    <motion.li
                      key={doc.id}
                      variants={riseItem}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-line bg-canvas/60 px-4 py-3 transition-colors duration-150 hover:border-line-luminous md:gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nested text-accent"
                        >
                          <FileText size={18} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-medium text-foreground"
                            title={doc.original_filename}
                          >
                            {doc.original_filename}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {formatFileSize(doc.file_size)} · Uploaded{' '}
                            {formatDate(doc.upload_timestamp)}
                          </p>
                        </div>
                      </div>

                      <div className="flex w-full sm:w-auto shrink-0 items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0">
                        <StatusBadge status={doc.status} />

                        {isDeleteTarget ? (
                          /* Inline delete confirmation */
                          <div
                            className="flex shrink-0 items-center gap-2"
                            role="group"
                            aria-label={`Confirm deletion of ${doc.original_filename}`}
                          >
                            <span className="hidden text-xs text-secondary lg:inline">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 px-2"
                            onClick={() => requestDelete(doc)}
                            disabled={deletingId !== null}
                            aria-label={`Delete ${doc.original_filename}`}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </motion.li>
                  )
                })}
              </motion.ul>
            )}
          </Card>
        </motion.section>

        {/* System status panel — real GET /health only */}
        <motion.aside variants={riseItem} aria-label="System status">
          <Card className="h-full p-6">
            <div className="mb-4 flex items-center gap-2">
              <Wifi size={16} aria-hidden="true" className="text-muted" />
              <h2 className="font-heading text-base font-bold text-foreground">
                System
              </h2>
            </div>
            <SystemStatus status={status} />
            <p className="mt-4 text-xs leading-relaxed text-muted">
              The backend serves document storage, RAG search, and chat
              features. Chats will appear here once connected.
            </p>
          </Card>
        </motion.aside>
      </div>

      {/* Hidden file input — triggered by the Upload PDF buttons */}
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
