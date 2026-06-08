// =============================================================================
// ShiftSync — Auth Context
// =============================================================================
// Provides: currentUser, token, login(), logout(), loading
// TODO: Implement login/logout API calls and token persistence.
// =============================================================================

import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: if token exists, fetch /api/auth/me/ to restore user session
    setLoading(false)
  }, [token])

  const login = async (email, password) => {
    // TODO: POST /api/auth/login/ → store token, set currentUser
  }

  const logout = async () => {
    // TODO: POST /api/auth/logout/ → clear token and currentUser
    localStorage.removeItem('token')
    setToken(null)
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
