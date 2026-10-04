import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { AppShell } from './components/layout/AppShell'
import { TopNav } from './components/layout/TopNav'
import { Dashboard } from './pages/Dashboard'
import { Documents } from './pages/Documents'
import { Chat } from './pages/Chat'
import { useBackendHealth } from './hooks/useBackendHealth'

/**
 * App renderer:
 * Renders TopNav + the active page (Dashboard / Documents / Chat) when
 * authenticated, otherwise renders the AuthPage.
 */
function AppRenderer() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [activeItem, setActiveItem] = useState('dashboard')
  const { status } = useBackendHealth()

  // Render auth page loading state while session is being verified
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  // Unauthenticated: show login/register page
  if (!isAuthenticated) {
    return <AuthPage />
  }

  const navbar = (
    <TopNav
      activeItem={activeItem}
      onNavigate={(id) => setActiveItem(id)}
      user={user}
      onLogout={logout}
      status={status}
    />
  )

  function renderPage() {
    if (activeItem === 'chats') return <Chat />
    if (activeItem === 'documents') return <Documents />
    return <Dashboard status={status} onNavigate={setActiveItem} />
  }

  return (
    <AppShell navbar={navbar}>
      {renderPage()}
    </AppShell>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRenderer />
    </AuthProvider>
  )
}

export default App
