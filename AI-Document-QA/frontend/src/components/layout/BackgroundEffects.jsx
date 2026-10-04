import { motion } from 'motion/react'

/**
 * Atmospheric Cinematic 3D Background:
 * - Near-black base (#060709)
 * - Multi-layered blurred ambient glowing orbs (deep crimson #8B0000, vibrant red #E50914)
 * - Subtle perspective grid with radial gradient fade
 * - Top crimson luminous light beam
 * Completely pointer-events-none so it never interrupts clicks, selection, or scrolling.
 */
export function BackgroundEffects() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Base perspective grid with soft radial mask */}
      <div className="absolute inset-0 bg-perspective-grid opacity-45" />
      <div className="absolute inset-0 bg-grid-dots opacity-20 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      {/* Ambient Orb 1: Primary Crimson Red (Top-Center / Left) */}
      <motion.div
        animate={{
          x: [0, 25, -15, 0],
          y: [0, -20, 15, 0],
          scale: [1, 1.08, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-32 left-1/4 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[140px]"
      />

      {/* Ambient Orb 2: Deep Dark Crimson (Center-Right) */}
      <motion.div
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 25, -20, 0],
          scale: [1, 0.94, 1.06, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/3 -right-20 h-[580px] w-[580px] rounded-full bg-primary-indigo/12 blur-[150px]"
      />

      {/* Ambient Orb 3: Subtle Blood-Red Glow (Bottom-Left) */}
      <motion.div
        animate={{
          x: [0, 20, -25, 0],
          y: [0, -15, 25, 0],
          scale: [1, 1.05, 0.92, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-32 left-10 h-[500px] w-[500px] rounded-full bg-ai/9 blur-[140px]"
      />

      {/* Top subtle horizontal red luminous beam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-3/4 max-w-4xl bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
    </div>
  )
}
