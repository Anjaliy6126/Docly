import { useEffect, useState } from 'react'
import { checkBackendHealth } from '../services/api'

/**
 * Poll the backend health endpoint.
 *
 * status: 'checking'   — request in flight
 *         'connected'  — backend answered OK
 *         'offline'    — backend unreachable
 */
export function useBackendHealth(pollMs = 30000) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true

    const check = async () => {
      const ok = await checkBackendHealth()
      if (active) setStatus(ok ? 'connected' : 'offline')
    }

    check()
    const interval = setInterval(check, pollMs)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [pollMs])

  return { status }
}
