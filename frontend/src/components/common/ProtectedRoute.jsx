// =============================================================================
// ProtectedRoute — Redirects unauthenticated users to /login
// roles: array of allowed roles e.g. ['MANAGER', 'OWNER']
// =============================================================================

import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function ProtectedRoute({ children, roles = [] }) {
  const { currentUser, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  if (!currentUser) return <Navigate to="/login" replace />

  if (roles.length > 0 && !roles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
