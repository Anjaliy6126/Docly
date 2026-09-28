import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, FileText, Loader2, Upload, Wifi, XCircle } from 'lucide-react'
import { uploadDocument } from '../services/api'
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

/** Small fade-in for the upload status panel that appears after an action. */
const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

/**
 * Dashboard workspace: hero message, document area with real PDF upload,
 * and a real backend status panel.
 */
export function Dashboard({ status }) {
  const fileInputRef = useRef(null)
  // uploadState: 'idle' | 'uploading' | 'success' | 'error'
  const [uploadState, setUploadState] = useState('idle')
  const [uploadedFilename, setUploadedFilename] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  const isUploading = uploadState === 'uploading'

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
    } catch (error) {
      setUploadState('error')
      setUploadError(
        error instanceof Error ? error.message : 'Upload failed. Please try again.',
      )
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

            {uploadState === 'success' ? (
              /* Success state — real upload result, no fake document cards */
              <motion.div
                {...fadeIn}
                role="status"
                className="flex flex-col items-center justify-center rounded-xl border border-line-luminous bg-canvas/60 px-6 py-12 text-center"
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-nested text-status-ok">
                  <CheckCircle2 size={26} aria-hidden="true" />
                </span>
                <p className="font-heading text-sm font-semibold text-foreground">
                  Upload complete
                </p>
                <p className="mt-1 max-w-md text-sm text-secondary">
                  <span className="font-medium text-foreground">
                    {uploadedFilename}
                  </span>{' '}
                  was uploaded and is ready for questions.
                </p>
                <Button
                  variant="ghost"
                  className="mt-5"
                  onClick={openFilePicker}
                  disabled={isUploading}
                >
                  <Upload size={16} aria-hidden="true" />
                  Upload another PDF
                </Button>
              </motion.div>
            ) : uploadState === 'error' ? (
              /* Error state — readable message, retry stays available */
              <motion.div
                {...fadeIn}
                role="alert"
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-6 py-12 text-center"
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-nested text-status-down">
                  <XCircle size={26} aria-hidden="true" />
                </span>
                <p className="font-heading text-sm font-semibold text-foreground">
                  Upload failed
                </p>
                <p className="mt-1 max-w-md text-sm text-secondary">
                  {uploadError}
                </p>
                <Button className="mt-5" onClick={openFilePicker}>
                  <Upload size={16} aria-hidden="true" />
                  Try again
                </Button>
              </motion.div>
            ) : (
              /* Idle / uploading empty state */
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
              features. Chats and documents will appear here once connected.
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
