import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  loginUser,
  registerUser,
  setAuthSession,
  clearAuth,
  getStoredAuth,
} from '../services/api'

export const AuthContext = createContext(null)

/**
 * Authentication context provider.
 * Manages user session state (token + user) in memory and localStorage.
 * Listens for 401 events from the API layer to auto-logout.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = getStoredAuth()
    return stored?.user ?? null
  })

  const [token, setToken] = useState(() => {
    const stored = getStoredAuth()
    return stored?.token ?? null
  })

  const [isLoading] = useState(false)

  const logout = useCallback(() => {
    clearAuth()
    setToken(null)
    setUser(null)
  }, [])

  // Listen for 401 unauthorized events from the API layer
  useEffect(() => {
    const handleUnauthorized = () => {
      logout()
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [logout])

  const login = useCallback(async (email, password) => {
    const result = await loginUser(email, password)
    setAuthSession(result.access_token, result.user)
    setToken(result.access_token)
    setUser(result.user)
    return result
  }, [])

  const register = useCallback(async (name, email, password) => {
    await registerUser(name, email, password)
    // Auto-login after successful registration
    const loginResult = await loginUser(email, password)
    setAuthSession(loginResult.access_token, loginResult.user)
    setToken(loginResult.access_token)
    setUser(loginResult.user)
    return loginResult
  }, [])

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
    register,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}