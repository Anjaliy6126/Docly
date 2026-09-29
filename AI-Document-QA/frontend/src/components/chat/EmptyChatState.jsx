import { motion } from 'motion/react'
import { MessagesSquare } from 'lucide-react'

const SUGGESTIONS = [
  'What are the important deadlines?',
  'What are the eligibility requirements?',
  'Summarize the key points',
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export function EmptyChatState() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-1 flex-col items-center justify-center p-6 text-center"
    >
      <motion.div
        variants={itemVariants}
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-nested text-accent"
      >
        <MessagesSquare size={32} aria-hidden="true" />
      </motion.div>
      <motion.h2
        variants={itemVariants}
        className="font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl"
      >
        Ask questions about your documents
      </motion.h2>
      <motion.p variants={itemVariants} className="mt-2 max-w-md text-sm text-secondary">
        Your answers will be grounded in the documents you select.
      </motion.p>

      <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-2 w-full max-w-sm">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="rounded-xl border border-line bg-canvas/60 px-4 py-3 text-left text-sm text-secondary transition-colors hover:border-line-luminous hover:bg-raised hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </motion.div>
    </motion.div>
  )
}
