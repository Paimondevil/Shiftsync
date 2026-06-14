// Employee Dashboard
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function EmployeeDashboard() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-gray-900">
          Shift<span className="text-blue-600">Sync</span>
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{currentUser?.full_name}</span>
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto pt-20 px-6">
        <div className="mb-10 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Welcome back</p>
          <h1 className="text-3xl font-bold text-gray-900">{currentUser?.first_name} 👋</h1>
          <p className="text-sm text-gray-400 mt-2">What would you like to do today?</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* View Schedule */}
          <button
            onClick={() => navigate('/my-schedule')}
            className="bg-blue-600 hover:bg-blue-700 transition-colors rounded-2xl p-6 text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl mb-2">📅</p>
                <p className="text-lg font-bold text-white">View Schedule</p>
                <p className="text-sm text-blue-200 mt-1">See your shifts for the next 2 weeks</p>
              </div>
              <span className="text-white/40 text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          {/* Request Day Off */}
          <button
            onClick={() => navigate('/time-off')}
            className="bg-white hover:bg-gray-50 border border-gray-100 shadow-sm transition-colors rounded-2xl p-6 text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl mb-2">🌴</p>
                <p className="text-lg font-bold text-gray-800">Request Day Off</p>
                <p className="text-sm text-gray-400 mt-1">Submit a request and see others' time off</p>
              </div>
              <span className="text-gray-300 text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}