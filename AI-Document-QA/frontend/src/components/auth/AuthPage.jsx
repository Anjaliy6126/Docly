import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../../context/AuthContext'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { cn } from '../../lib/utils'
import { BackgroundEffects } from '../layout/BackgroundEffects'
import { Sparkles } from 'lucide-react'
import doclyLogo from '../../assets/docly-logo.png'

/**
 * Modern AI Auth Page (Black + Red Cinematic Theme):
 * - 3D atmospheric background with crimson glowing orbs
 * - Charcoal glassmorphic card
 * - Stitch visual design
 */
export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent drop-shadow-[0_0_8px_rgba(255,30,30,0.8)]" />
          <p className="text-sm text-secondary font-mono">Restoring workspace session...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-canvas text-foreground flex flex-col justify-center overflow-hidden">
      {/* 3D Atmospheric Background */}
      <BackgroundEffects />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden border border-accent/40 shadow-[0_0_30px_rgba(229,9,20,0.35)]">
            <img
              src={doclyLogo}
              alt="DOCly logo"
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-accent border-2 border-canvas" />
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-line-luminous bg-accent/10 px-3 py-0.5 text-xs font-mono font-semibold tracking-wider text-accent uppercase mb-2">
            <Sparkles size={11} className="text-accent" />
            <span>Local RAG System</span>
          </div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground md:text-3xl bg-gradient-to-r from-foreground via-slate-100 to-secondary bg-clip-text text-transparent">
            DOCly
          </h1>
          <p className="mt-1 text-xs text-secondary md:text-sm">
            AI Document Intelligence
          </p>
        </motion.div>

        {/* Glassmorphic Auth Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="rounded-3xl border border-line bg-surface/80 backdrop-blur-2xl p-6 shadow-2xl md:p-8">
            {/* Toggle Tabs */}
            <div className="mb-6 flex rounded-2xl border border-line bg-nested/60 p-1">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={cn(
                  'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer',
                  isLogin
                    ? 'bg-accent/15 text-white shadow-md border border-accent/40 glow-red'
                    : 'text-secondary hover:text-foreground'
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={cn(
                  'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer',
                  !isLogin
                    ? 'bg-accent/15 text-white shadow-md border border-accent/40 glow-red'
                    : 'text-secondary hover:text-foreground'
                )}
              >
                Create Account
              </button>
            </div>

            {/* Form Transitions */}
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <LoginForm />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <RegisterForm />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted font-mono">
              Powered by local Ollama (Llama 3.2:3b) &amp; FAISS
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}