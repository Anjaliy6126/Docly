import { motion } from 'motion/react'
import { FileText, Upload, Wifi } from 'lucide-react'
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

/**
 * Dashboard workspace: hero message, document area (empty state),
 * and a real backend status panel. Upload is UI-only in this step.
 */
export function Dashboard({ status }) {
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
              <Button size="sm">
                <Upload size={15} aria-hidden="true" />
                Upload PDF
              </Button>
            </div>

            {/* Empty state */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-6 py-12 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-nested text-accent">
                <FileText size={26} aria-hidden="true" />
              </span>
              <p className="font-heading text-sm font-semibold text-foreground">
                No documents yet
              </p>
              <p className="mt-1 max-w-xs text-sm text-secondary">
                Upload a college document to start asking questions.
              </p>
              <Button className="mt-5">
                <Upload size={16} aria-hidden="true" />
                Upload PDF
              </Button>
            </div>
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
    </motion.div>
  )
}
