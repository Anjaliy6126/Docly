import { BackgroundEffects } from './BackgroundEffects'

/**
 * Modern Top-Navigation Application Shell:
 * - 3D Atmospheric background (z-0)
 * - Sticky Top Navigation Bar (z-40)
 * - Spacious, balanced centered main workspace (max-w-7xl)
 */
export function AppShell({ navbar, children }) {
  return (
    <div className="relative min-h-screen bg-canvas text-foreground flex flex-col selection:bg-accent/30 overflow-x-hidden">
      {/* 3D Atmospheric Background */}
      <BackgroundEffects />

      {/* Sticky Top Navigation Bar */}
      {navbar}

      {/* Main Workspace (Full width balanced container) */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {children}
      </main>
    </div>
  )
}
