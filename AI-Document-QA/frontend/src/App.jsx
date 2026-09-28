import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Sidebar } from './components/layout/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { useBackendHealth } from './hooks/useBackendHealth'

function App() {
  const [activeItem, setActiveItem] = useState('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { status } = useBackendHealth()

  const sidebar = {
    mobileOpen: mobileNavOpen,
    onOpenMobile: () => setMobileNavOpen(true),
    onCloseMobile: () => setMobileNavOpen(false),
    element: (
      <Sidebar
        activeItem={activeItem}
        onNavigate={(id) => {
          setActiveItem(id)
          setMobileNavOpen(false)
        }}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        status={status}
      />
    ),
  }

  return (
    <AppShell sidebar={sidebar} status={status}>
      <Dashboard status={status} />
    </AppShell>
  )
}

export default App
