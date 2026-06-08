// =============================================================================
// Register Page
// =============================================================================
// Accessed via invite link: /register?token=xxxx
// Employee sets username + password only.
// Owner/manager settings are pre-configured by owner/manager before invite was sent.
// TODO: Implement form that reads token from URL, calls auth.register()
// =============================================================================

import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

function Register() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    // TODO: POST /api/auth/register/ with { token, username, password }
    // On success: redirect to /login
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Invalid or missing invite link.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2 text-center">Welcome to ShiftSync</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Set your username and password to get started.</p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  )
}

export default Register
