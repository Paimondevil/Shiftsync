import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.get('/auth/me/')
        .then(res => setCurrentUser(res.data))
        .catch(() => {
          localStorage.removeItem('token')
          setToken(null)
          setCurrentUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    const res = await api.post('/auth/login/', { email, password })
    const { token, user } = res.data
    localStorage.setItem('token', token)
    setToken(token)
    setCurrentUser(user)
    return user
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout/')
    } catch {}
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