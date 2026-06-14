// Admin Dashboard — ShiftSync
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const SHIFT_COLOR = {
  MORNING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Morning' },
  EVENING: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Evening' },
  NIGHT: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400', label: 'Night' },
}

function StatCard({ value, label, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl p-6 flex flex-col gap-1 shadow-sm border border-gray-100">
      <span className={`text-4xl font-bold tracking-tight ${accent}`}>{value}</span>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      {sub && <span className="text-xs text-gray-400 mt-1">{sub}</span>}
    </div>
  )
}

function ShiftBadge({ type }) {
  const s = SHIFT_COLOR[type] || SHIFT_COLOR.MORNING
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [pendingRequests, setPendingRequests] = useState([])
  const [employees, setEmployees] = useState([])
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    Promise.all([
      api.get('/timeoff/').catch(() => ({ data: [] })),
      api.get('/employees/').catch(() => ({ data: [] })),
    ]).then(([timeoffRes, empRes]) => {
      setPendingRequests((timeoffRes.data || []).filter(r => r.status === 'PENDING'))
      setEmployees((empRes.data || []).filter(e => !e.is_deleted && e.is_active))
    }).finally(() => setLoading(false))
  }, [])

  const greeting = () => {
    const h = time.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const formatTime = (d) => d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (d) => d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })

  const navItems = [
    { label: 'Schedule', icon: '📅', path: '/admin/schedule' },
    { label: 'Employees', icon: '👥', path: '/admin/employees' },
    { label: 'Time Off', icon: '🌴', path: '/admin/time-off' },
    { label: 'Shifts', icon: '⚙️', path: '/admin/shifts' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col py-8 px-4 fixed h-full">
        <div className="mb-10 px-2">
          <span className="text-xl font-bold tracking-tight text-gray-900">Shift<span className="text-blue-600">Sync</span></span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="px-3 mb-3">
            <p className="text-xs font-semibold text-gray-900 truncate">{currentUser?.full_name}</p>
            <p className="text-xs text-gray-400 capitalize">{currentUser?.role?.toLowerCase()}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors text-left"
          >
            <span>→</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">{formatDate(time)}</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting()}, {currentUser?.first_name} 👋
            </h1>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{formatTime(time)}</p>
            <p className="text-xs text-gray-400">Halifax time</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard
                value={employees.length}
                label="Active Employees"
                sub="Excluding deactivated"
                accent="text-gray-900"
              />
              <StatCard
                value={pendingRequests.length}
                label="Pending Time-Off"
                sub={pendingRequests.length > 0 ? "Needs your review" : "All clear"}
                accent={pendingRequests.length > 0 ? "text-amber-500" : "text-green-500"}
              />
              <StatCard
                value={schedule ? schedule.status : "—"}
                label="Schedule Status"
                sub={schedule ? `From ${schedule.week_start_date}` : "No schedule yet"}
                accent="text-blue-600"
              />
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/admin/schedule')}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-5 text-left transition-colors"
                >
                  <p className="text-lg mb-1">📅</p>
                  <p className="font-semibold text-sm">View Schedule</p>
                  <p className="text-xs text-blue-200 mt-0.5">See the current 2-week schedule</p>
                </button>
                <button
                  onClick={() => navigate('/admin/time-off')}
                  className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-5 text-left transition-colors relative shadow-sm"
                >
                  {pendingRequests.length > 0 && (
                    <span className="absolute top-4 right-4 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                  <p className="text-lg mb-1">🌴</p>
                  <p className="font-semibold text-sm text-gray-800">Time-Off Requests</p>
                  <p className="text-xs text-gray-400 mt-0.5">Review pending requests</p>
                </button>
                <button
                  onClick={() => navigate('/admin/employees')}
                  className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-5 text-left transition-colors shadow-sm"
                >
                  <p className="text-lg mb-1">👥</p>
                  <p className="font-semibold text-sm text-gray-800">Manage Employees</p>
                  <p className="text-xs text-gray-400 mt-0.5">Add, edit, or remove staff</p>
                </button>
                <button
                  onClick={() => navigate('/admin/shifts')}
                  className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-5 text-left transition-colors shadow-sm"
                >
                  <p className="text-lg mb-1">⚙️</p>
                  <p className="font-semibold text-sm text-gray-800">Shift Settings</p>
                  <p className="text-xs text-gray-400 mt-0.5">Manage shift types & eligibility</p>
                </button>
              </div>
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Needs Review</h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                  {pendingRequests.slice(0, 5).map(req => (
                    <div key={req.id} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{req.employee_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(req.date).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}
                          {req.reason && ` · ${req.reason}`}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/admin/time-off')}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Review →
                      </button>
                    </div>
                  ))}
                  {pendingRequests.length > 5 && (
                    <div className="px-5 py-3 text-center">
                      <button onClick={() => navigate('/admin/time-off')} className="text-xs text-blue-600 hover:underline">
                        View all {pendingRequests.length} requests →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pendingRequests.length === 0 && (
              <div className="bg-green-50 border border-green-100 rounded-2xl px-6 py-5 flex items-center gap-4">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">All caught up</p>
                  <p className="text-xs text-green-600">No pending time-off requests right now.</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}